import { GeminiProvider } from './gemini.provider';

// The only thing a provider does: send a prompt (+ optional files) and return parsed JSON.
// All prompts live in ai.service.ts, so adding a provider is one small file plus one
// line in PROVIDERS below. Pick it at runtime with AI_PROVIDER — no app rebuild.

export type AiFile = { mimeType: string; base64: string };

export interface AiProvider {
  generateJson(prompt: string, files?: AiFile[]): Promise<unknown>;
}

const PROVIDERS: Record<string, () => AiProvider> = {
  gemini: () => new GeminiProvider(),
};

export function createAiProvider(name = process.env.AI_PROVIDER ?? 'gemini'): AiProvider {
  const factory = PROVIDERS[name];
  if (!factory) {
    throw new Error(`Unknown AI_PROVIDER "${name}". Known: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return factory();
}
