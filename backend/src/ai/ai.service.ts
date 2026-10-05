import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AiFile, AiProvider, createAiProvider } from './ai.provider';

export type IdCardFields = {
  nameAr: string;
  name: string;
  nationalId: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'male' | 'female' | '';
  bloodType: string;
  address: string;
};

export type ResultInsight = { summary: string; suggestions: string[] };

const DISCLAIMER = 'هذا ملخص توضيحي وليس تشخيصاً طبياً. راجع طبيبك.';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private provider: AiProvider | null = null;

  // Lazy so the server boots without an AI key; only AI calls fail, as a clear 503.
  private async generateJson(prompt: string, files: AiFile[]): Promise<any> {
    try {
      this.provider ??= createAiProvider();
      return await this.provider.generateJson(prompt, files);
    } catch (error) {
      this.logger.error(`AI call failed: ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException('خدمة الذكاء الاصطناعي غير متاحة حالياً، حاول لاحقاً');
    }
  }

  async readIdCard(front: AiFile, back: AiFile): Promise<IdCardFields> {
    const raw: any = await this.generateJson(
      `These are the front and back of an Iraqi national ID card.
Return JSON with exactly these keys:
{"nameAr": full name in Arabic as printed, "name": the same name in Latin letters,
 "nationalId": the national ID number (digits only), "dateOfBirth": "YYYY-MM-DD",
 "gender": "male" or "female", "bloodType": e.g. "O+" or "" if not printed,
 "address": place of residence if printed, else ""}
If the images are not an Iraqi national ID card, return {"nationalId": ""}.`,
      [front, back],
    );
    const gender = str(raw?.gender).toLowerCase();
    return {
      nameAr: str(raw?.nameAr),
      name: str(raw?.name),
      nationalId: str(raw?.nationalId).replace(/\D/g, ''),
      dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(str(raw?.dateOfBirth)) ? str(raw?.dateOfBirth) : '',
      gender: gender === 'male' || gender === 'female' ? gender : '',
      bloodType: str(raw?.bloodType),
      address: str(raw?.address),
    };
  }

  async explainResult(pdf: AiFile, testName: string): Promise<ResultInsight> {
    const raw: any = await this.generateJson(
      `This PDF is a patient's lab result for "${testName}".
Write for the patient in simple Arabic. Do not diagnose; mention values outside the normal range.
Return JSON: {"summary": 3-5 short sentences, "suggestions": 4 short questions (Arabic) the patient
would likely ask about THIS result, each answerable from the PDF}.`,
      [pdf],
    );
    const suggestions = Array.isArray(raw?.suggestions) ? raw.suggestions.map(str).filter(Boolean).slice(0, 5) : [];
    return { summary: `${str(raw?.summary)}\n\n${DISCLAIMER}`.trim(), suggestions };
  }

  async answer(pdf: AiFile, testName: string, question: string): Promise<string> {
    const raw: any = await this.generateJson(
      `This PDF is a patient's lab result for "${testName}". Answer the patient's question in simple
Arabic, 2-4 sentences, based only on this result. Do not diagnose or prescribe; when in doubt,
advise seeing a doctor. Question: ${question}
Return JSON: {"answer": "..."}`,
      [pdf],
    );
    return `${str(raw?.answer)}\n\n${DISCLAIMER}`.trim();
  }
}
