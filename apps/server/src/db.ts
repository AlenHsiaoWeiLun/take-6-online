import { PrismaClient } from '@prisma/client';
import { features } from './env';

export const prisma = features.db ? new PrismaClient() : null;
