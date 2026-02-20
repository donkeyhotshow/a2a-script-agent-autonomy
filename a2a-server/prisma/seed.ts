import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Database Seed
 * Creates initial test data
 */

async function main() {
  console.log('Seeding database...');

  // Dev client: login dev@example.com / dev (used by web app default)
  const devClient = await prisma.client.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      id: 'dev-client',
      name: 'Dev Client',
      email: 'dev@example.com',
      passwordHash: await hash('dev', 10),
      apiKey: 'sk_a2a_dev_key',
      isActive: true,
    },
  });

  // Create test client
  const testClient = await prisma.client.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Test Client',
      email: 'test@example.com',
      passwordHash: await hash('password123', 10),
      apiKey: `sk_a2a_${uuidv4().replace(/-/g, '')}`,
      isActive: true,
    },
  });

  console.log('Created clients:', devClient.email, testClient.email);

  // Create test project (for dev client)
  const devProject = await prisma.project.upsert({
    where: { id: 'dev-project-id' },
    update: {},
    create: {
      id: 'dev-project-id',
      clientId: devClient.id,
      name: 'Dev Laravel Project',
      description: 'For SKIP_AUTH development',
      gitUrl: 'https://github.com/laravel/laravel.git',
      branch: 'main',
      status: 'PENDING_CLONE',
    },
  });

  // Create test project
  const testProject = await prisma.project.upsert({
    where: { id: 'test-project-id' },
    update: {},
    create: {
      id: 'test-project-id',
      clientId: testClient.id,
      name: 'Test Laravel Project',
      description: 'A test Laravel project for development',
      gitUrl: 'https://github.com/laravel/laravel.git',
      branch: 'main',
      status: 'PENDING_CLONE',
    },
  });

  console.log('Created projects:', devProject.name, testProject.name);

  // Create architectural features
  await prisma.architecturalFeature.createMany({
    data: [
      {
        projectId: testProject.id,
        feature: 'standard_laravel_structure',
        category: 'directory_structure',
      },
      {
        projectId: testProject.id,
        feature: 'eloquent_models',
        category: 'custom_pattern',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Created architectural features');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
