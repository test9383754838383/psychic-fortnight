import uuid
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, model_validator
from src.modules.auth.models.user import User


class LoginDTO(BaseModel):
    username: str
    password: str


class UserCreateDTO(BaseModel):
    username: str
    password: str
    role_names: List[str]


class UserUpdateDTO(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponseDTO(BaseModel):
    id: uuid.UUID
    username: str
    is_active: bool
    roles: List[str]

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_roles(cls, data: Any) -> Any:
        if isinstance(data, User):
            # Extract role names from user_roles relationship
            roles = [ur.role.name for ur in data.user_roles if ur.role]
            return {
                "id": data.id,
                "username": data.username,
                "is_active": data.is_active,
                "roles": roles,
            }
        return data
