import { BadRequestException, Body, ConflictException, Controller, Get, HttpException, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { toPatientDto } from './auth.controller';
import { AllowUnverified, AuthGuard, type AuthUser, CurrentUser } from './common/auth';
import { PrismaService } from './common/prisma.service';
import { decodeDataUpload, saveFile } from './common/storage';
import { within } from './common/within';

const IMAGE_TYPES = ['image/jpeg', 'image/png'];
// Longer than this and the card is read in the background; the app polls GET /verification/id.
const WAIT_MS = 5000;

type Check = { state: 'pending' } | { state: 'failed'; message: string };

@Controller('verification')
@UseGuards(AuthGuard)
export class VerificationController {
  // shortcut: in-memory, so a restart forgets a pending read (the app falls back to the upload screen)
  // and only one instance may run; move to the database together with #9.
  private readonly checks = new Map<string, Check>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  // Front + back of the Iraqi national ID → AI reads the card → profile filled → verified.
  // ponytail: a readable card is accepted as verification. Add a liveness/selfie or admin
  // review step before launch if forged cards become a concern.
  @Post('id')
  @AllowUnverified()
  async verifyId(@CurrentUser() user: AuthUser, @Body() body: { front?: string; back?: string }) {
    if (user.verified) throw new BadRequestException('الحساب موثق مسبقاً');
    const patientId = user.patientId!;
    if (this.checks.get(patientId)?.state === 'pending') return { status: 'pending' };
    const front = decodeDataUpload(body.front, IMAGE_TYPES);
    const back = decodeDataUpload(body.back, IMAGE_TYPES);

    this.checks.set(patientId, { state: 'pending' });
    const run = this.readCard(patientId, front, back).then(
      patient => {
        this.checks.delete(patientId);
        return patient;
      },
      error => {
        const message = error instanceof HttpException ? error.message : 'تعذر توثيق البطاقة، حاول مرة أخرى';
        this.checks.set(patientId, { state: 'failed', message });
        throw error;
      },
    );
    run.catch(() => {}); // a failure after the wait is reported through GET, not as an unhandled rejection

    try {
      const patient = await within(run, WAIT_MS);
      return patient ? { status: 'verified', patient } : { status: 'pending' };
    } catch (error) {
      this.checks.delete(patientId); // reported right here, so GET must not report it again
      throw error;
    }
  }

  @Get('id')
  @AllowUnverified()
  async status(@CurrentUser() user: AuthUser) {
    const patientId = user.patientId!;
    if (user.verified) {
      const patient = await this.prisma.patient.findUniqueOrThrow({ where: { id: patientId }, include: { user: true } });
      return { status: 'verified', patient: toPatientDto(patient, patient.user.phone) };
    }
    const check = this.checks.get(patientId);
    if (check?.state === 'failed') this.checks.delete(patientId);
    return check ? { status: check.state, message: check.state === 'failed' ? check.message : undefined } : { status: 'none' };
  }

  private async readCard(
    patientId: string,
    front: ReturnType<typeof decodeDataUpload>,
    back: ReturnType<typeof decodeDataUpload>,
  ) {
    const card = await this.ai.readIdCard(
      { mimeType: front.mimeType, base64: front.buffer.toString('base64') },
      { mimeType: back.mimeType, base64: back.buffer.toString('base64') },
    );
    // The national number becomes the MRN, so anything but its 12 digits is a misread.
    if (card.nationalId.length !== 12 || !card.nameAr) {
      throw new BadRequestException('تعذرت قراءة البطاقة الوطنية، أعد التصوير بإضاءة جيدة');
    }

    const owner = await this.prisma.patient.findUnique({ where: { nationalId: card.nationalId } });
    if (owner && owner.id !== patientId) {
      throw new ConflictException('هذه البطاقة مرتبطة بحساب آخر');
    }

    const patient = await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        ...card,
        idFrontPath: await saveFile('id-cards', front.mimeType, front.buffer),
        idBackPath: await saveFile('id-cards', back.mimeType, back.buffer),
        verifiedAt: new Date(),
      },
      include: { user: true },
    });
    return toPatientDto(patient, patient.user.phone);
  }
}
