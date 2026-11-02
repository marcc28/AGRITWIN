import os
from io import BytesIO
from unittest.mock import MagicMock
from uuid import UUID

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

# El mòdul llegeix aquestes variables quan s'importa.
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "test-secret-key")

import services.supabase_storage_service as storage_module
from services.supabase_storage_service import SupabaseService


@pytest.fixture
def storage(monkeypatch):
    mock_client = MagicMock()
    mock_bucket = MagicMock()

    mock_client.storage.from_.return_value = mock_bucket

    monkeypatch.setattr(
        storage_module,
        "create_client",
        MagicMock(return_value=mock_client),
    )

    service = SupabaseService()
    return service, mock_client, mock_bucket


def create_upload_file(
    content=b"fake-image-content",
    filename="tomata.png",
    content_type="image/png",
):
    return UploadFile(
        filename=filename,
        file=BytesIO(content),
        headers=Headers({"content-type": content_type}),
    )


@pytest.mark.asyncio
async def test_upload_product_image_success(storage, monkeypatch):
    service, mock_client, mock_bucket = storage

    product_id = UUID("11111111-1111-1111-1111-111111111111")
    image_uuid = UUID("22222222-2222-2222-2222-222222222222")

    monkeypatch.setattr(
        storage_module.uuid,
        "uuid4",
        lambda: image_uuid,
    )

    image = create_upload_file(
        content=b"png-content",
        filename="tomata.png",
        content_type="image/png",
    )

    path = await service.upload_product_image(image, product_id)

    assert path == f"{product_id}/{image_uuid}.png"

    mock_client.storage.from_.assert_called_once_with("conte-mercat")
    mock_bucket.upload.assert_called_once_with(
        path=path,
        file=b"png-content",
        file_options={
            "content-type": "image/png",
            "upsert": "false",
        },
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("content_type", "extension"),
    [
        ("image/jpeg", ".jpg"),
        ("image/png", ".png"),
        ("image/webp", ".webp"),
    ],
)
async def test_upload_product_image_allowed_formats(
    storage,
    monkeypatch,
    content_type,
    extension,
):
    service, _, mock_bucket = storage

    product_id = UUID("11111111-1111-1111-1111-111111111111")
    image_uuid = UUID("22222222-2222-2222-2222-222222222222")

    monkeypatch.setattr(
        storage_module.uuid,
        "uuid4",
        lambda: image_uuid,
    )

    image = create_upload_file(
        content=b"image-content",
        filename=f"product{extension}",
        content_type=content_type,
    )

    path = await service.upload_product_image(image, product_id)

    assert path.endswith(extension)
    mock_bucket.upload.assert_called_once()


@pytest.mark.asyncio
async def test_upload_product_image_invalid_format(storage):
    service, _, mock_bucket = storage

    image = create_upload_file(
        content=b"not-an-image",
        filename="document.pdf",
        content_type="application/pdf",
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.upload_product_image(
            image,
            UUID("11111111-1111-1111-1111-111111111111"),
        )

    assert exc_info.value.status_code == 415
    assert exc_info.value.detail == "Format d'imatge no permès"
    mock_bucket.upload.assert_not_called()


@pytest.mark.asyncio
async def test_upload_product_image_empty_file(storage):
    service, _, mock_bucket = storage

    image = create_upload_file(
        content=b"",
        filename="empty.png",
        content_type="image/png",
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.upload_product_image(
            image,
            UUID("11111111-1111-1111-1111-111111111111"),
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "El fitxer és buit"
    mock_bucket.upload.assert_not_called()


def test_get_product_image_url(storage):
    service, mock_client, mock_bucket = storage

    mock_bucket.get_public_url.return_value = (
        "https://example.supabase.co/storage/v1/object/public/conte-mercat/product/image.png"
    )

    url = service.get_product_image_url("product/image.png")

    assert url == (
        "https://example.supabase.co/storage/v1/object/public/conte-mercat/product/image.png"
    )

    mock_client.storage.from_.assert_called_once_with("conte-mercat")
    mock_bucket.get_public_url.assert_called_once_with("product/image.png")


def test_supabase_service_init(monkeypatch):
    mock_client = MagicMock()

    create_client_mock = MagicMock(return_value=mock_client)
    monkeypatch.setattr(
        storage_module,
        "create_client",
        create_client_mock,
    )

    service = SupabaseService()

    assert service.supabase is mock_client
    create_client_mock.assert_called_once_with(
        storage_module.SUPABASE_URL,
        storage_module.SUPABASE_KEY,
    )


@pytest.mark.asyncio
async def test_upload_image(storage):
    service, mock_client, mock_bucket = storage

    user_id = UUID("11111111-1111-1111-1111-111111111111")
    image = create_upload_file(
        content=b"profile-image",
        filename="profile.png",
        content_type="image/png",
    )

    path = await service.upload_image(image, user_id)

    assert path == f"{user_id}.png"

    mock_client.storage.from_.assert_called_once_with("profile_images")
    mock_bucket.upload.assert_called_once_with(
        path=path,
        file=b"profile-image",
        file_options={"content-type": "image/png"},
    )


@pytest.mark.asyncio
async def test_upload_image_without_extension(storage):
    service, _, mock_bucket = storage

    user_id = UUID("11111111-1111-1111-1111-111111111111")
    image = create_upload_file(
        content=b"profile-image",
        filename="profile",
        content_type="image/jpeg",
    )

    path = await service.upload_image(image, user_id)

    assert path == f"{user_id}.jpg"
    mock_bucket.upload.assert_called_once()


@pytest.mark.asyncio
async def test_delete_image(storage):
    service, mock_client, mock_bucket = storage

    await service.delete_image("user/profile.jpg")

    mock_client.storage.from_.assert_called_once_with("profile_images")
    mock_bucket.remove.assert_called_once_with(["user/profile.jpg"])


@pytest.mark.asyncio
async def test_delete_product_image(storage):
    service, mock_client, mock_bucket = storage

    await service.delete_product_image("product/image.png")

    mock_client.storage.from_.assert_called_once_with("conte-mercat")
    mock_bucket.remove.assert_called_once_with(["product/image.png"])


@pytest.mark.asyncio
async def test_delete_anunce_image(storage):
    service, mock_client, mock_bucket = storage

    await service.delete_anunce_image("anunce/image.png")

    mock_client.storage.from_.assert_called_once_with("anunces")
    mock_bucket.remove.assert_called_once_with(["anunce/image.png"])


def test_get_anunce_image_url(storage):
    service, mock_client, mock_bucket = storage

    expected_url = "https://example.supabase.co/storage/v1/object/public/anunces/anunce/image.png"
    mock_bucket.get_public_url.return_value = expected_url

    url = service.get_anunce_image_url("anunce/image.png")

    assert url == expected_url
    mock_client.storage.from_.assert_called_once_with("anunces")
    mock_bucket.get_public_url.assert_called_once_with("anunce/image.png")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("content_type", "extension"),
    [
        ("image/jpeg", ".jpg"),
        ("image/png", ".png"),
        ("image/webp", ".webp"),
    ],
)
async def test_upload_anunce_image_success(
    storage,
    monkeypatch,
    content_type,
    extension,
):
    service, mock_client, mock_bucket = storage

    anunce_id = UUID("11111111-1111-1111-1111-111111111111")
    image_uuid = UUID("22222222-2222-2222-2222-222222222222")

    monkeypatch.setattr(
        storage_module.uuid,
        "uuid4",
        lambda: image_uuid,
    )

    image = create_upload_file(
        content=b"anunce-image",
        filename=f"anunce{extension}",
        content_type=content_type,
    )

    path = await service.upload_anunce_image(image, anunce_id)

    assert path == f"{anunce_id}/{image_uuid}{extension}"

    mock_client.storage.from_.assert_called_once_with("anunces")
    mock_bucket.upload.assert_called_once_with(
        path=path,
        file=b"anunce-image",
        file_options={
            "content-type": content_type,
            "upsert": "false",
        },
    )


@pytest.mark.asyncio
async def test_upload_anunce_image_invalid_format(storage):
    service, _, mock_bucket = storage

    image = create_upload_file(
        content=b"document",
        filename="document.pdf",
        content_type="application/pdf",
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.upload_anunce_image(
            image,
            UUID("11111111-1111-1111-1111-111111111111"),
        )

    assert exc_info.value.status_code == 415
    assert exc_info.value.detail == "Format d'imatge no permès"
    mock_bucket.upload.assert_not_called()


@pytest.mark.asyncio
async def test_upload_anunce_image_empty_file(storage):
    service, _, mock_bucket = storage

    image = create_upload_file(
        content=b"",
        filename="empty.png",
        content_type="image/png",
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.upload_anunce_image(
            image,
            UUID("11111111-1111-1111-1111-111111111111"),
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "El fitxer és buit"
    mock_bucket.upload.assert_not_called()
