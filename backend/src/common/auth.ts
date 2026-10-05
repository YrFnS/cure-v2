import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import crypto from 'node:crypto';
import { PrismaService } from './prisma.service';

export type AuthUser = {
  userId: string;
  role: 'PATIENT' | 'LAB' | 'ADMIN';
  patientId: string | null;
  verified: boolean;
  labId: string | null;
};

// Roles allowed on a route. Patients additionally need a verified ID unless @AllowUnverified().
export const Roles = (...roles: AuthUser['role'][]) => SetMetadata('roles', roles);
export const AllowUnverified = () => SetMetadata('allowUnverified', true);
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = String(request.headers?.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Missing access token');

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: { include: { patient: true } } },
    });
    if (!session || session.expiresAt < new Date()) throw new UnauthorizedException('Invalid session');

    const user: AuthUser = {
      userId: session.user.id,
      role: session.user.role,
      patientId: session.user.patient?.id ?? null,
      verified: Boolean(session.user.patient?.verifiedAt),
      labId: session.user.labId,
    };

    const handlers = [context.getHandler(), context.getClass()];
    const roles = this.reflector.getAllAndOverride<AuthUser['role'][]>('roles', handlers) ?? ['PATIENT'];
    if (!roles.includes(user.role)) throw new ForbiddenException('Not allowed');

    // "Nothing works until verified" is enforced here, not by hiding screens.
    const allowUnverified = this.reflector.getAllAndOverride<boolean>('allowUnverified', handlers);
    if (user.role === 'PATIENT' && !user.verified && !allowUnverified) {
      throw new ForbiddenException('ID verification required');
    }

    request.user = user;
    return true;
  }
}

const ITERATIONS = 120000;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string) {
  const candidate = hashPassword(password, salt).hash;
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

export const newToken = () => crypto.randomBytes(32).toString('hex');

export function normalizeIraqiPhone(value: unknown): string {
  const digits = String(value ?? '')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '');
  if (digits.startsWith('00964')) return `0${digits.slice(5)}`;
  if (digits.startsWith('964')) return `0${digits.slice(3)}`;
  if (digits.startsWith('7') && digits.length === 10) return `0${digits}`;
  return digits;
}

export const isIraqiMobile = (phone: string) => /^07\d{9}$/.test(phone);
