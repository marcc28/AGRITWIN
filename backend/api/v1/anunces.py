from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from db import AsyncSessionLocal
from models.anunce import AnunceRead
from services.anunce_service import AnunceService
from services.supabase_storage_service import SupabaseService

router = APIRouter(
    prefix="/anunces",
    tags=["Anunces"],
)


async def get_anunce_service():
    async with AsyncSessionLocal() as session:
        yield AnunceService(session=session)


@router.get(
    "",
    response_model=list[AnunceRead],
)
async def list_anunces(
    offset: int = 0,
    limit: int = 10,
    service: AnunceService = Depends(get_anunce_service),
):
    return await service.list_anunces(
        offset=offset,
        limit=limit,
    )


@router.get(
    "/search",
    response_model=list[AnunceRead],
)
async def search_anunces(
    title: str,
    service: AnunceService = Depends(get_anunce_service),
):
    return await service.get_anunces_by_title(title)


@router.get(
    "/{id}",
    response_model=AnunceRead,
)
async def get_anunce(
    id: UUID,
    service: AnunceService = Depends(get_anunce_service),
):
    anunce = await service.get_anunce_by_id(id)

    if anunce is None:
        raise HTTPException(
            status_code=404,
            detail="Anunce not found",
        )

    return anunce

@router.post(
    "",
    response_model=AnunceRead,
    status_code=201,
)
async def create_anunce(
    title: str = Form(...),
    subtile: str | None = Form(None),
    agent: str | None = Form(None),
    content: str | None = Form(None),
    image: UploadFile | None = File(None),
    service: AnunceService = Depends(get_anunce_service),
):
    # 1. Crear l'anunci a la base de dades
    anunce = await service.create_anunce(
        title=title,
        subtile=subtile,
        agent=agent,
        content=content,
    )

    # 2. Si s'ha enviat una imatge, pujar-la a Supabase
    if image is not None:
        storage = SupabaseService()

        try:
            path = await storage.upload_anunce_image(
                file=image,
                anunce_id=anunce.id,
            )

            # 3. Obtenir la URL pública
            image_url = storage.get_anunce_image_url(path)

            # 4. Guardar la URL a la base de dades
            anunce = await service.update_image_url(
                anunce_id=anunce.id,
                image_url=image_url,
            )

        except Exception as exc:
            await service._db.rollback()

            raise HTTPException(
                status_code=500,
                detail="Error en pujar o guardar la imatge de l'anunci",
            ) from exc

    return anunce


@router.delete(
    "/{id}",
    status_code=204,
)
async def delete_anunce(
    id: UUID,
    service: AnunceService = Depends(get_anunce_service),
):
    await service.delete_anunce(id)