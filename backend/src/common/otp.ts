import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_WRONG = 5;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS = 3;

type Pending = { hash: string; expiresAt: number; wrong: number };
const hashCode = (code: string) => createHash('sha256').update(code).digest('hex');

/**
 * Six-digit codes keyed by purpose + phone (signup, reset).
 * ponytail: process memory, same as mrn-backend — fine for one pm2 fork; move to the DB
 * before running more than one instance.
 */
export class OtpStore {
  private readonly pending = new Map<string, Pending>();
  private readonly sends = new Map<string, number[]>();

  issue(key: string, now = Date.now()): string {
    const recent = (this.sends.get(key) ?? []).filter(ts => now - ts < SEND_WINDOW_MS);
    if (recent.length >= MAX_SENDS) throw new BadRequestException('طلبات كثيرة، حاول مجدداً بعد 15 دقيقة');
    this.sends.set(key, [...recent, now]);

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.pending.set(key, { hash: hashCode(code), expiresAt: now + CODE_TTL_MS, wrong: 0 });
    return code;
  }

  consume(key: string, code: unknown, now = Date.now()) {
    const otp = String(code ?? '').trim();
    if (!/^\d{6}$/.test(otp)) throw new BadRequestException('رمز التحقق يجب أن يكون 6 أرقام');

    const entry = this.pending.get(key);
    if (!entry || entry.expiresAt < now) {
      this.pending.delete(key);
      throw new BadRequestException('انتهت صلاحية رمز التحقق، اطلب رمزاً جديداً');
    }
    if (hashCode(otp) !== entry.hash) {
      entry.wrong += 1;
      if (entry.wrong >= MAX_WRONG) this.pending.delete(key);
      throw new BadRequestException('رمز التحقق غير صحيح');
    }
    this.pending.delete(key);
  }
}

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 10;

/**
 * Failed-login counter per identifier (phone or username): 10 failures in 15 minutes locks
 * that identifier until the window passes. Counting by identifier, not IP, so a shared
 * clinic network cannot lock everyone out.
 * ponytail: process memory, same ceiling as OtpStore.
 */
export class LoginLimiter {
  private readonly failures = new Map<string, number[]>();

  private recent(key: string, now: number) {
    return (this.failures.get(key) ?? []).filter(ts => now - ts < LOCK_WINDOW_MS);
  }

  assertAllowed(key: string, now = Date.now()) {
    if (this.recent(key, now).length >= MAX_FAILED_LOGINS) {
      throw new HttpException('محاولات دخول كثيرة، حاول بعد 15 دقيقة أو استعد كلمة المرور', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  fail(key: string, now = Date.now()) {
    this.failures.set(key, [...this.recent(key, now), now]);
  }

  succeed(key: string) {
    this.failures.delete(key);
  }
}
