import re
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from db import AsyncSessionLocal
from models.content_market import ConteMercatRead
from services.content_market_service import ConteMercatService
from services.supabase_storage_service import SupabaseService

LANGUAGE_PATTERN = r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$"
LANGUAGE_RE = re.compile(LANGUAGE_PATTERN)


def _normalize_language(language: str) -> str:
    normalized = language.strip().replace("_", "-")
    if len(normalized) > 35 or not LANGUAGE_RE.fullmatch(normalized):
        raise HTTPException(status_code=422, detail="Invalid language tag")
    return normalized.lower()


def _get_translation_service():
    # Keep market endpoints usable when optional AI configuration is absent.
    from services.ai_dependencies import translation_service

    return translation_service


router = APIRouter(
    prefix="/conte_mercat",
    tags=["Conte Mercat"],
)


async def get_conte_mercat_service():
    async with AsyncSessionLocal() as session:
        yield ConteMercatService(session=session)


@router.get(
    "",
    response_model=list[ConteMercatRead],
)
async def get_conte_mercat(
    offset: int = 0,
    limit: int = 10,
    language: Annotated[
        str, Query(min_length=2, max_length=35, pattern=LANGUAGE_PATTERN)
    ] = "ca",
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    products = await service.list_conte_mercat(
        offset=offset,
        limit=limit,
    )
    return await _translate_products(products, language)


async def _translate_products(products, language: str):
    """Translate market-facing names for this response without changing stored rows."""
    normalized_language = _normalize_language(language)
    if normalized_language.split("-")[0] == "ca" or not products:
        return products

    content = [{"product": item.product} for item in products]
    try:
        translated = await _get_translation_service().translate(
            content, normalized_language, source_language="ca"
        )
        if (
            not isinstance(translated, list)
            or len(translated) != len(products)
            or any(
                not isinstance(item, dict)
                or not isinstance(item.get("product"), str)
                or not item["product"].strip()
                for item in translated
            )
        ):
            raise ValueError("Translation returned an invalid market product list")
    except Exception:
        return products

    localized = []
    for item, translation in zip(products, translated, strict=True):
        result = ConteMercatRead.model_validate(item).model_dump()
        result["product"] = translation["product"]
        localized.append(result)
    return localized


async def _translate_search_term(product: str, language: str) -> str:
    """Convert a localized search term to the Catalan source used in storage."""
    normalized_language = _normalize_language(language)
    if normalized_language.split("-")[0] == "ca":
        return product
    try:
        translated = await _get_translation_service().translate(
            {"query": product}, "ca", source_language=normalized_language
        )
        query = translated.get("query") if isinstance(translated, dict) else None
        return query.strip() if isinstance(query, str) and query.strip() else product
    except Exception:
        return product


@router.get("/count")
async def count_content_market(
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    total = await service.count_content_market()

    return {"total": total}


@router.get(
    "/search",
    response_model=list[ConteMercatRead],
)
async def search_conte_mercat(
    product: Annotated[str, Query(min_length=1, max_length=120)],
    language: Annotated[
        str, Query(min_length=2, max_length=35, pattern=LANGUAGE_PATTERN)
    ] = "ca",
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    source_query = await _translate_search_term(product, language)
    products = await service.get_conte_mercat_by_product(source_query)
    return await _translate_products(products, language)


@router.get(
    "/{conte_mercat_id}",
    response_model=ConteMercatRead,
)
async def get_conte_mercat_by_id(
    conte_mercat_id: UUID,
    language: Annotated[
        str, Query(min_length=2, max_length=35, pattern=LANGUAGE_PATTERN)
    ] = "ca",
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    conte_mercat = await service.get_conte_mercat_by_id(conte_mercat_id)

    if conte_mercat is None:
        raise HTTPException(
            status_code=404,
            detail="Conte mercat not found",
        )

    translated = await _translate_products([conte_mercat], language)
    return translated[0]


@router.post(
    "",
    response_model=ConteMercatRead,
    status_code=201,
)
async def create_conte_mercat(
    product: str = Form(...),
    tecnical_name: str | None = Form(None),
    price: float = Form(...),
    price_per_kg: float | None = Form(None),
    left_units: int = Form(0),
    image: UploadFile | None = File(None),
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    # 1. Crear el producte a la base de dades
    conte_mercat = await service.create_conte_mercat(
        product=product,
        tecnical_name=tecnical_name,
        price=price,
        price_per_kg=price_per_kg,
        left_units=left_units,
    )

    # 2. Si s'ha enviat una imatge, pujar-la a Supabase
    if image is not None:
        storage = SupabaseService()

        try:
            path = await storage.upload_product_image(
                file=image,
                product_id=conte_mercat.id,
            )
            # 3. Guardar la URL pública del fitxer
            conte_mercat.image_url = storage.get_product_image_url(path)
            # Cal persistir el canvi a la base de dades
            await service._db.commit()
            await service._db.refresh(conte_mercat)

        except Exception as exc:
            await service._db.rollback()

            raise HTTPException(
                status_code=500,
                detail="Error en pujar o guardar la imatge del producte",
            ) from exc

    return conte_mercat
