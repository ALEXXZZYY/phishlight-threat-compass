import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = Path(os.environ.get("PHISHGUARD_MODEL_DIR", ROOT / "models"))
LABELS = {"SAFE", "SUSPICIOUS", "PHISHING"}

app = FastAPI(title="PhishGuard AI model service", version="1.0.0")
origins = [origin.strip() for origin in os.environ.get("PHISHGUARD_CORS_ORIGINS", "").split(",") if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


class UrlRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2048)

    @field_validator("url")
    @classmethod
    def validate_http_url(cls, value: str) -> str:
        parsed = urlsplit(value.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("Enter a valid HTTP or HTTPS URL.")
        return value.strip()


class EmailRequest(BaseModel):
    sender: str = Field(default="", max_length=512)
    subject: str = Field(default="", max_length=2048)
    body: str = Field(default="", max_length=30_000)

    @field_validator("sender", "subject", "body")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()

    def combined(self) -> str:
        value = f"From: {self.sender}\nSubject: {self.subject}\n\n{self.body}".strip()
        if not value:
            raise ValueError("Enter email content to analyze.")
        return value


class PredictionResponse(BaseModel):
    prediction: Literal["SAFE", "SUSPICIOUS", "PHISHING"]
    confidence: float = Field(ge=0, le=1)
    indicators: list[str]
    model_version: str


@lru_cache(maxsize=2)
def load_model(kind: str):
    path = MODEL_DIR / f"{kind}_model.joblib"
    if not path.is_file():
        return None
    try:
        bundle = joblib.load(path)
    except Exception:
        return None
    if not isinstance(bundle, dict) or "model" not in bundle:
        return None
    model = bundle["model"]
    classes = {str(label).upper() for label in getattr(model, "classes_", [])}
    if not LABELS.issubset(classes) or not hasattr(model, "predict_proba"):
        return None
    return {"model": model, "version": str(bundle.get("version", "trained-model"))}


def observed_url_indicators(value: str) -> list[str]:
    parsed = urlsplit(value)
    host = parsed.hostname or ""
    indicators: list[str] = []
    if len(value) > 100:
        indicators.append("URL is longer than 100 characters")
    if "@" in value:
        indicators.append("URL contains an @ symbol")
    if host.count(".") >= 4:
        indicators.append("Host contains several subdomain levels")
    if re.search(r"(?:%[0-9a-fA-F]{2}|\.{2,}|-{3,})", value):
        indicators.append("URL contains repeated or encoded special characters")
    if host.replace(".", "").isdigit():
        indicators.append("Host is an IP address rather than a domain name")
    if not indicators:
        indicators.append("No listed structural URL indicators were found")
    return indicators


def observed_email_indicators(sender: str, subject: str, body: str) -> list[str]:
    indicators: list[str] = []
    if re.search(r"https?://", body, flags=re.IGNORECASE):
        count = len(re.findall(r"https?://", body, flags=re.IGNORECASE))
        indicators.append(f"Email body contains {count} link(s); destinations were not opened")
    if re.search(r"\b(urgent|immediately|verify|suspended|expire|act now)\b", subject + " " + body, re.IGNORECASE):
        indicators.append("Urgency or account-action wording appears in the text")
    if re.search(r"\b(password|login|sign in|credentials|one-time code)\b", subject + " " + body, re.IGNORECASE):
        indicators.append("The message refers to account credentials or sign-in")
    if sender and not re.search(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", sender.strip("<> ")):
        indicators.append("Sender field is not a plain email address")
    if not indicators:
        indicators.append("No listed structural email indicators were found")
    return indicators


def predict(kind: str, text: str, indicators: list[str]) -> PredictionResponse:
    bundle = load_model(kind)
    if bundle is None:
        raise HTTPException(status_code=503, detail=f"Trained {kind} model is unavailable")
    model = bundle["model"]
    try:
        probabilities = model.predict_proba([text])[0]
        index = int(probabilities.argmax())
        prediction = str(model.classes_[index]).upper()
        confidence = float(probabilities[index])
    except Exception as exc:
        raise HTTPException(status_code=503, detail="The trained model could not analyze this input") from exc
    if prediction not in LABELS:
        raise HTTPException(status_code=503, detail="Model output is not a supported classification")
    return PredictionResponse(
        prediction=prediction,
        confidence=confidence,
        indicators=indicators,
        model_version=bundle["version"],
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": {"url": load_model("url") is not None, "email": load_model("email") is not None},
    }


@app.post("/predict/url", response_model=PredictionResponse)
def predict_url(request: UrlRequest):
    return predict("url", request.url, observed_url_indicators(request.url))


@app.post("/predict/email", response_model=PredictionResponse)
def predict_email(request: EmailRequest):
    try:
        text = request.combined()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return predict("email", text, observed_email_indicators(request.sender, request.subject, request.body))