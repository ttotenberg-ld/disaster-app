from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class UserLogin(UserBase):
    password: str


class UserUpdate(BaseModel):
    fullName: Optional[str] = None
    username: Optional[str] = None
    website: Optional[str] = None


class User(UserBase):
    id: str
    fullName: Optional[str] = None
    username: Optional[str] = None
    website: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str 