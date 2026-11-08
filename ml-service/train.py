import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

EXPECTED_LABELS = {"SAFE", "SUSPICIOUS", "PHISHING"}


def train_one(source: Path, text_column: str, kind: str, output_dir: Path, version: str):
    frame = pd.read_csv(source)
    if text_column not in frame or "label" not in frame:
        raise ValueError(f"{source} must contain '{text_column}' and 'label' columns")
    frame = frame[[text_column, "label"]].dropna()
    frame[text_column] = frame[text_column].astype(str).str.strip()
    frame["label"] = frame["label"].astype(str).str.upper().str.strip()
    frame = frame[frame[text_column] != ""]
    labels = set(frame["label"].unique())
    if labels != EXPECTED_LABELS:
        raise ValueError(f"{source} must include all three labels: {', '.join(sorted(EXPECTED_LABELS))}")
    if frame.groupby("label").size().min() < 2:
        raise ValueError("Provide at least two examples for each label")

    model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(analyzer="char", ngram_range=(2, 5), min_df=1, max_features=250_000)),
            ("classifier", LogisticRegression(max_iter=1500, class_weight="balanced")),
        ]
    )
    model.fit(frame[text_column].tolist(), frame["label"].tolist())
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "version": version}, output_dir / f"{kind}_model.joblib")
    print(f"Saved {kind} model from {len(frame)} labeled rows to {output_dir}")


def main():
    parser = argparse.ArgumentParser(description="Train PhishGuard models from labeled CSV datasets")
    parser.add_argument("--urls", type=Path, required=True, help="CSV with url,label columns")
    parser.add_argument("--emails", type=Path, required=True, help="CSV with email,label columns")
    parser.add_argument("--output-dir", type=Path, default=Path("models"))
    parser.add_argument("--version", default="local-v1")
    args = parser.parse_args()
    train_one(args.urls, "url", "url", args.output_dir, args.version)
    train_one(args.emails, "email", "email", args.output_dir, args.version)


if __name__ == "__main__":
    main()