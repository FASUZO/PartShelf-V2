import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_client = None
_enabled = False
_config_loaded = False


def _get_db_config(key: str) -> Optional[str]:
    """从数据库读取配置，失败时回退到环境变量"""
    try:
        from db.database import SessionLocal
        from app.models.config import SystemConfig
        db = SessionLocal()
        row = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        db.close()
        if row and row.value is not None:
            return row.value
    except Exception:
        pass
    return None


def _get_config(key: str, env_name: str, default: str = "") -> str:
    """优先数据库，其次环境变量，最后默认值"""
    db_val = _get_db_config(key)
    if db_val is not None:
        return db_val
    return os.getenv(env_name, default)


def _connect_if_needed():
    global _client, _enabled, _config_loaded

    enabled_str = _get_config("mqtt_enabled", "MQTT_ENABLED", "false")
    enabled = enabled_str.lower() in ("1", "true", "yes")
    _enabled = enabled
    _config_loaded = True

    if not enabled:
        return

    broker = _get_config("mqtt_broker", "MQTT_BROKER", "127.0.0.1")
    port = int(_get_config("mqtt_port", "MQTT_PORT", "1883"))
    username = _get_config("mqtt_username", "MQTT_USERNAME") or None
    password = _get_config("mqtt_password", "MQTT_PASSWORD") or None

    try:
        import paho.mqtt.client as mqtt

        client = mqtt.Client(client_id="partshelf-v2", protocol=mqtt.MQTTv311)
        if username:
            client.username_pw_set(username, password)

        client.on_connect = lambda c, u, f, rc: logger.info("MQTT connected: rc=%s", rc)
        client.on_disconnect = lambda c, u, rc: logger.warning("MQTT disconnected: rc=%s", rc)

        client.connect_async(broker, port, keepalive=30)
        client.loop_start()
        _client = client
        logger.info("MQTT enabled -> %s:%s", broker, port)
    except Exception as e:
        _client = None
        _enabled = False
        logger.exception("MQTT init failed, running without MQTT: %s", e)


def reset_connection():
    """重置 MQTT 连接（配置变更后调用）"""
    global _client, _enabled, _config_loaded
    if _client:
        try:
            _client.loop_stop()
            _client.disconnect()
        except Exception:
            pass
    _client = None
    _enabled = False
    _config_loaded = False
    logger.info("MQTT connection reset")


def publish_event(topic_suffix: str, payload: str):
    if not _config_loaded:
        _connect_if_needed()

    if not _enabled:
        return False

    if _client is None:
        _connect_if_needed()

    if not _enabled or _client is None:
        return False

    prefix = _get_config("mqtt_topic_prefix", "MQTT_TOPIC_PREFIX", "partshelf")
    topic = f"{prefix}/{topic_suffix}".strip("/")

    try:
        _client.publish(topic, payload, qos=0, retain=False)
        return True
    except Exception:
        logger.exception("MQTT publish failed")
        return False


def get_status() -> dict:
    """获取 MQTT 当前状态"""
    if not _config_loaded:
        _connect_if_needed()
    return {
        "enabled": _enabled,
        "connected": _client is not None and _client.is_connected() if _client else False,
    }
