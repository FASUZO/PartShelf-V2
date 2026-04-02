from pydantic import BaseModel
from typing import Optional

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int

    class Config:
        orm_mode = True
