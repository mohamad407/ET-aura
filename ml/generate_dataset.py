from pathlib import Path
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
n = 5000

distance = np.round(rng.uniform(0.5, 12, n), 2)
prep_time = rng.integers(5, 36, n)
active_orders = rng.integers(0, 30, n)
available_riders = rng.integers(1, 12, n)

traffic = rng.choice(
    ["Low", "Medium", "High"],
    n,
    p=[0.45, 0.40, 0.15]
)

weather = rng.choice(
    ["Clear", "Rain", "Storm"],
    n,
    p=[0.72, 0.23, 0.05]
)

demand = rng.choice(
    ["Low", "Medium", "High"],
    n,
    p=[0.30, 0.50, 0.20]
)

time_hour = rng.integers(8, 23, n)

traffic_effect = {
    "Low": 0,
    "Medium": 4,
    "High": 10
}

weather_effect = {
    "Clear": 0,
    "Rain": 3,
    "Storm": 8
}

demand_effect = {
    "Low": 0,
    "Medium": 3,
    "High": 7
}

traffic_minutes = np.array([traffic_effect[x] for x in traffic])
weather_minutes = np.array([weather_effect[x] for x in weather])
demand_minutes = np.array([demand_effect[x] for x in demand])

rider_penalty = np.maximum(0, 5 - available_riders) * 2

queue_effect = active_orders * 0.20

# Base expected delivery time
baseline_eta = (
    7
    + distance * 4
    + prep_time
)

# Actual delivery time
actual_delivery_time = (
    baseline_eta
    + traffic_minutes
    + weather_minutes
    + demand_minutes
    + rider_penalty
    + queue_effect
    + rng.normal(0, 2, n)
)

actual_delivery_time = np.maximum(
    5,
    actual_delivery_time
)

# Expected ETA without unexpected disruption
expected_eta = baseline_eta

# Delay means actual delivery is at least 20% slower
# than the expected baseline.
delay_threshold = expected_eta * 1.20

delay_minutes = actual_delivery_time - expected_eta

delayed = (
    actual_delivery_time > delay_threshold
).astype(int)

df = pd.DataFrame({
    "distance_km": distance,
    "prep_time": prep_time,
    "active_orders": active_orders,
    "available_riders": available_riders,
    "traffic": traffic,
    "weather": weather,
    "demand": demand,
    "time_hour": time_hour,
    "expected_eta": np.round(expected_eta, 2),
    "actual_delivery_time": np.round(actual_delivery_time, 2),
    "delay_minutes": np.round(delay_minutes, 2),
    "delayed": delayed
})

output = Path(__file__).parent / "dataset.csv"
df.to_csv(output, index=False)

print(f"Generated {len(df)} delivery records")
print()
print("Delay distribution:")
print(df["delayed"].value_counts(normalize=True).rename("percentage"))
print()
print("Average actual delivery time:",
      round(df["actual_delivery_time"].mean(), 2), "minutes")
