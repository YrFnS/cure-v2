// Create a lab (shown in the directory) and its first login.
//   npm run lab:create -- --name "مختبر النور" --username alnoor --location "بغداد، الكرادة" --phone "+964 770 000 0000"
// Add another login to an existing lab: same command with --lab-id <id> instead of --name.
// The generated password is printed once; hand it to the lab and do not store it elsewhere.
import 'dotenv/config';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';
import { hashPassword } from '../src/common/auth';
import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' },
      'lab-id': { type: 'string' },
      username: { type: 'string' },
      location: { type: 'string', default: '' },
      phone: { type: 'string', default: '' },
    },
  });
  const username = values.username?.trim();
  if (!username || !/^[A-Za-z0-9._-]{3,32}$/.test(username)) throw new Error('--username: 3-32 chars, letters/digits/._-');
  if (!values.name && !values['lab-id']) throw new Error('Pass --name for a new lab or --lab-id for an existing one');

  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    if (await prisma.user.findUnique({ where: { username } })) throw new Error(`Username "${username}" is taken`);

    const lab = values['lab-id']
      ? await prisma.lab.findUniqueOrThrow({ where: { id: values['lab-id'] } })
      : await prisma.lab.create({ data: { name: values.name!.trim(), location: values.location!, phone: values.phone! } });

    const password = crypto.randomBytes(9).toString('base64url');
    const { hash, salt } = hashPassword(password);
    await prisma.user.create({ data: { role: 'LAB', username, passwordHash: hash, passwordSalt: salt, labId: lab.id } });

    console.log(`Lab:      ${lab.name} (${lab.id})`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
