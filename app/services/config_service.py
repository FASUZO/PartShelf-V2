from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.config import Category, Subcategory, ParamTemplate, LocationPrefix
from app.schemas.config import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    ConfigBundle,
    LocationPrefixCreate,
    LocationPrefixOut,
    ParamTemplateCreate,
    ParamTemplateOut,
    ParamTemplateUpdate,
    SubcategoryCreate,
    SubcategoryOut,
    SubcategoryUpdate,
)


def get_config_bundle(db: Session) -> ConfigBundle:
    categories = db.query(Category).order_by(Category.id.asc()).all()
    subcategories = db.query(Subcategory).order_by(Subcategory.id.asc()).all()
    param_templates = db.query(ParamTemplate).order_by(ParamTemplate.id.asc()).all()
    location_prefixes = db.query(LocationPrefix).order_by(LocationPrefix.id.asc()).all()

    return ConfigBundle(
        categories=[CategoryOut.model_validate(c) for c in categories],
        subcategories=[SubcategoryOut.model_validate(s) for s in subcategories],
        param_templates=[ParamTemplateOut.model_validate(t) for t in param_templates],
        location_prefixes=[LocationPrefixOut.model_validate(p) for p in location_prefixes],
    )


# ==================== Category CRUD ====================

def create_category(db: Session, payload: CategoryCreate) -> CategoryOut:
    row = Category(key=payload.key, name=payload.name, location_prefix=payload.location_prefix)
    db.add(row)
    db.commit()
    db.refresh(row)
    return CategoryOut.model_validate(row)


def update_category(db: Session, category_id: int, payload: CategoryUpdate) -> CategoryOut:
    row = db.query(Category).filter(Category.id == category_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    if payload.key is not None:
        row.key = payload.key
    if payload.name is not None:
        row.name = payload.name
    if payload.location_prefix is not None:
        row.location_prefix = payload.location_prefix
    db.commit()
    db.refresh(row)
    return CategoryOut.model_validate(row)


def delete_category(db: Session, category_id: int):
    row = db.query(Category).filter(Category.id == category_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    # 级联删除关联的子类别和参数模板
    db.query(Subcategory).filter(Subcategory.category_id == category_id).delete()
    db.query(ParamTemplate).filter(ParamTemplate.category_id == category_id).delete()
    db.delete(row)
    db.commit()


# ==================== Subcategory CRUD ====================

def create_subcategory(db: Session, payload: SubcategoryCreate) -> SubcategoryOut:
    row = Subcategory(category_id=payload.category_id, name=payload.name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return SubcategoryOut.model_validate(row)


def update_subcategory(db: Session, subcategory_id: int, payload: SubcategoryUpdate) -> SubcategoryOut:
    row = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcategory not found")
    if payload.name is not None:
        row.name = payload.name
    if payload.category_id is not None:
        row.category_id = payload.category_id
    db.commit()
    db.refresh(row)
    return SubcategoryOut.model_validate(row)


def delete_subcategory(db: Session, subcategory_id: int):
    row = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcategory not found")
    # 解除参数模板对这个子类别的引用
    db.query(ParamTemplate).filter(ParamTemplate.subcategory_id == subcategory_id).update({"subcategory_id": None})
    db.delete(row)
    db.commit()


# ==================== ParamTemplate CRUD ====================

def create_param_template(db: Session, payload: ParamTemplateCreate) -> ParamTemplateOut:
    row = ParamTemplate(
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        name=payload.name,
        definition_json=payload.definition_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ParamTemplateOut.model_validate(row)


def update_param_template(db: Session, template_id: int, payload: ParamTemplateUpdate) -> ParamTemplateOut:
    row = db.query(ParamTemplate).filter(ParamTemplate.id == template_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ParamTemplate not found")
    if payload.name is not None:
        row.name = payload.name
    if payload.category_id is not None:
        row.category_id = payload.category_id
    if payload.subcategory_id is not None:
        row.subcategory_id = payload.subcategory_id
    if payload.definition_json is not None:
        row.definition_json = payload.definition_json
    db.commit()
    db.refresh(row)
    return ParamTemplateOut.model_validate(row)


def delete_param_template(db: Session, template_id: int):
    row = db.query(ParamTemplate).filter(ParamTemplate.id == template_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ParamTemplate not found")
    db.delete(row)
    db.commit()


# ==================== LocationPrefix CRUD ====================

def create_location_prefix(db: Session, payload: LocationPrefixCreate) -> LocationPrefixOut:
    row = LocationPrefix(
        category_id=payload.category_id,
        prefix=payload.prefix,
        next_seq=max(1, payload.next_seq),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return LocationPrefixOut.model_validate(row)
