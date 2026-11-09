from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from db import AsyncSessionLocal
from models.content_market import ConteMercatRead
from services.content_market_service import ConteMercatService
from services.supabase_storage_service import SupabaseService

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
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    return await service.list_conte_mercat(
        offset=offset,
        limit=limit,
    )


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
    product: str,
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    return await service.get_conte_mercat_by_product(product)


@router.get(
    "/{conte_mercat_id}",
    response_model=ConteMercatRead,
)
async def get_conte_mercat_by_id(
    conte_mercat_id: UUID,
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    conte_mercat = await service.get_conte_mercat_by_id(conte_mercat_id)

    if conte_mercat is None:
        raise HTTPException(
            status_code=404,
            detail="Conte mercat not found",
        )

    return conte_mercat


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
