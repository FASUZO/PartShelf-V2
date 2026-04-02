from sqlalchemy.orm import Session
from app.models.manufacturer import Manufacturer


def get_manufacturer_by_name(db: Session, name: str):
    db_manufacturer = db.query(Manufacturer).filter(Manufacturer.name==name).first()
    return db_manufacturer

def get_all_manufacturers(db: Session):
    return db.query(Manufacturer).order_by(Manufacturer.name).all()

def create_manufacturer(db: Session, name: str):
    db_manufacturer = Manufacturer(name=name)
    db.add(db_manufacturer)
    db.commit()
    db.refresh(db_manufacturer)
    return db_manufacturer