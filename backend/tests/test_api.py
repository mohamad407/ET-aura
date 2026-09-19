from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_health(): assert client.get('/api/health').status_code==200
def test_prediction():
 r=client.post('/api/predict',json={})
 assert r.status_code==200 and 'predicted_eta' in r.json()
