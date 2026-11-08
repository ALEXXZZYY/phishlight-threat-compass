import type { AnalyzerHealth, PredictionResult } from "@/lib/phishguard.types";

interface ApiPrediction {
  prediction: string;
  confidence: number;
  indicators: string[];
  model_version: string;
}

interface ApiHealth {
  status: string;
  models: { url: boolean; email: boolean };
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_PHISHGUARD_API_URL?: string;
  }
}

function getApiBaseUrl() {
  return import.meta.env.VITE_PHISHGUARD_API_URL?.trim().replace(/\/+$/, "") ?? "";
}

function parsePrediction(payload: ApiPrediction): PredictionResult {
  const prediction = payload.prediction.toUpperCase();
  if (!["SAFE", "SUSPICIOUS", "PHISHING"].includes(prediction)) {
    throw new Error("The analysis service returned an unsupported result.");
  }
  if (!Number.isFinite(payload.confidence) || payload.confidence < 0 || payload.confidence > 1) {
    throw new Error("The analysis service returned an invalid confidence score.");
  }

  return {
    prediction: prediction as PredictionResult["prediction"],
    confidence: payload.confidence,
    indicators: Array.isArray(payload.indicators) ? payload.indicators : [],
    modelVersion: payload.model_version || "unknown",
  };
}

async function postPrediction(path: string, body: Record<string, string>) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("The model service is not connected. No prediction was produced.");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error("The model service could not be reached. No prediction was produced.");
  }

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error("A trained model is not available for this scan. No prediction was produced.");
    }
    if (response.status === 422) {
      throw new Error("The analysis service rejected this input. Check it and try again.");
    }
    throw new Error("The model service returned an error. No prediction was produced.");
  }

  try {
    return parsePrediction((await response.json()) as ApiPrediction);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("The model service returned an unreadable result.");
  }
}

export function analyzeUrl(url: string) {
  return postPrediction("/predict/url", { url });
}

export function analyzeEmail(sender: string, subject: string, body: string) {
  return postPrediction("/predict/email", { sender, subject, body });
}

export async function getAnalyzerHealth(): Promise<AnalyzerHealth> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return { status: "unconfigured", urlModelReady: false, emailModelReady: false };
  }

  try {
    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error("Health check failed");
    const payload = (await response.json()) as ApiHealth;
    const urlModelReady = payload.models?.url === true;
    const emailModelReady = payload.models?.email === true;
    return {
      status: urlModelReady && emailModelReady ? "online" : "models-missing",
      urlModelReady,
      emailModelReady,
    };
  } catch {
    return { status: "offline", urlModelReady: false, emailModelReady: false };
  }
}