from pymongo import MongoClient
from .config import settings

_client = None
_db = None


def get_db():
    global _client, _db

    if not settings.mongodb_uri:
        return None

    if _db is None:
        _client = MongoClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=5000
        )

        _client.admin.command("ping")
        _db = _client[settings.database_name]

    return _db


def save_order(order):
    db = get_db()

    if db is None:
        return False

    clean_order = order.copy()
    db.orders.insert_one(clean_order)

    return True


def get_orders_from_db(limit=100):
    db = get_db()

    if db is None:
        return []

    return list(
        db.orders
        .find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
