export type ScanKind = "url" | "email";
export type ScanPrediction = "SAFE" | "SUSPICIOUS" | "PHISHING";

export interface PredictionResult {
  prediction: ScanPrediction;
  confidence: number;
  indicators: string[];
  modelVersion: string;
}

export interface ScanRecord extends PredictionResult {
  id: string;
  kind: ScanKind;
  input: string;
  createdAt: string;
}

export interface AnalyzerHealth {
  status: "checking" | "unconfigured" | "online" | "models-missing" | "offline";
  urlModelReady: boolean;
  emailModelReady: boolean;
}