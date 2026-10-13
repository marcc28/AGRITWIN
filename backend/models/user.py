from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    password_conf: str
    privacy_terms_accepted: bool
    security_terms_accepted: bool


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    email: EmailStr
