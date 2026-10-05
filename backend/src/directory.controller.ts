import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from './common/auth';
import { PrismaService } from './common/prisma.service';

// Display-only directory (hospitals, labs, doctors), managed by admins via the seed/DB. No booking.
const toHospital = (h: { id: string; name: string; location: string; phone: string }) => ({ ...h, status: 'linked' });

const toDoctor = (d: any, hospitals: Map<string, any>) => {
  const hospital = d.hospitalId ? hospitals.get(d.hospitalId) : null;
  return {
    id: d.id,
    name: d.name || d.nameAr,
    nameAr: d.nameAr,
    specialty: d.specialty || d.specialtyAr,
    specialtyAr: d.specialtyAr,
    department: d.specialty || d.specialtyAr,
    departmentAr: d.specialtyAr,
    phone: d.phone,
    photo: d.photo ?? undefined,
    hospitalId: d.hospitalId,
    hospitalName: hospital?.name ?? null,
    hospitalLocation: hospital?.location ?? null,
    availableDays: [],
  };
};

@Controller()
@UseGuards(AuthGuard)
export class DirectoryController {
  constructor(private readonly prisma: PrismaService) {}

  // Labs are listed with hospitals so the existing hospitals screen shows both.
  private async places() {
    const [hospitals, labs] = await Promise.all([this.prisma.hospital.findMany(), this.prisma.lab.findMany()]);
    return [...hospitals, ...labs].map(toHospital);
  }

  @Get('hospitals')
  hospitals() {
    return this.places();
  }

  @Get('hospitals/:id')
  async hospital(@Param('id') id: string) {
    const place = (await this.places()).find(p => p.id === id);
    if (!place) throw new NotFoundException('غير موجود');
    return place;
  }

  @Get('doctors')
  async doctors(@Query('search') search?: string, @Query('specialty') specialty?: string) {
    const hospitals = new Map((await this.prisma.hospital.findMany()).map(h => [h.id, h]));
    const doctors = await this.prisma.doctor.findMany({
      where: {
        AND: [
          search ? { OR: [{ nameAr: { contains: search } }, { name: { contains: search } }] } : {},
          specialty ? { OR: [{ specialtyAr: specialty }, { specialty }] } : {},
        ],
      },
    });
    return doctors.map(d => toDoctor(d, hospitals));
  }

  @Get('doctors/:id')
  async doctor(@Param('id') id: string) {
    const d = await this.prisma.doctor.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('غير موجود');
    const hospitals = new Map((await this.prisma.hospital.findMany()).map(h => [h.id, h]));
    return toDoctor(d, hospitals);
  }
}
