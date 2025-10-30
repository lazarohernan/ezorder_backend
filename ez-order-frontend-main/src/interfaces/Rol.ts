export interface Rol {
  id: number;
  rol: string;
}

export interface RolResponse {
  success: boolean;
  data?: Rol;
  message?: string;
}

export interface RolesResponse {
  success: boolean;
  data?: Rol[];
  message?: string;
}

export interface CreateRolDto {
  rol: string;
}

export interface UpdateRolDto {
  rol: string;
}
