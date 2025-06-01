// clear-db.js (CommonJS version)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clear() {
  await prisma.application.deleteMany();
  await prisma.course.deleteMany();
  console.log('All documents deleted.');
}

clear().finally(() => prisma.$disconnect());
