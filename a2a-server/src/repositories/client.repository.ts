import { Client } from '@prisma/client';
import { getPrismaClient } from '../config/database.js';

const prisma = () => getPrismaClient();

export async function createClient(data: {
  name: string;
  email: string;
  passwordHash: string;
  apiKey: string;
}): Promise<Client> {
  return prisma().client.create({ data });
}

export async function findClientById(id: string): Promise<Client | null> {
  return prisma().client.findUnique({ where: { id } });
}

export async function findClientByEmail(email: string): Promise<Client | null> {
  return prisma().client.findUnique({ where: { email } });
}

export async function findClientByApiKey(apiKey: string): Promise<Client | null> {
  return prisma().client.findFirst({
    where: { apiKey, isActive: true },
  });
}

export async function updateClient(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    passwordHash: string;
    apiKey: string;
    isActive: boolean;
  }>
): Promise<Client> {
  return prisma().client.update({ where: { id }, data });
}

export async function deleteClient(id: string): Promise<void> {
  await prisma().client.delete({ where: { id } });
}

export async function emailExists(email: string): Promise<boolean> {
  const c = await prisma().client.findUnique({ where: { email } });
  return c !== null;
}

export async function deactivateClient(id: string): Promise<Client> {
  return prisma().client.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function regenerateApiKey(
  id: string,
  newApiKey: string
): Promise<Client> {
  return prisma().client.update({
    where: { id },
    data: { apiKey: newApiKey },
  });
}
