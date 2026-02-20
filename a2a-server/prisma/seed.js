"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = require("bcrypt");
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
/**
 * Database Seed
 * Creates initial test data
 */
async function main() {
    console.log('Seeding database...');
    // Dev client for SKIP_AUTH=1
    const devClient = await prisma.client.upsert({
        where: { email: 'dev@localhost' },
        update: {},
        create: {
            id: 'dev-client',
            name: 'Dev Client',
            email: 'dev@localhost',
            passwordHash: await (0, bcrypt_1.hash)('dev', 10),
            apiKey: 'sk_a2a_dev_key',
            isActive: true,
        },
    });
    // Create test client
    const testClient = await prisma.client.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            id: (0, uuid_1.v4)(),
            name: 'Test Client',
            email: 'test@example.com',
            passwordHash: await (0, bcrypt_1.hash)('password123', 10),
            apiKey: `sk_a2a_${(0, uuid_1.v4)().replace(/-/g, '')}`,
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
//# sourceMappingURL=seed.js.map