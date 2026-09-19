from pydantic import BaseModel, Field
class OrderInput(BaseModel):
    restaurant: str="Demo Kitchen"
    distance_km: float=Field(3,ge=.1,le=50)
    prep_time: int=Field(15,ge=1,le=120)
    active_orders: int=Field(4,ge=0,le=200)
    available_riders: int=Field(5,ge=0,le=100)
    traffic: str="Medium"
    weather: str="Clear"
    demand: str="Medium"
    time_hour: int=19
class PredictionRequest(OrderInput): pass
