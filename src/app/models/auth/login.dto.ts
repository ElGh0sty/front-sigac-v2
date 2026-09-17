// src/app/models/auth/login.dto.ts
export interface LoginDto {
  username: string;
  password: string;
}

export interface UserDto {
  id: number;
  username: string;
  token: string;
  rol: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
}
