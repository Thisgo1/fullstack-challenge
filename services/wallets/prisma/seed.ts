// services/wallets/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.wallet.upsert({
    where: { playerId: '9b5e9799-c6b8-453a-a693-589b5c2af71f' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      playerId: '9b5e9799-c6b8-453a-a693-589b5c2af71f',
      balance: 100000n,
    },
  });

  console.log('✅ Wallet seed concluído');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
