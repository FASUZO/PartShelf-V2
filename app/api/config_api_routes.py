from fastapi import APIRouter, Depends, HTTPException
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
    update_category,
    update_param_template,
    update_subcategory,
)

router = APIRouter()


@router.get("/bundle", response_model=ConfigBundle)
def get_bundle(db: Session = Depends(get_db)):
    return get_config_bundle(db)


# ==================== Category ====================

@router.post("/categories", response_model=CategoryOut)
def add_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    return create_category(db, payload)


@router.put("/categories/{category_id}", response_model=CategoryOut)
def edit_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    return update_category(db, category_id, payload)


@router.delete("/categories/{category_id}")
def remove_category(category_id: int, db: Session = Depends(get_db)):
    delete_category(db, category_id)
    return {"message": "Category deleted"}


# ==================== Subcategory ====================

@router.post("/subcategories", response_model=SubcategoryOut)
def add_subcategory(payload: SubcategoryCreate, db: Session = Depends(get_db)):
    return create_subcategory(db, payload)


@router.put("/subcategories/{subcategory_id}", response_model=SubcategoryOut)
def edit_subcategory(subcategory_id: int, payload: SubcategoryUpdate, db: Session = Depends(get_db)):
    return update_subcategory(db, subcategory_id, payload)


@router.delete("/subcategories/{subcategory_id}")
def remove_subcategory(subcategory_id: int, db: Session = Depends(get_db)):
    delete_subcategory(db, subcategory_id)
    return {"message": "Subcategory deleted"}


# ==================== ParamTemplate ====================

@router.post("/param_templates", response_model=ParamTemplateOut)
def add_param_template(payload: ParamTemplateCreate, db: Session = Depends(get_db)):
    return create_param_template(db, payload)


@router.put("/param_templates/{template_id}", response_model=ParamTemplateOut)
def edit_param_template(template_id: int, payload: ParamTemplateUpdate, db: Session = Depends(get_db)):
    return update_param_template(db, template_id, payload)


@router.delete("/param_templates/{template_id}")
def remove_param_template(template_id: int, db: Session = Depends(get_db)):
    delete_param_template(db, template_id)
    return {"message": "ParamTemplate deleted"}


# ==================== LocationPrefix ====================

@router.post("/location_prefixes", response_model=LocationPrefixOut)
def add_location_prefix(payload: LocationPrefixCreate, db: Session = Depends(get_db)):
    return create_location_prefix(db, payload)


# ==================== MQTT 配置 ====================

MQTT_KEYS = ["mqtt_enabled", "mqtt_broker", "mqtt_port", "mqtt_username", "mqtt_password", "mqtt_topic_prefix"]

MQTT_DEFAULTS = {
    "mqtt_enabled": "false",
    "mqtt_broker": "127.0.0.1",
    "mqtt_port": "1883",
    "mqtt_username": "",
    "mqtt_password": "",
    "mqtt_topic_prefix": "partshelf",
}


class MqttConfigOut(BaseModel):
    mqtt_enabled: bool = False
    mqtt_broker: str = "127.0.0.1"
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
def update_mqtt_config(payload: MqttConfigIn, db: Session = Depends(get_db)):
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
def test_mqtt_connection(db: Session = Depends(get_db)):
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
