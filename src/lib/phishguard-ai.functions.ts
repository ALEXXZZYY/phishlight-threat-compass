import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  kind: z.enum(["url", "email"]),
  url: z.string().max(2048).optional(),
  sender: z.string().max(512).optional(),
  subject: z.string().max(2048).optional(),
  body: z.string().max(30_000).optional(),
});

const MODEL = "openai/gpt-6-astra";

const SYSTEM = `You are a phishing detection classifier inside a security tool. You never visit URLs or open attachments; analyze only the provided text.
Classify the input as SAFE, SUSPICIOUS, or PHISHING. Consider domain spoofing/typosquatting, IP hosts, excessive subdomains, misleading paths, URL shorteners, lack of HTTPS, encoded characters, urgency, credential requests, sender/brand mismatch, threats, prize/payment lures and grammar anomalies.
Return confidence between 0 and 1 for your chosen label, and 3 to 6 short, concrete indicators (each under 120 characters) explaining the observations behind the verdict.`;

export const analyzeWithAi = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The AI analysis service is not configured.");

    let content: string;
    if (data.kind === "url") {
      const url = (data.url ?? "").trim();
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error("Enter a valid HTTP or HTTPS URL.");
      }
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Enter a valid HTTP or HTTPS URL.");
      content = `Classify this URL (do not visit it):\n${url}`;
    } else {
      const text = `From: ${data.sender ?? ""}\nSubject: ${data.subject ?? ""}\n\n${data.body ?? ""}`.trim();
      if (!(data.sender || data.subject || data.body)?.trim()) throw new Error("Enter email content to analyze.");
      content = `Classify this email (do not open links):\n${text}`;
    }

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output, NoObjectGeneratedError } = await import("ai");
    const openai = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const schema = z.object({
      prediction: z.enum(["SAFE", "SUSPICIOUS", "PHISHING"]),
      confidence: z.number(),
      indicators: z.array(z.string()),
    });

    let streamError: unknown;
    const result = streamText({
      model: openai.responses(MODEL),
      system: SYSTEM,
      prompt: content,
      maxRetries: 0,
      output: Output.object({ schema }),
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", store: false, include: ["reasoning.encrypted_content"] },
      },
      onError: ({ error }) => {
        streamError = error;
      },
    });

    let output: z.infer<typeof schema>;
    try {
      output = await result.output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error) && error.text) {
        output = schema.parse(JSON.parse(error.text));
      } else {
        const status = (streamError as { statusCode?: number } | undefined)?.statusCode;
        if (status === 429) throw new Error("Too many scans right now. Wait a moment and try again.");
        if (status === 402 || status === 403) throw new Error("AI scanning is paused: the workspace AI credits or limit need attention.");
        console.error(streamError ?? error);
        throw new Error("The AI analysis service failed. No prediction was produced.");
      }
    }

    return {
      prediction: output.prediction,
      confidence: Math.min(1, Math.max(0, output.confidence)),
      indicators: output.indicators.slice(0, 6).map((s) => s.slice(0, 200)),
      model_version: MODEL,
    };
  });
