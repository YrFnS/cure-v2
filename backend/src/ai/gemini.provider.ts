import type { AiFile, AiProvider } from './ai.provider';

class BusyError extends Error {}

// Google Gemini via REST generateContent. Free tier is for demo/testing only:
// Google may train on and human-review unpaid-tier inputs, so send fake data only.
export class GeminiProvider implements AiProvider {
  private readonly apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  private readonly model = (process.env.AI_MODEL ?? '').trim();
  private readonly fallbackModel = (process.env.AI_FALLBACK_MODEL ?? '').trim();

  async generateJson(prompt: string, files: AiFile[] = []): Promise<unknown> {
    if (!this.apiKey || !this.model) {
      throw new Error('Gemini is not configured (GEMINI_API_KEY / AI_MODEL)');
    }
    // The free tier often answers 503 "high demand" / 429: retry once, then try the fallback model.
    const models = [this.model, this.fallbackModel].filter(Boolean);
    let lastError: unknown;
    for (const model of models) {
      for (const delayMs of [0, 3000]) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        try {
          return await this.request(model, prompt, files);
        } catch (error) {
          if (!(error instanceof BusyError)) throw error;
          lastError = error;
        }
      }
    }
    throw lastError;
  }

  private async request(model: string, prompt: string, files: AiFile[]): Promise<unknown> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...files.map(f => ({ inlineData: { mimeType: f.mimeType, data: f.base64 } })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const body: any = await response.json().catch(() => null);
    if (!response.ok) {
      const message = `Gemini ${response.status}: ${body?.error?.message ?? 'request failed'}`;
      throw response.status === 429 || response.status === 503 ? new BusyError(message) : new Error(message);
    }
    const text = body?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
    return JSON.parse(text);
  }
}
