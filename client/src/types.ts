export type Role = 'SUPER_ADMIN' | 'WORKER';
export type UserStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface UserLicense {
  hasLicense: boolean;
  isActive: boolean;
  status: string;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
  planName: string;
  isExpired: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  nationalId: string;
  phone: string;
  address: string;
  role: Role;
  status: UserStatus;
  createdAt?: string;
  license?: UserLicense;
  _count?: {
    clientas: number;
    servicios: number;
    citas: number;
  };
}

export interface Clienta {
  id: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  notas?: string;
  foto?: string;
  createdAt?: string;
  _count?: {
    citas: number;
  };
  citas?: Cita[];
}

export interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  duracion: number;
  color: string;
  activo: boolean;
}

export interface Cita {
  id: string;
  workerId?: string;
  clientaId: string;
  servicioId: string;
  fechaHora: string;
  duracionMinutos: number;
  estado: AppointmentStatus;
  precioCobrado: number;
  notas?: string;
  clienta?: Clienta;
  servicio?: Servicio;
  createdAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  maxWorkers: number;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  metadata?: any;
  createdAt: string;
  actor?: {
    firstName: string;
    lastName: string;
    nationalId: string;
    role: string;
  };
}
