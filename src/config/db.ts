import { PrismaClient } from '@prisma/client';

// Direct connection string to avoid Linux resolv.conf SRV parsing error on Hostinger
const DIRECT_DATABASE_URL =
  'mongodb://gensols:gensols123@ac-qctsady-shard-00-00.rqaucdt.mongodb.net:27017,ac-qctsady-shard-00-01.rqaucdt.mongodb.net:27017,ac-qctsady-shard-00-02.rqaucdt.mongodb.net:27017/EventConnect?ssl=true&replicaSet=atlas-843x2v-shard-0&authSource=admin';

const dbUrl =
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('+srv') &&
  !process.env.DATABASE_URL.includes('wZ3F1eE3zZ2h8pXw')
    ? process.env.DATABASE_URL
    : DIRECT_DATABASE_URL;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
