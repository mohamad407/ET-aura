from pathlib import Path
import math

MODEL_DIR = Path(__file__).parent / "models"
REG = MODEL_DIR / "eta_regressor.joblib"
CLF = MODEL_DIR / "delay_classifier.joblib"


def predict(x):
    if REG.exists() and CLF.exists():
        import joblib
        import pandas as pd

        reg = joblib.load(REG)
        clf = joblib.load(CLF)

        data = pd.DataFrame([{
            "distance_km": x["distance_km"],
            "prep_time": x["prep_time"],
            "active_orders": x["active_orders"],
            "available_riders": x["available_riders"],
            "traffic": x["traffic"],
            "weather": x["weather"],
            "demand": x["demand"],
            "time_hour": x["time_hour"]
        }])

        eta = float(reg.predict(data)[0])
        prob = float(clf.predict_proba(data)[0][1])

    else:
        traffic = {"Low": 0, "Medium": 5, "High": 11}.get(
            x["traffic"], 5
        )
        weather = {"Clear": 0, "Rain": 3, "Storm": 7}.get(
            x["weather"], 0
        )
        demand = {"Low": 0, "Medium": 4, "High": 8}.get(
            x["demand"], 4
        )

        rider_penalty = max(0, 5 - x["available_riders"]) * 2

        eta = (
            8
            + x["distance_km"] * 4
            + x["prep_time"]
            + traffic
            + weather
            + demand
            + rider_penalty
        )

        z = (eta - 28) / 8
        prob = 1 / (1 + math.exp(-z))

    eta = max(5, round(eta, 1))
    prob = max(0, min(1, prob))

    if prob <= 0.30:
        risk = "LOW"
    elif prob <= 0.60:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    factors = []

    if x["prep_time"] >= 20:
        factors.append("Restaurant preparation")

    if x["traffic"] == "High":
        factors.append("Traffic")

    if x["available_riders"] <= 2:
        factors.append("Low rider availability")

    if x["demand"] == "High":
        factors.append("High demand")

    if not factors:
        factors.append("Normal operating conditions")

    spread = max(3, round(eta * 0.10))

    return {
        "predicted_eta": round(eta),
        "min_eta": max(1, round(eta - spread)),
        "max_eta": round(eta + spread),
        "delay_probability": round(prob, 3),
        "risk_level": risk,
        "main_delay_factor": factors[0],
        "contributing_factors": factors
    }