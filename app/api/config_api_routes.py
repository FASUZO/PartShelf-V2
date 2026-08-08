from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from db.database import get_db
from app.models.config import SystemConfig
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
from app.services.config_service import (
    create_category,
    create_location_prefix,
    create_param_template,
    create_subcategory,
    delete_category,
    delete_param_template,
    delete_subcategory,
    get_config_bundle,
    move_category as move_category_service,
    update_category,
    update_param_template,
    update_subcategory,
)
from app.api.deps import get_current_user_required

router = APIRouter()


@router.get("/bundle", response_model=ConfigBundle)
def get_bundle(db: Session = Depends(get_db)):
    return get_config_bundle(db)


# ==================== Category ====================

@router.post("/categories", response_model=CategoryOut)
def add_category(payload: CategoryCreate, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    return create_category(db, payload)


@router.put("/categories/{category_id}", response_model=CategoryOut)
def edit_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    return update_category(db, category_id, payload)


@router.delete("/categories/{category_id}")
def remove_category(category_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    delete_category(db, category_id)
    return {"message": "Category deleted"}


@router.post("/categories/{category_id}/move")
def move_category(category_id: int, direction: str = Query(..., pattern="^(up|down)$"), db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    """移动类别排序位置：direction=up(上移) 或 down(下移)"""
    return move_category_service(db, category_id, direction)


# ==================== Subcategory ====================

@router.post("/subcategories", response_model=SubcategoryOut)
def add_subcategory(payload: SubcategoryCreate, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    return create_subcategory(db, payload)


@router.put("/subcategories/{subcategory_id}", response_model=SubcategoryOut)
def edit_subcategory(subcategory_id: int, payload: SubcategoryUpdate, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    return update_subcategory(db, subcategory_id, payload)


@router.delete("/subcategories/{subcategory_id}")
def remove_subcategory(subcategory_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    delete_subcategory(db, subcategory_id)
    return {"message": "Subcategory deleted"}


# ==================== ParamTemplate ====================

@router.post("/param_templates", response_model=ParamTemplateOut)
def add_param_template(payload: ParamTemplateCreate, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    return create_param_template(db, payload)


@router.put("/param_templates/{template_id}", response_model=ParamTemplateOut)
def edit_param_template(template_id: int, payload: ParamTemplateUpdate, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    return update_param_template(db, template_id, payload)


@router.delete("/param_templates/{template_id}")
def remove_param_template(template_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    delete_param_template(db, template_id)
    return {"message": "ParamTemplate deleted"}


# ==================== LocationPrefix ====================

@router.post("/location_prefixes", response_model=LocationPrefixOut)
def add_location_prefix(payload: LocationPrefixCreate, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    return create_location_prefix(db, payload)


# ==================== MQTT 配置 ====================

MQTT_KEYS = ["mqtt_enabled", "mqtt_broker", "mqtt_port", "mqtt_username", "mqtt_password", "mqtt_topic_prefix"]

MQTT_DEFAULTS = {
    "mqtt_enabled": "false",
    "mqtt_broker": "mosquitto",
    "mqtt_port": "1883",
    "mqtt_username": "",
    "mqtt_password": "",
    "mqtt_topic_prefix": "partshelf",
}


class MqttConfigOut(BaseModel):
    mqtt_enabled: bool = False
    mqtt_broker: str = "mosquitto"
    mqtt_port: int = 1883
    mqtt_username: str = ""
    mqtt_password: str = ""
    mqtt_topic_prefix: str = "partshelf"


class MqttConfigIn(BaseModel):
    mqtt_enabled: Optional[bool] = None
    mqtt_broker: Optional[str] = None
    mqtt_port: Optional[int] = None
    mqtt_username: Optional[str] = None
    mqtt_password: Optional[str] = None
    mqtt_topic_prefix: Optional[str] = None


def _get_config_value(db: Session, key: str) -> str:
    row = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if row and row.value is not None:
        return row.value
    return MQTT_DEFAULTS.get(key, "")


def _set_config_value(db: Session, key: str, value: str):
    row = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if row:
        row.value = value
    else:
        db.add(SystemConfig(key=key, value=value))
    db.commit()


@router.get("/mqtt", response_model=MqttConfigOut)
def get_mqtt_config(db: Session = Depends(get_db)):
    return MqttConfigOut(
        mqtt_enabled=_get_config_value(db, "mqtt_enabled").lower() in ("true", "1", "yes"),
        mqtt_broker=_get_config_value(db, "mqtt_broker"),
        mqtt_port=int(_get_config_value(db, "mqtt_port") or 1883),
        mqtt_username=_get_config_value(db, "mqtt_username"),
        mqtt_password=_get_config_value(db, "mqtt_password"),
        mqtt_topic_prefix=_get_config_value(db, "mqtt_topic_prefix"),
    )


@router.put("/mqtt", response_model=MqttConfigOut)
def update_mqtt_config(payload: MqttConfigIn, db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    if payload.mqtt_enabled is not None:
        _set_config_value(db, "mqtt_enabled", str(payload.mqtt_enabled).lower())
    if payload.mqtt_broker is not None:
        _set_config_value(db, "mqtt_broker", payload.mqtt_broker)
    if payload.mqtt_port is not None:
        _set_config_value(db, "mqtt_port", str(payload.mqtt_port))
    if payload.mqtt_username is not None:
        _set_config_value(db, "mqtt_username", payload.mqtt_username)
    if payload.mqtt_password is not None:
        _set_config_value(db, "mqtt_password", payload.mqtt_password)
    if payload.mqtt_topic_prefix is not None:
        _set_config_value(db, "mqtt_topic_prefix", payload.mqtt_topic_prefix)

    # 重置 MQTT 连接以应用新配置
    from app.services.mqtt_service import reset_connection
    reset_connection()

    return get_mqtt_config(db)


@router.get("/mqtt/status")
def get_mqtt_status():
    """获取 MQTT 连接状态"""
    from app.services.mqtt_service import get_status
    return get_status()


@router.post("/mqtt/test")
def test_mqtt_connection(db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    """测试 MQTT 连接"""
    broker = _get_config_value(db, "mqtt_broker")
    port = int(_get_config_value(db, "mqtt_port") or 1883)
    username = _get_config_value(db, "mqtt_username") or None
    password = _get_config_value(db, "mqtt_password") or None

    try:
        import paho.mqtt.client as mqtt
        client = mqtt.Client(client_id="partshelf-test", protocol=mqtt.MQTTv311)
        if username:
            client.username_pw_set(username, password)

        result = {"connected": False, "error": None}

        def on_connect(c, u, f, rc):
            result["connected"] = (rc == 0)
            result["rc"] = rc
            c.disconnect()

        client.on_connect = on_connect
        client.connect(broker, port, keepalive=5)
        client.loop_start()

        import time
        time.sleep(2)
        client.loop_stop()

        if result["connected"]:
            return {"success": True, "message": f"连接成功 {broker}:{port}"}
        else:
            return {"success": False, "message": f"连接失败 rc={result.get('rc', '?')}"}
    except Exception as e:
        return {"success": False, "message": f"连接异常: {str(e)}"}


@router.get("/database_report")
def get_database_report(db: Session = Depends(get_db)):
    """获取数据库健康检查报告"""
    from app.services.inventory_service import InventoryService
    return InventoryService.get_database_report(db)


@router.post("/database_format")
def format_database(db: Session = Depends(get_db), user=Depends(get_current_user_required)):
    """格式化数据库：清理重复/孤立数据，修复分类混乱"""
    from app.services.inventory_service import InventoryService
    return InventoryService.format_database(db)


@router.get("/database_report/export")
def export_database_report(db: Session = Depends(get_db)):
    """导出数据库详细报告为Excel"""
    import io
    from datetime import datetime
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    from app.services.inventory_service import InventoryService

    report = InventoryService.get_database_report(db, include_details=True)

    workbook = Workbook()
    ws = workbook.active
    ws.title = "数据库报告"

    # 写入标题
    ws.append(["PartShelf 数据库检查报告"])
    ws.append([f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
    ws.append([])

    # 概览统计
    ws.append(["概览统计"])
    ws.append(["零件总数", report["total_parts"]])
    ws.append(["库存记录", report["total_inventory"]])
    ws.append(["历史记录", report["total_history"]])
    ws.append(["无编号零件", report["no_part_number"]])
    ws.append(["无类别零件", report["no_category_id"]])
    ws.append(["无子类别（有编号）", report["no_subcategory_id"]])
    ws.append(["孤立库存记录", report["orphaned_inventory"]])
    ws.append(["重复编号", len(report["duplicate_numbers"])])
    ws.append([])

    # 无编号零件详情
    if report.get("no_part_number_details"):
        ws.append(["无编号零件详情"])
        ws.append(["ID", "名称", "制造商", "封装", "类别", "子类别"])
        for p in report["no_part_number_details"]:
            ws.append([p["id"], p["name"], p["manufacturer"], p["package"], p["category"], p["subcategory"]])
        ws.append([])

    # 无类别零件详情
    if report.get("no_category_details"):
        ws.append(["无类别零件详情"])
        ws.append(["ID", "名称", "制造商", "封装", "编号"])
        for p in report["no_category_details"]:
            ws.append([p["id"], p["name"], p["manufacturer"], p["package"], p["part_number"]])
        ws.append([])

    # 无子类别零件详情
    if report.get("no_subcategory_details"):
        ws.append(["无子类别零件详情（有编号）"])
        ws.append(["ID", "编号", "名称", "制造商", "封装", "类别"])
        for p in report["no_subcategory_details"]:
            ws.append([p["id"], p["part_number"], p["name"], p["manufacturer"], p["package"], p["category"]])
        ws.append([])

    # 重复编号详情
    if report.get("duplicate_numbers"):
        ws.append(["重复编号详情"])
        ws.append(["编号", "重复次数"])
        for d in report["duplicate_numbers"]:
            ws.append([d["part_number"], d["count"]])
        ws.append([])

    # 类别统计
    if report.get("category_stats"):
        ws.append(["类别统计"])
        ws.append(["类别", "零件数量"])
        for s in report["category_stats"]:
            ws.append([s["category"], s["count"]])

    # 调整列宽
    for col in ws.columns:
        max_length = 0
        column_letter = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws.column_dimensions[column_letter].width = min(max_length + 2, 40)

    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)

    filename = f"partshelf_db_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
