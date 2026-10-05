import { BadRequestException, Body, ConflictException, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { toPatientDto } from './auth.controller';
import { AllowUnverified, AuthGuard, type AuthUser, CurrentUser } from './common/auth';
import { PrismaService } from './common/prisma.service';
import { decodeDataUpload, saveFile } from './common/storage';

const IMAGE_TYPES = ['image/jpeg', 'image/png'];

@Controller('verification')
@UseGuards(AuthGuard)
export class VerificationController {
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
    const front = decodeDataUpload(body.front, IMAGE_TYPES);
    const back = decodeDataUpload(body.back, IMAGE_TYPES);

    const card = await this.ai.readIdCard(
      { mimeType: front.mimeType, base64: front.buffer.toString('base64') },
      { mimeType: back.mimeType, base64: back.buffer.toString('base64') },
    );
    if (card.nationalId.length < 8 || !card.nameAr) {
      throw new BadRequestException('تعذرت قراءة البطاقة الوطنية، أعد التصوير بإضاءة جيدة');
    }

    const owner = await this.prisma.patient.findUnique({ where: { nationalId: card.nationalId } });
    if (owner && owner.id !== user.patientId) {
      throw new ConflictException('هذه البطاقة مرتبطة بحساب آخر');
    }

    const patient = await this.prisma.patient.update({
      where: { id: user.patientId! },
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
