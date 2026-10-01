import os
import uuid

from fastapi import UploadFile
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SERVICE_ROLE_KEY = os.environ.get("SERVICE_ROLE_KEY")
SUPABASE_OTHER = os.environ.get("SUPABASE_OTHER")


class SupabaseService:
    def __init__(self):
        self.supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

    async def upload_image(self, file: UploadFile, user_id: uuid.UUID) -> str:
        file_bytes = await file.read()
        extension = os.path.splitext(file.filename or "")[1] or ".jpg"
        filename = f"{user_id}{extension}"

        self.supabase.storage.from_("profile_images").upload(
            path=filename, file=file_bytes, file_options={"content-type": file.content_type}
        )

        return f"{filename}"

    async def delete_image(self, filename: str):
        self.supabase.storage.from_("profile_images").remove([filename])
