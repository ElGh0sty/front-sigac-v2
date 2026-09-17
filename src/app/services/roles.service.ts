import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { getApiBase } from '../api';
import { AuthService } from './auth.service';

export type RolSistema = 'Administrador' | 'Decano' | 'Coordinador' | 'Docente' | 'Estudiante';

export interface JerarquiaRolInfo {
  rol: RolSistema;
  nivel: number;
  descripcion: string;
  puedeGestionar: RolSistema[];
}

export interface AsignarRolDto {
  rol: string;
}

export interface ActualizarRolesDto {
  roles: string[];
}

export interface RespuestaAsignacionRol {
  success: boolean;
  mensaje: string;
  userId: number;
  nuevoRol: string;
  asignadoPor?: string;
  fecha: string;
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  getRoles(): string[] {
    return this.authService.getRoles();
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.authService.hasAnyRole(roles);
  }

  private get apiUrl() {
    return `${getApiBase()}/api/roles`;
  }

  // Jerarquía del sistema universitario: Administrador -> Decano -> Coordinador -> Docente -> Estudiante
  public readonly jerarquia: Record<RolSistema, JerarquiaRolInfo> = {
    Administrador: {
      rol: 'Administrador',
      nivel: 5,
      descripcion: 'Control total de la plataforma, parametrización y asignación de todos los roles.',
      puedeGestionar: ['Decano', 'Coordinador', 'Docente', 'Estudiante']
    },
    Decano: {
      rol: 'Decano',
      nivel: 4,
      descripcion: 'Máxima autoridad de facultad, conforma tribunales y aprueba resoluciones.',
      puedeGestionar: ['Coordinador', 'Docente', 'Estudiante']
    },
    Coordinador: {
      rol: 'Coordinador',
      nivel: 3,
      descripcion: 'Valida postulaciones, verifica requisitos (50% malla, promedios) y convoca tribunales.',
      puedeGestionar: ['Docente', 'Estudiante']
    },
    Docente: {
      rol: 'Docente',
      nivel: 2,
      descripcion: 'Docente titular y miembros expertos evaluadores de cátedras.',
      puedeGestionar: ['Estudiante']
    },
    Estudiante: {
      rol: 'Estudiante',
      nivel: 1,
      descripcion: 'Alumnos regulares y postulantes a ayudantías de cátedra.',
      puedeGestionar: []
    }
  };

  /**
   * PUT /api/roles/{userId}
   * Requiere JWT (enviado por auth.interceptor)
   * Asigna roles respetando la jerarquía universitaria
   */
  asignarRol(userId: number, nuevoRol: RolSistema | string): Observable<RespuestaAsignacionRol> {
    const body: AsignarRolDto = { rol: nuevoRol };
    return this.http.put<any>(`${this.apiUrl}/${userId}`, body).pipe(
      map((res: any) => ({
        success: true,
        mensaje: res?.message || res?.mensaje || `Rol '${nuevoRol}' asignado exitosamente al usuario #${userId}.`,
        userId,
        nuevoRol: String(nuevoRol),
        asignadoPor: localStorage.getItem('username') || 'Sistema',
        fecha: new Date().toISOString()
      })),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * PUT /api/roles/{userId}
   * Reemplaza la lista de roles del usuario.
   * Body: { roles: [...] } (forma preferida) o { rol: "..." } legacy.
   */
  actualizarRoles(userId: number, roles: string[]): Observable<string> {
    const body: ActualizarRolesDto = { roles };
    return this.http.put<any>(`${this.apiUrl}/${userId}`, body).pipe(
      map((res: any) => String(res?.message || res?.mensaje || 'Roles actualizados correctamente.')),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * Valida si el rol del emisor tiene jerarquía suficiente para asignar el rol de destino
   */
  puedeAsignarRol(rolEmisor: string, rolDestino: string): boolean {
    const emisorInfo = this.jerarquia[rolEmisor as RolSistema];
    const destinoInfo = this.jerarquia[rolDestino as RolSistema];

    if (!emisorInfo || !destinoInfo) return false;
    return emisorInfo.nivel > destinoInfo.nivel;
  }

  /**
   * Lista ordenada de roles según su jerarquía institucional
   */
  getListaRoles(): RolSistema[] {
    return ['Administrador', 'Decano', 'Coordinador', 'Docente', 'Estudiante'];
  }
}
