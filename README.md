# ETAura — Intelligent Delivery ETA & Delay Prediction

ETAura is an independent experimental AI-powered operational intelligence platform for delivery ETA and delay-risk prediction.

It is inspired by publicly documented delivery and mobility ETA challenges. It is not affiliated with Swiggy, Zomato, Blinkit, Zepto, Rapido, Uber, or any other company.

## Stack
React + Vite • FastAPI • MongoDB Atlas • scikit-learn • Recharts

## Run
### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

### ML
```powershell
python ml/generate_dataset.py
python ml/train_model.py
```
The backend can also use its deterministic fallback predictor when trained model files are not present.

### Frontend
```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set `MONGODB_URI` in backend/.env for Atlas. Without Atlas, the demo runs in local demo mode using in-memory sample data; no local database is used.
