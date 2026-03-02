import {PrismaClient} from '@prisma/client';
import {hash} from 'bcrypt';
import {v4 as uuidv4} from 'uuid';

const prisma = new PrismaClient();

/**
 * Database Seed
 * Creates initial test data
 */

async function main() {
    console.log('Seeding database...');

    const devPwdHash = await hash('dev', 10);
    const testPwdHash = await hash('password123', 10);
    const testApiKey = `sk_a2a_${uuidv4().replace(/-/g, '')}`;

    try {
        await prisma.client.create({
            data: {
                id: 'dev-client',
                name: 'Dev Client',
                email: 'dev@example.com',
                passwordHash: devPwdHash,
                apiKey: 'sk_a2a_dev_key',
                isActive: true,
            },
        });
    } catch (e: any) {
        if (e?.code !== 'P2002') throw e;
    }
    const devClient = await prisma.client.findFirst({
        where: {OR: [{id: 'dev-client'}, {email: 'dev@example.com'}, {apiKey: 'sk_a2a_dev_key'}]},
    });
    if (!devClient) throw new Error('Dev client not found - run migrations first');

    try {
        await prisma.client.create({
            data: {
                id: uuidv4(),
                name: 'Test Client',
                email: 'test@example.com',
                passwordHash: testPwdHash,
                apiKey: testApiKey,
                isActive: true,
            },
        });
    } catch (e: any) {
        if (e?.code !== 'P2002') throw e;
    }
    const testClient = await prisma.client.findFirst({where: {email: 'test@example.com'}});
    if (!testClient) throw new Error('Test client not found');
    console.log('Created clients:', devClient.email, testClient.email);

    // Default project - matches vite-plugin loadProjects fallback (id: 'default')
    const defaultProject = await prisma.project.upsert({
        where: {id: 'default'},
        update: {},
        create: {
            id: 'default',
            clientId: devClient.id,
            name: 'Workspace',
            description: 'Default workspace for dev client',
            gitUrl: 'file://.',
            branch: 'main',
            status: 'PENDING_CLONE',
        },
    });

    // Create test project (for dev client)
    const devProject = await prisma.project.upsert({
        where: {id: 'dev-project-id'},
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
        where: {id: 'test-project-id'},
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

    console.log('Created projects:', defaultProject.name, devProject.name, testProject.name);

    // Create architectural features
    await prisma.architecturalFeature.createMany({
        data: [
            {
                id: 'af_1',
                projectId: testProject.id,
                feature: 'standard_laravel_structure',
                category: 'directory_structure'
            },
            {id: 'af_2', projectId: testProject.id, feature: 'eloquent_models', category: 'custom_pattern'},
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
