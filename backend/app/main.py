from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas import PredictionRequest, OrderInput
from .ml.predictor import predict
from .database import save_order, get_orders_from_db

import uuid
import datetime


app = FastAPI(
    title="ETAura API",
    version="1.0.0",
    description="Intelligent delivery ETA and delay-risk prediction API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        x.strip()
        for x in settings.cors_origins.split(",")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Demo-mode memory storage.
# MongoDB Atlas is used automatically when MONGODB_URI is configured.
orders = []


@app.get("/api/health")
def health():

    database_status = "demo-mode"

    try:
        from .database import get_db

        db = get_db()

        if db is not None:
            database_status = "MongoDB Atlas connected"

    except Exception:
        database_status = "MongoDB unavailable"


    return {
        "status": "ok",
        "service": "ETAura API",
        "database": database_status
    }


@app.post("/api/predict")
def prediction(req: PredictionRequest):

    prediction_result = predict(
        req.model_dump()
    )

    order_id = (
        "ETA-"
        + str(uuid.uuid4())[:8].upper()
    )

    record = {
        "order_id": order_id,
        **req.model_dump(),
        **prediction_result,
        "created_at": datetime.datetime.utcnow().isoformat()
    }


    # Demo memory storage
    orders.insert(0, record)

    # Keep only latest 100 demo records
    del orders[100:]


    # Persist to MongoDB when Atlas is configured
    try:
        save_order(record)
    except Exception as e:
        print(
            "MongoDB save skipped:",
            str(e)
        )


    return record


@app.post("/api/orders")
def create_order(req: OrderInput):

    prediction_result = predict(
        req.model_dump()
    )

    record = {
        "order_id":
            "ETA-"
            + str(uuid.uuid4())[:8].upper(),

        **req.model_dump(),

        **prediction_result,

        "status": "Predicted",

        "created_at":
            datetime.datetime.utcnow().isoformat()
    }


    orders.insert(0, record)

    del orders[100:]


    try:
        save_order(record)
    except Exception as e:
        print(
            "MongoDB save skipped:",
            str(e)
        )


    return record


@app.get("/api/orders")
def get_orders():

    try:

        db_orders = get_orders_from_db()

        if db_orders:
            return db_orders

    except Exception as e:

        print(
            "MongoDB read skipped:",
            str(e)
        )


    return orders


@app.get("/api/orders/{order_id}")
def get_order(order_id: str):

    try:

        db_orders = get_orders_from_db()

        for order in db_orders:

            if order.get("order_id") == order_id:
                return order

    except Exception:
        pass


    for order in orders:

        if order.get("order_id") == order_id:
            return order


    raise HTTPException(
        status_code=404,
        detail="Order not found"
    )


@app.get("/api/dashboard/summary")
def dashboard_summary():

    try:

        db_orders = get_orders_from_db()

        if db_orders:
            current_orders = db_orders

        else:
            current_orders = orders

    except Exception:

        current_orders = orders


    if not current_orders:

        return {
            "total_orders": 0,
            "high_risk_orders": 0,
            "average_eta_error": None,
            "average_delay_probability": 0
        }


    return {

        "total_orders":
            len(current_orders),

        "high_risk_orders":
            sum(
                o.get("risk_level") == "HIGH"
                for o in current_orders
            ),

        "average_eta_error":
            None,

        "average_delay_probability":
            round(
                sum(
                    o.get(
                        "delay_probability",
                        0
                    )
                    for o in current_orders
                )
                / len(current_orders),
                3
            )
    }


@app.get("/api/dashboard/recent-orders")
def recent_orders():

    try:

        db_orders = get_orders_from_db()

        if db_orders:
            return db_orders[:20]

    except Exception:
        pass


    return orders[:20]


@app.get("/api/dashboard/risk-distribution")
def risk_distribution():

    try:

        db_orders = get_orders_from_db()

        current_orders = (
            db_orders
            if db_orders
            else orders
        )

    except Exception:

        current_orders = orders


    return [

        {
            "name": "Low",
            "value":
                sum(
                    o.get("risk_level") == "LOW"
                    for o in current_orders
                )
        },

        {
            "name": "Medium",
            "value":
                sum(
                    o.get("risk_level") == "MEDIUM"
                    for o in current_orders
                )
        },

        {
            "name": "High",
            "value":
                sum(
                    o.get("risk_level") == "HIGH"
                    for o in current_orders
                )
        }

    ]


@app.get("/api/ml/metrics")
def ml_metrics():

    import json
    import pathlib

    metrics_path = (
        pathlib.Path(__file__).parent
        / "ml"
        / "metrics.json"
    )


    if metrics_path.exists():

        return json.loads(
            metrics_path.read_text()
        )


    return {

        "regression": {
            "MAE": None,
            "RMSE": None,
            "R2": None
        },

        "classification": {
            "accuracy": None,
            "precision": None,
            "recall": None,
            "F1": None
        }

    }


@app.post("/api/ml/retrain")
def retrain():

    return {

        "status": "manual",

        "message":
            "Run python ml/train_model.py to retrain ETAura models."

    }
