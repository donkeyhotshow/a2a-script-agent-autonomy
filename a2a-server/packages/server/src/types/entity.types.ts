// [STUB] entity.types — requires real implementation
export interface Entity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

export type EntityId = string;
