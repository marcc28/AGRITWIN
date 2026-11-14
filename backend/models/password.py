
from pydantic import BaseModel, EmailStr


class ForgetPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    secret_token: str
    new_password: str
    confirm_password: str


class SuccessMessage(BaseModel):
    success: bool
    status_code: int
    message: str
