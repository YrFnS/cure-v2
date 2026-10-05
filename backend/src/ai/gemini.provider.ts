import type { AiFile, AiProvider } from './ai.provider';

// Google Gemini via REST generateContent. Free tier is for demo/testing only:
// Google may train on and human-review unpaid-tier inputs, so send fake data only.
export class GeminiProvider implements AiProvider {
  private readonly apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  private readonly model = (process.env.AI_MODEL ?? '').trim();

  async generateJson(prompt: string, files: AiFile[] = []): Promise<unknown> {
    if (!this.apiKey || !this.model) {
      throw new Error('Gemini is not configured (GEMINI_API_KEY / AI_MODEL)');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
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
      throw new Error(`Gemini ${response.status}: ${body?.error?.message ?? 'request failed'}`);
    }
    const text = body?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
    return JSON.parse(text);
  }
}
