import { prisma } from '../src/lib/db';
import { hashCredential, validateCredential } from '../src/lib/auth';

async function main() {
  const password = process.env.OWNER_PASSWORD ?? '';
  const problem = validateCredential('admin', password);
  if (problem) throw new Error(problem);

  const passwordHash = await hashCredential(password);
  await prisma.staffUser.upsert({
    where: { login: 'admin' },
    update: { passwordHash, credVersion: 2, isActive: true, role: 'admin' },
    create: { login: 'admin', name: 'Администратор', role: 'admin', passwordHash, credVersion: 2 },
  });
  await prisma.staffSession.deleteMany({});
  console.log('Владелец создан/обновлён, все сессии сброшены.');
}
main().finally(() => prisma.$disconnect());
