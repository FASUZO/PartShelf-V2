from pydantic import BaseModel

class PartToInventoryAdd(BaseModel):
    name: str
    manufacturer: str
    part_type: str
    package: str
    quantity: int
    description: str | None = None
    price: float | None = None  # 单价
    lc_number: str | None = None  # LC编号
    other: str | None = None  # 其他信息

class PartInventoryQuantityUpdate(BaseModel):
    part_id: int
    quantity: int
    operation_mode: str = "set"  # 操作模式: "add"(增加), "subtract"(减少), "set"(直接设置)

class PartInventoryQuantity(BaseModel):
    updatedQuantity: int

class PartInventoryFlatGet(BaseModel):
    id: int
    name: str
    manufacturer: str
    part_type: str
    package: str
    quantity: int
    description: str | None = None
    price: float | None = None  # 单价
    lc_number: str | None = None  # LC编号
    other: str | None = None  # 其他信息

class PartDetailsFlatGet(BaseModel):
    id: int
    name: str
    manufacturer: str | None = None
    part_type: str | None = None
    package: str | None = None
    quantity: int | None = None
    description: str | None = None
    price: float | None = None
    lc_number: str | None = None
    other: str | None = None

class PartInventoryFilter(BaseModel):
    search_key: str | None = None
    manufacturer: str | None = None
    package: str | None = None
    part_type: str | None = None
    page: int | None = 1
    page_size: int | None = 100