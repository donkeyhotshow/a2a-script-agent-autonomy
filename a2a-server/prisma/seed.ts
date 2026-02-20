import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Database Seed
 * Creates initial test data
 */

async function main() {
  // TODO: Implement seed data
  // 1. Create test client
  // 2. Create test project
  // 3. Create test session
  // 4. Log created data
  
  console.log('Seeding database...');

  // Create test client
  const testClient = await prisma.client.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Test Client',
      email: 'test@example.com',
      passwordHash: await hash('password123', 10),
      apiKey: `a2a_${uuidv4().replace(/-/g, '')}`,
      isActive: true,
    },
  });

  console.log('Created test client:', testClient.email);

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

  console.log('Created test project:', testProject.name);

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
