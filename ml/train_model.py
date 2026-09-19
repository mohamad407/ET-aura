from pathlib import Path
import pandas as pd
import json
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline

from sklearn.ensemble import (
    GradientBoostingRegressor,
    GradientBoostingClassifier
)

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)

BASE = Path(__file__).parent

dataset = BASE / "dataset.csv"

if not dataset.exists():
    print("Dataset not found. Generating dataset...")
    exec((BASE / "generate_dataset.py").read_text())

df = pd.read_csv(dataset)

features = [
    "distance_km",
    "prep_time",
    "active_orders",
    "available_riders",
    "traffic",
    "weather",
    "demand",
    "time_hour"
]

categorical = [
    "traffic",
    "weather",
    "demand"
]

numerical = [
    x for x in features
    if x not in categorical
]

X = df[features]

# -----------------------------
# ETA REGRESSION MODEL
# -----------------------------

y_eta = df["actual_delivery_time"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y_eta,
    test_size=0.20,
    random_state=42
)

eta_preprocessor = ColumnTransformer([
    (
        "categorical",
        OneHotEncoder(handle_unknown="ignore"),
        categorical
    ),
    (
        "numerical",
        "passthrough",
        numerical
    )
])

eta_model = Pipeline([
    ("preprocessor", eta_preprocessor),
    (
        "model",
        GradientBoostingRegressor(
            random_state=42,
            n_estimators=150,
            max_depth=3
        )
    )
])

eta_model.fit(X_train, y_train)

eta_predictions = eta_model.predict(X_test)

mae = mean_absolute_error(
    y_test,
    eta_predictions
)

rmse = mean_squared_error(
    y_test,
    eta_predictions
) ** 0.5

r2 = r2_score(
    y_test,
    eta_predictions
)

# -----------------------------
# DELAY CLASSIFICATION MODEL
# -----------------------------

y_delay = df["delayed"]

X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
    X,
    y_delay,
    test_size=0.20,
    random_state=42,
    stratify=y_delay
)

delay_preprocessor = ColumnTransformer([
    (
        "categorical",
        OneHotEncoder(handle_unknown="ignore"),
        categorical
    ),
    (
        "numerical",
        "passthrough",
        numerical
    )
])

delay_model = Pipeline([
    ("preprocessor", delay_preprocessor),
    (
        "model",
        GradientBoostingClassifier(
            random_state=42,
            n_estimators=120,
            max_depth=3
        )
    )
])

delay_model.fit(
    X_train_c,
    y_train_c
)

delay_predictions = delay_model.predict(
    X_test_c
)

accuracy = accuracy_score(
    y_test_c,
    delay_predictions
)

precision = precision_score(
    y_test_c,
    delay_predictions,
    zero_division=0
)

recall = recall_score(
    y_test_c,
    delay_predictions,
    zero_division=0
)

f1 = f1_score(
    y_test_c,
    delay_predictions,
    zero_division=0
)

# -----------------------------
# SAVE MODELS
# -----------------------------

model_dir = (
    BASE.parent
    / "backend"
    / "app"
    / "ml"
    / "models"
)

model_dir.mkdir(
    parents=True,
    exist_ok=True
)

joblib.dump(
    eta_model,
    model_dir / "eta_regressor.joblib"
)

joblib.dump(
    delay_model,
    model_dir / "delay_classifier.joblib"
)

# -----------------------------
# SAVE METRICS
# -----------------------------

metrics = {
    "regression": {
        "MAE": round(mae, 3),
        "RMSE": round(rmse, 3),
        "R2": round(r2, 3)
    },
    "classification": {
        "accuracy": round(accuracy, 3),
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "F1": round(f1, 3)
    },
    "dataset": {
        "records": len(df),
        "delay_rate": round(float(df["delayed"].mean()), 3)
    }
}

metrics_file = (
    BASE.parent
    / "backend"
    / "app"
    / "ml"
    / "metrics.json"
)

metrics_file.write_text(
    json.dumps(metrics, indent=2)
)

print()
print("=" * 50)
print("ETAura MODEL TRAINING COMPLETE")
print("=" * 50)

print()
print("ETA REGRESSION")
print("MAE :", round(mae, 3), "minutes")
print("RMSE:", round(rmse, 3), "minutes")
print("R2  :", round(r2, 3))

print()
print("DELAY CLASSIFICATION")
print("Accuracy :", round(accuracy, 3))
print("Precision:", round(precision, 3))
print("Recall   :", round(recall, 3))
print("F1       :", round(f1, 3))

print()
print("Delay rate:",
      round(float(df["delayed"].mean() * 100), 2), "%")

print()
print("Models saved to:")
print(model_dir)

