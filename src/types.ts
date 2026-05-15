export enum MovementType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum ProductStatus {
  BUENO = 'Bueno',
  MALO = 'Malo',
  INSTALADO = 'Instalado',
}

export interface Location {
  id?: string;
  nombreCliente: string;
  region: string;
  ciudad: string;
  centro: string;
  createdAt: any;
  createdBy: string;
}

export interface Product {
  id?: string; // This will be the same as 'serie'
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  estado: ProductStatus;
  profundidad?: number;
  ubicacionId: string;
  fechaCalibracion?: string;
  documentoCalibracionUrl?: string;
  createdAt: any;
  updatedAt?: any;
  createdBy: string;
}

export interface Movement {
  id?: string;
  productId: string;
  productName: string;
  type: MovementType;
  timestamp: any;
  description: string;
  userEmail: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
