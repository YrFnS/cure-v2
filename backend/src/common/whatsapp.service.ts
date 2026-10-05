import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

// UltraMSG WhatsApp sender, same contract as mrn-backend's password reset.
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async send(mobile: string, body: string) {
    const apiUrl = (process.env.ULTRAMSG_API_URL ?? '').trim().replace(/\/+$/, '');
    const token = (process.env.ULTRAMSG_TOKEN ?? '').trim();
    if (!apiUrl || !token) {
      // Local development only: print the message instead of sending it.
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[dev, WhatsApp not configured] to ${mobile}: ${body}`);
        return;
      }
      throw new ServiceUnavailableException('WhatsApp sending is not configured');
    }

    let result: { sent?: unknown; error?: unknown } | null = null;
    try {
      const response = await fetch(`${apiUrl}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token, to: `+964${mobile.slice(1)}`, body }).toString(),
        signal: AbortSignal.timeout(15000),
      });
      result = await response.json().catch(() => null);
    } catch (error) {
      this.logger.error(`UltraMSG request failed: ${error instanceof Error ? error.message : error}`);
    }

    if (!result || result.error || String(result.sent ?? '').toLowerCase() === 'false') {
      this.logger.error(`UltraMSG rejected the message: ${JSON.stringify(result)}`);
      throw new BadRequestException('تعذر إرسال الرمز عبر واتساب، حاول لاحقاً');
    }
  }
}
