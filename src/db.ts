import { config } from "dotenv";
import { PrismaClient } from '@prisma/client';

config({ override: true });

export const prisma = new PrismaClient();
