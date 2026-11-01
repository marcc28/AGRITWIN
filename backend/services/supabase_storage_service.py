import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SECRET_KEY"]


class SupabaseService:
    def __init__(self):
        self.supabase = create_client(
            SUPABASE_URL,
            SUPABASE_KEY,
        )

    async def upload_image(
        self,
        file: UploadFile,
        user_id: uuid.UUID,
    ) -> str:
        # Mètode existent per a les imatges de perfil
        file_bytes = await file.read()
        extension = Path(file.filename or "").suffix or ".jpg"
        filename = f"{user_id}{extension}"

        self.supabase.storage.from_("profile_images").upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )

        return filename

    async def delete_image(self, filename: str):
        self.supabase.storage.from_("profile_images").remove(
            [filename]
        )

    async def upload_product_image(
        self,
        file: UploadFile,
        product_id: uuid.UUID,
    ) -> str:
        allowed_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }

        extension = allowed_types.get(file.content_type)

        if extension is None:
            raise HTTPException(
                status_code=415,
                detail="Format d'imatge no permès",
            )

        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="El fitxer és buit",
            )
        
        # Ruta única per a cada imatge
        path = f"{product_id}/{uuid.uuid4()}{extension}"

        self.supabase.storage.from_("conte-mercat").upload(
            path=path,
            file=content,
            file_options={
                "content-type": file.content_type,
                "upsert": "false",
            },
        )

        return path

    async def delete_product_image(self, path: str):
        self.supabase.storage.from_("conte-mercat").remove(
            [path]
        )

    def get_product_image_url(self, path: str) -> str:
        return (
            self.supabase.storage
            .from_("conte-mercat")
            .get_public_url(path)
        )
    async def upload_anunce_image(
        self,
        file: UploadFile,
        anunce_id: uuid.UUID,
    ) -> str:
        allowed_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }

        extension = allowed_types.get(file.content_type)

        if extension is None:
            raise HTTPException(
                status_code=415,
                detail="Format d'imatge no permès",
            )

        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="El fitxer és buit",
            )

        path = f"{anunce_id}/{uuid.uuid4()}{extension}"

        self.supabase.storage.from_("anunces").upload(
            path=path,
            file=content,
            file_options={
                "content-type": file.content_type,
                "upsert": "false",
            },
        )

        return path

    async def delete_anunce_image(self, path: str):
        self.supabase.storage.from_("anunces").remove(
            [path]
        )

    def get_anunce_image_url(self, path: str) -> str:
        return (
            self.supabase.storage
            .from_("anunces")
            .get_public_url(path)
        )
    