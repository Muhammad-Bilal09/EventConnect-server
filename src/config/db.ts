import { PrismaClient } from '@prisma/client';

const DEFAULT_DATABASE_URL =
  'mongodb+srv://gensols:gensols123@cluster0.rqaucdt.mongodb.net/EventConnect?appName=Cluster0';

const dbUrl =
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('wZ3F1eE3zZ2h8pXw')
    ? process.env.DATABASE_URL
    : DEFAULT_DATABASE_URL;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
