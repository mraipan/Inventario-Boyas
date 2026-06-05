export enum MovementType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum ProductHealth {
  BUENO = 'Bueno',
  DEFECTUOSO = 'Defectuoso',
}

export interface Location {
  id?: string;
  nombreCliente: string;
  region: string;
  ciudad: string;
  centro: string;
  acs?: string;
  createdAt: any;
  createdBy: string;
}

export interface Product {
  id?: string; // This will be the same as 'serie'
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  estado?: string;
  estadoSalud?: ProductHealth;
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
  ubicacionName?: string;
}

export interface AppUser {
  id?: string;
  nombre: string;
  correo: string;
  telefono: string;
  contrasena?: string;
  cargo: 'Administrador' | 'Soporte' | 'Técnico';
  createdAt: any;
  createdBy: string;
}

export interface ChecklistReport {
  id?: string;
  ubicacionId: string;
  ubicacionCentro: string;
  ubicacionCliente: string;
  cambioSensores: boolean;
  limpiezaSensores: boolean;
  cambioTarjetaLora: boolean;
  cambioCableConexion: boolean;
  cambioPanelesSolares: boolean;
  reemplazoBateriaBoya: boolean;
  reemplazoBateriaAdcp: boolean;
  observaciones?: string;
  createdAt: any;
  createdBy: string;
  creadoPorNombre: string;
  creadoPorEmail: string;
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
