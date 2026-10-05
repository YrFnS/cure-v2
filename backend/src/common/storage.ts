import { BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// ID scans and lab PDFs are sensitive: kept outside any static route, served only
// through authenticated handlers.
// ponytail: local disk on the VPS; move to object storage when there is more than one server.
const ROOT = path.resolve(process.env.STORAGE_DIR ?? 'storage');

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

export function decodeDataUpload(input: unknown, allowed: string[]): { mimeType: string; buffer: Buffer } {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(input ?? ''));
  if (!match || !allowed.includes(match[1])) {
    throw new BadRequestException(`File must be one of: ${allowed.join(', ')}`);
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw new BadRequestException('Empty file');
  return { mimeType: match[1], buffer };
}

export async function saveFile(folder: string, mimeType: string, buffer: Buffer): Promise<string> {
  const relative = path.join(folder, `${crypto.randomUUID()}${ALLOWED[mimeType] ?? ''}`);
  await fs.mkdir(path.join(ROOT, folder), { recursive: true });
  await fs.writeFile(path.join(ROOT, relative), buffer);
  return relative;
}

export const readFile = (relative: string) => fs.readFile(path.join(ROOT, relative));
