from pydantic import BaseModel
from typing import List, Optional


class CategoryOut(BaseModel):
    id: int
    key: str
    name: str
    location_prefix: Optional[str] = None
    sort_order: int = 0

    class Config:
        from_attributes = True


class SubcategoryOut(BaseModel):
    id: int
    category_id: int
    name: str
    letter: Optional[str] = None

    class Config:
        from_attributes = True


class ParamTemplateOut(BaseModel):
    id: int
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    name: str
    definition_json: str

    class Config:
        from_attributes = True


class LocationPrefixOut(BaseModel):
    id: int
    category_id: Optional[int] = None
    prefix: str
    next_seq: int

    class Config:
        from_attributes = True


class ConfigBundle(BaseModel):
    categories: List[CategoryOut]
    subcategories: List[SubcategoryOut]
    param_templates: List[ParamTemplateOut]
    location_prefixes: List[LocationPrefixOut]


# --- Create Schemas ---

class CategoryCreate(BaseModel):
    key: str
    name: str
    location_prefix: Optional[str] = None


class SubcategoryCreate(BaseModel):
    category_id: int
    name: str


class ParamTemplateCreate(BaseModel):
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    name: str
    definition_json: str = "{}"


class LocationPrefixCreate(BaseModel):
    category_id: Optional[int] = None
    prefix: str
    next_seq: int = 1


# --- Update Schemas ---

class CategoryUpdate(BaseModel):
    key: Optional[str] = None
    name: Optional[str] = None
    location_prefix: Optional[str] = None


class SubcategoryUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None


class ParamTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    definition_json: Optional[str] = None
