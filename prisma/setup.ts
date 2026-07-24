import { PrismaClient } from '@prisma/client';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const prisma = new PrismaClient();
  const migrationsDir = join(process.cwd(), 'prisma/migrations');
  const migrations = (await readdir(migrationsDir)).sort();
  for (const migration of migrations) {
    const sql = await readFile(join(migrationsDir, migration, 'migration.sql'), 'utf8');
    for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
      try { await prisma.$executeRawUnsafe(statement); }
      catch (error) {
        if (!(error instanceof Error) || !error.message.includes('duplicate column name')) throw error;
      }
    }
  }
  await prisma.$disconnect();
  console.log('Banco criado com sucesso.');
}
main().catch((error) => { console.error(error); process.exit(1); });
