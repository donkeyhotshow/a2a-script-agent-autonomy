export class ClientRepository {
  async findById(_id: string): Promise<unknown> { return null; }
  async save(_data: unknown): Promise<void> {}
}
export const clientRepository = new ClientRepository();
