import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
const ALGORITHM = 'aes-256-cbc';

function decrypt(text: string): string {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      // Fallback to environment variable
      return process.env[key.toUpperCase()] || defaultValue;
    }

    return setting.isEncrypted ? decrypt(setting.value) : setting.value;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return process.env[key.toUpperCase()] || defaultValue;
  }
}

export async function getSettings(category: string): Promise<Record<string, string>> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { category },
    });

    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.isEncrypted ? decrypt(setting.value) : setting.value;
    }

    return result;
  } catch (error) {
    console.error(`Error getting settings for category ${category}:`, error);
    return {};
  }
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const value = await getSetting(key, 'false');
  return value === 'true';
}
