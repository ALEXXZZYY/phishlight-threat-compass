# PhishGuard AI model service

This FastAPI service runs the URL and email classifiers separately from the web app. It never visits submitted URLs, follows links, or opens attachments. No model artifacts or example predictions are included; without trained artifacts the health check reports models as unavailable and both prediction endpoints return HTTP 503.

## Prepare labeled data

Provide two private CSV files (do not commit them):

- `urls.csv` with `url,label` columns
- `emails.csv` with `email,label` columns

Each file must contain examples for all three labels: `SAFE`, `SUSPICIOUS`, and `PHISHING`. Use a properly reviewed, legally usable dataset representative of your intended use. Keep each class represented in training data. This starter trainer is not a substitute for evaluation, calibration, privacy review, or ongoing dataset updates. Remove personal information from email data where possible.

## Train and run locally

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train.py --urls /path/to/urls.csv --emails /path/to/emails.csv --output-dir models --version reviewed-v1
PHISHGUARD_CORS_ORIGINS=http://localhost:8080 uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Set `VITE_PHISHGUARD_API_URL=http://localhost:8000` in the web app's `.env.local`, then restart its development preview. Deploy this service separately to a Python-capable host, include the trained model artifacts through that host's secure artifact mechanism, and set the production app's `VITE_PHISHGUARD_API_URL` to its HTTPS base URL. Set `PHISHGUARD_CORS_ORIGINS` to the exact app origins allowed to call it. The service URL is public configuration, not a secret; never place credentials in `VITE_*` variables.

## Endpoints

- `GET /health` — reports service availability and whether both models loaded
- `POST /predict/url` — JSON body `{"url":"https://example.org"}`
- `POST /predict/email` — JSON body `{"sender":"...","subject":"...","body":"..."}`

Predictions use the loaded scikit-learn pipeline's `predict_proba` output. Returned indicators are explicit text-derived observations, not model explanations. Treat both predictions and confidence as decision support, not a guarantee of safety.