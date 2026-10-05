// Demo directory + one lab with a login. Safe to re-run: it skips rows that exist.
import 'dotenv/config';
import { PrismaService } from '../src/common/prisma.service';
import { hashPassword } from '../src/common/auth';

const HOSPITALS = [
  { name: 'مستشفى السفير', location: 'بغداد، الكرادة', phone: '+964 780 222 3333' },
  { name: 'مستشفى الملكي', location: 'بغداد، حي الجامعة', phone: '+964 780 333 4444' },
  { name: 'مستشفى القمة', location: 'بغداد، زيونة', phone: '+964 780 777 8888' },
];

const DOCTORS = [
  { nameAr: 'د. سارة علي', name: 'Dr. Sara Ali', specialtyAr: 'باطنية', specialty: 'Internal Medicine', phone: '+964 770 000 0001' },
  { nameAr: 'د. أحمد حسن', name: 'Dr. Ahmed Hassan', specialtyAr: 'قلبية', specialty: 'Cardiology', phone: '+964 770 000 0002' },
  { nameAr: 'د. زينب كريم', name: 'Dr. Zainab Kareem', specialtyAr: 'أطفال', specialty: 'Pediatrics', phone: '+964 770 000 0003' },
];

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();

  if ((await prisma.hospital.count()) === 0) {
    const hospitals = await Promise.all(HOSPITALS.map(data => prisma.hospital.create({ data })));
    await Promise.all(
      DOCTORS.map((d, i) => prisma.doctor.create({ data: { ...d, hospitalId: hospitals[i % hospitals.length].id } })),
    );
  }

  const username = process.env.SEED_LAB_USERNAME ?? 'lab1';
  const password = process.env.SEED_LAB_PASSWORD;
  if (!password) throw new Error('Set SEED_LAB_PASSWORD in .env');
  if (!(await prisma.user.findUnique({ where: { username } }))) {
    const lab = await prisma.lab.create({ data: { name: 'مختبر كيور التجريبي', location: 'بغداد، المنصور', phone: '+964 780 111 2222' } });
    const { hash, salt } = hashPassword(password);
    await prisma.user.create({ data: { role: 'LAB', username, passwordHash: hash, passwordSalt: salt, labId: lab.id } });
  }

  console.log('Seed done. Lab login:', username);
  await prisma.$disconnect();
}

void main();
