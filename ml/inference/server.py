"""
FastAPI inference server for game predictions.

Usage:
    uvicorn ml.inference.server:app --host 0.0.0.0 --port 8100
    python -m ml.inference.server
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ml.config import ML_PORT
from ml.inference.predict import Predictor

predictor = Predictor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup."""
    try:
        predictor.load()
    except FileNotFoundError as e:
        print(f"WARNING: {e}")
        print("Server starting without models. Train models first.")
    yield


app = FastAPI(title="CBB Game Prediction API", lifespan=lifespan)


class PredictionRequest(BaseModel):
    home_team_key: str
    away_team_key: str


class KeyToGame(BaseModel):
    label: str
    description: str
    impact: float
    advantage: str


class TeamPrediction(BaseModel):
    team_key: str
    win_probability: float
    predicted_score: int
    keys_to_game: list[KeyToGame]


class PredictionResponse(BaseModel):
    home: TeamPrediction
    away: TeamPrediction
    predicted_spread: float
    predicted_total: int
    model_version: str


@app.get("/health")
async def health():
    has_model = predictor.win_model is not None
    return {
        "status": "ok" if has_model else "no_model",
        "model_loaded": has_model,
        "model_version": predictor.metadata.get("version") if predictor.metadata else None,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    """Sync endpoint — predictor.predict() does blocking DB I/O.
    FastAPI runs sync endpoints in a threadpool automatically."""
    if predictor.win_model is None:
        raise HTTPException(status_code=503, detail="No model loaded. Train models first.")

    try:
        result = predictor.predict(req.home_team_key, req.away_team_key)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/model/info")
async def model_info():
    return predictor.get_model_info()


@app.post("/reload")
async def reload_model():
    """Reload model from disk (after retraining)."""
    try:
        predictor.load()
        return {"status": "ok", "version": predictor.metadata["version"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("ml.inference.server:app", host="0.0.0.0", port=ML_PORT, reload=True)
