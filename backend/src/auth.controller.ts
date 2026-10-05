import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Patch, Post, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import crypto from 'node:crypto';
import {
  AllowUnverified,
  AuthGuard,
  type AuthUser,
  CurrentUser,
  hashPassword,
  isIraqiMobile,
  newToken,
  normalizeIraqiPhone,
  Roles,
  verifyPassword,
} from './common/auth';
import { LoginLimiter, OtpStore } from './common/otp';
import { PrismaService } from './common/prisma.service';
import { signedFileUrl, verifySignedFile } from './common/signed-url';
import { decodeDataUpload, readFile, saveFile } from './common/storage';
import { WhatsAppService } from './common/whatsapp.service';

const SESSION_DAYS = 30;
const MIN_PASSWORD = 6;

// Shape the app's auth-store already understands (see app/src/lib/auth-store.ts).
export function toPatientDto(patient: any, phone: string | null) {
  return {
    id: patient.id,
    mrn: patient.mrn,
    name: patient.name,
    nameAr: patient.nameAr,
    nationalId: patient.nationalId ?? '',
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
    bloodType: patient.bloodType,
    address: patient.address,
    phone: phone ?? '',
    emergencyContact: '',
    profileImage: patient.profileImage ? signedFileUrl(patient.profileImage) : undefined,
    chronicConditions: [],
    allergies: [],
    verified: Boolean(patient.verifiedAt),
  };
}

function requirePhone(value: unknown) {
  const phone = normalizeIraqiPhone(value);
  if (!isIraqiMobile(phone)) throw new BadRequestException('رقم الهاتف يجب أن يكون بصيغة 07XXXXXXXXX');
  return phone;
}

function requirePassword(value: unknown) {
  const password = String(value ?? '');
  if (password.length < MIN_PASSWORD) throw new BadRequestException('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  return password;
}

@Controller()
export class AuthController {
  private readonly otp = new OtpStore();
  private readonly logins = new LoginLimiter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  private async openSession(userId: string) {
    const token = newToken();
    await this.prisma.session.create({
      data: { token, userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
    });
    return token;
  }

  @Post('auth/signup/send')
  async signupSend(@Body() body: { phone?: string }) {
    const phone = requirePhone(body.phone);
    if (await this.prisma.user.findUnique({ where: { phone } })) {
      throw new BadRequestException('هذا الرقم مسجل مسبقاً، سجّل الدخول');
    }
    const code = this.otp.issue(`signup:${phone}`);
    await this.whatsapp.send(phone, `رمز إنشاء حساب كيور: ${code}\nصالح لمدة 5 دقائق.`);
    return { message: 'Code sent by WhatsApp' };
  }

  @Post('auth/signup/confirm')
  async signupConfirm(@Body() body: { phone?: string; code?: string; password?: string }) {
    const phone = requirePhone(body.phone);
    const password = requirePassword(body.password);
    this.otp.consume(`signup:${phone}`, body.code);

    const { hash, salt } = hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        phone,
        passwordHash: hash,
        passwordSalt: salt,
        patient: { create: { mrn: await this.nextMrn() } },
      },
      include: { patient: true },
    });
    return { token: await this.openSession(user.id), patient: toPatientDto(user.patient, phone) };
  }

  // ponytail: random 8-digit MRN with a uniqueness retry; a sequence if MRNs must be ordered.
  private async nextMrn(): Promise<string> {
    for (;;) {
      const mrn = String(crypto.randomInt(10_000_000, 100_000_000));
      if (!(await this.prisma.patient.findUnique({ where: { mrn } }))) return mrn;
    }
  }

  // Patients log in by phone; lab and admin users by username.
  @Post('auth/login')
  async login(@Body() body: { identifier?: string; phone?: string; password?: string }) {
    const identifier = String(body.identifier ?? body.phone ?? '').trim();
    const phone = normalizeIraqiPhone(identifier);
    const key = isIraqiMobile(phone) ? phone : identifier.toLowerCase();
    this.logins.assertAllowed(key);
    const user = await this.prisma.user.findFirst({
      where: isIraqiMobile(phone) ? { phone } : { username: identifier },
      include: { patient: true, lab: true },
    });
    if (!user || !verifyPassword(String(body.password ?? ''), user.passwordHash, user.passwordSalt)) {
      this.logins.fail(key);
      throw new UnauthorizedException('رقم الهاتف أو كلمة المرور غير صحيحة');
    }
    this.logins.succeed(key);
    return {
      token: await this.openSession(user.id),
      role: user.role,
      lab: user.lab ? { id: user.lab.id, name: user.lab.name } : undefined,
      patient: user.patient ? toPatientDto(user.patient, user.phone) : undefined,
    };
  }

  @Post('auth/logout')
  @UseGuards(AuthGuard)
  @Roles('PATIENT', 'LAB', 'ADMIN')
  @AllowUnverified()
  async logout(@Headers('authorization') authorization: string) {
    const token = String(authorization ?? '').split(' ')[1] ?? '';
    await this.prisma.session.deleteMany({ where: { token } });
    return { ok: true };
  }

  @Post('auth/password-reset/send')
  async resetSend(@Body() body: { phone?: string }) {
    const phone = requirePhone(body.phone);
    // Same answer whether or not the number is registered.
    const response = { message: 'If this number is registered, a code has been sent by WhatsApp.' };
    if (!(await this.prisma.user.findUnique({ where: { phone } }))) return response;
    const code = this.otp.issue(`reset:${phone}`);
    await this.whatsapp.send(phone, `رمز استعادة كلمة المرور: ${code}\nصالح لمدة 5 دقائق.`);
    return response;
  }

  @Post('auth/password-reset/confirm')
  async resetConfirm(@Body() body: { phone?: string; code?: string; newPassword?: string }) {
    const phone = requirePhone(body.phone);
    const password = requirePassword(body.newPassword);
    this.otp.consume(`reset:${phone}`, body.code);
    const { hash, salt } = hashPassword(password);
    const user = await this.prisma.user.update({ where: { phone }, data: { passwordHash: hash, passwordSalt: salt } });
    await this.prisma.session.deleteMany({ where: { userId: user.id } });
    this.logins.succeed(phone);
    return { message: 'Password updated successfully' };
  }

  @Get('users/me')
  @UseGuards(AuthGuard)
  @AllowUnverified()
  async me(@CurrentUser() user: AuthUser) {
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId }, include: { patient: true } });
    return toPatientDto(row.patient, row.phone);
  }

  // Profile photo only; identity fields come from the ID card.
  @Patch('users/me')
  @UseGuards(AuthGuard)
  @AllowUnverified()
  async updateMe(@CurrentUser() user: AuthUser, @Body() body: { profileImageBase64?: string; profileImageMime?: string }) {
    const data: { profileImage?: string } = {};
    if (body.profileImageBase64) {
      const { mimeType, buffer } = decodeDataUpload(
        `data:${body.profileImageMime ?? 'image/jpeg'};base64,${body.profileImageBase64}`,
        ['image/jpeg', 'image/png'],
      );
      data.profileImage = await saveFile('avatars', mimeType, buffer);
    }
    const patient = await this.prisma.patient.update({ where: { id: user.patientId! }, data, include: { user: true } });
    return toPatientDto(patient, patient.user.phone);
  }

  // Private files behind an expiring signed link (only avatars today). No session needed:
  // the signature is the permission, and it is only issued to the photo's owner.
  @Get('files')
  async file(@Query('f') file: string, @Query('exp') exp: string, @Query('sig') sig: string, @Res() res: Response) {
    const name = String(file ?? '');
    if (!/^avatars\/[\w-]+\.(jpg|png)$/.test(name) || !verifySignedFile(name, exp, sig)) {
      throw new ForbiddenException('Link expired or invalid');
    }
    res.setHeader('Content-Type', name.endsWith('.png') ? 'image/png' : 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(await readFile(name));
  }
}
