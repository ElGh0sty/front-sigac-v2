import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { API_BASE, getApiBase } from '../api';

export interface LoginDto {
  username?: string;
  email?: string;
  correo?: string;
  password: string;
}

export interface UserDto {
  id: number;
  username: string;
  token: string;
  accessToken?: string;
  access_token?: string;
  rol?: string;
  role?: string;
  roles?: string[];
  Roles?: string[];
  nombre?: string;
  apellido?: string;
  correo?: string;
  email?: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
}

export interface PersonaDto {
  id?: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol?: string;
  telefono?: string;
  direccion?: string;
  biografia?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  private get loginUrl() {
    const base = getApiBase();
    return base ? `${base}/api/Login/login` : '/api/Login/login';
  }

  private get registerUrl() {
    const base = getApiBase();
    return base ? `${base}/api/Login/register` : '/api/Login/register';
  }

  private get personaUrl() {
    const base = getApiBase();
    return base ? `${base}/api/Persona` : '/api/Persona';
  }

  private guardarSesionDesdeRespuesta(res: any, fallbackUsername?: string): void {
    const token = res?.token || res?.Token || res?.accessToken || res?.access_token || res?.AccessToken || null;
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
    }

    const rolesArray: string[] = res?.roles || res?.Roles || (res?.rol ? [res.rol] : res?.Rol ? [res.Rol] : []);
    const rolPrincipal = res?.rol || res?.Rol || (rolesArray.length > 0 ? rolesArray[0] : 'Estudiante');
    localStorage.setItem('rol', rolPrincipal);
    if (rolesArray.length > 0) {
      localStorage.setItem('roles', JSON.stringify(rolesArray));
    }

    const username = res?.username || res?.Username || fallbackUsername || 'usuario';
    const estudianteId = res?.estudianteId ?? res?.EstudianteId;
    const personaId = res?.personaId ?? res?.PersonaId;
    const id = estudianteId ?? res?.id ?? res?.Id ?? res?.userId ?? res?.UserId ?? personaId;
    const nombre = res?.nombre || res?.Nombre || '';
    const apellido = res?.apellido || res?.Apellido || '';
    const correo = res?.correo || res?.Correo || res?.email || res?.Email || (fallbackUsername && fallbackUsername.includes('@') ? fallbackUsername : `${fallbackUsername || username}@uteq.edu.ec`);

    localStorage.setItem('username', username);
    if (id !== undefined && id !== null) {
      localStorage.setItem('userId', String(id));
    }
    if (estudianteId !== undefined && estudianteId !== null) {
      localStorage.setItem('estudianteId', String(estudianteId));
    } else if ((rolPrincipal === 'Estudiante' || rolPrincipal === 'Ayudante') && id && Number(id) !== 1) {
      localStorage.setItem('estudianteId', String(id));
    }
    if (nombre) localStorage.setItem('nombre', nombre);
    if (apellido) localStorage.setItem('apellido', apellido);
    if (correo) localStorage.setItem('correo', correo);
  }

  login(credentials: LoginDto): Observable<UserDto> {
    this.limpiarDatosResidualesSesion();

    const rawId = (credentials.username || credentials.email || credentials.correo || '').trim();

    const payload = {
      username: rawId,
      password: credentials.password
    };

    return this.http.post<any>(this.loginUrl, payload).pipe(
      tap((res: any) => {
        if (res && (res.token || res.Token || res.accessToken || res.AccessToken)) {
          this.guardarSesionDesdeRespuesta(res, rawId);
        }
      }),
      map((res: any) => {
        const user: UserDto = {
          id: Number(res?.id ?? res?.Id ?? 0),
          username: String(res?.username ?? res?.Username ?? rawId),
          token: String(res?.token ?? res?.Token ?? res?.accessToken ?? res?.access_token ?? ''),
          rol: String(res?.rol ?? res?.Rol ?? res?.role ?? res?.Role ?? 'Usuario'),
          roles: Array.isArray(res?.roles) ? res.roles : (Array.isArray(res?.Roles) ? res.Roles : []),
          nombre: String(res?.nombre ?? res?.Nombre ?? ''),
          apellido: String(res?.apellido ?? res?.Apellido ?? ''),
          correo: String(res?.correo ?? res?.Correo ?? res?.email ?? res?.Email ?? rawId)
        };

        if (!user.token) {
          throw new Error('No se recibiÃ³ token JWT vÃ¡lido del backend.');
        }

        return user;
      }),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  /**
   * POST /api/Login/forgot-password (o /recuperar-password)
   * Solicitar cÃ³digo o enlace de recuperaciÃ³n con { email: string }
   */
  forgotPassword(email: string): Observable<any> {
   const base = getApiBase();
   const primaryUrl = base ? `${base}/api/Login/forgot-password` : '/api/Login/forgot-password';
   const altUrl = base ? `${base}/api/Login/recuperar-password` : '/api/Login/recuperar-password';

   return this.http.post(primaryUrl, { email }).pipe(
     catchError(() => this.http.post(altUrl, { email, correo: email }))
   );
  }

  /**
   * POST /api/Login/reset-password
   * Restablecer clave con { email: string, token: string, newPassword: string }
   */
  resetPassword(payload: { email: string; token: string; newPassword: string }): Observable<any> {
   const base = getApiBase();
   const url = base ? `${base}/api/Login/reset-password` : '/api/Login/reset-password';
   return this.http.post(url, payload);
  }


  register(dto: RegisterDto): Observable<UserDto> {
   return this.http.post<UserDto>(this.registerUrl, dto).pipe(
     tap((response: UserDto) => {
       if (response && (response.token || response.accessToken || response.access_token)) {
         const token = response.token || response.accessToken || response.access_token || '';
         if (token) {
           localStorage.setItem('token', token);
           localStorage.setItem('accessToken', token);
         }
         localStorage.setItem('rol', response.rol || '');
         localStorage.setItem('username', response.username);
         localStorage.setItem('userId', response.id ? response.id.toString() : '');
         if (response.nombre) localStorage.setItem('nombre', response.nombre);
         if (response.apellido) localStorage.setItem('apellido', response.apellido);
         if (response.correo) localStorage.setItem('correo', response.correo);
       }
     })
   );
  }

  getPersona(): Observable<PersonaDto> {
   return this.http.get<PersonaDto>(this.personaUrl);
  }

  updatePersona(persona: Partial<PersonaDto>): Observable<PersonaDto> {
   if (persona.nombre) localStorage.setItem('nombre', persona.nombre);
   if (persona.apellido) localStorage.setItem('apellido', persona.apellido);
   if (persona.correo) localStorage.setItem('correo', persona.correo);

   return this.http.put<PersonaDto>(this.personaUrl, persona);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('rol');
    localStorage.removeItem('roles');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('nombre');
    localStorage.removeItem('apellido');
    localStorage.removeItem('correo');

    const llavesSesion = [
      'sigac_convocatorias_pendientes',
      'sigac_convocatorias_publicadas',
      'sigac_ayudantias_publicadas',
      'sigac_postulaciones_v2',
      'sigac_bitacoras_v2'
    ];
    llavesSesion.forEach(k => localStorage.removeItem(k));

    // No eliminamos las clases/materias creadas ni los docentes persistidos del sistema,
    // porque esas son entidades de dominio y deben seguir visibles tras logout/re-login.
    this.limpiarDatosResidualesSesion();
  }

  /**
   * Limpia el localStorage de datos residuales o mocks de sesiones anteriores
   */
  limpiarDatosResidualesSesion(): void {
    if (typeof window === 'undefined') return;
    const llavesResiduales = [
      'sigac_estudiante_materias_real',
      'sigac_recursos_v2',
      'sigac_actividades_v2',
      'sigac_asistencias_v2',
      'sigac_temas_v2',
      'sigac_sesiones_v2',
      'sigac_planificaciones_v2',
      'sigac_ocupaciones_v2',
      'sigac_postulaciones_v2',
      'sigac_bitacoras_v2'
    ];

    llavesResiduales.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('sigac_') ||
          key.startsWith('materias_') ||
          key.startsWith('recursos_') ||
          key.startsWith('actividades_') ||
          key.startsWith('asistencias_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  private decodeJwtPayload(token: string): any | null {
    if (!token || !token.includes('.')) return null;
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.length % 4 === 0 ? normalized : normalized + '='.repeat(4 - (normalized.length % 4));
      const decoded = atob(padded);
      return JSON.parse(decodeURIComponent(
        decoded.split('').map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join('')
      ));
    } catch {
      return null;
    }
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      this.logout();
      return false;
    }

    const exp = Number(payload.exp);
    if (Number.isFinite(exp) && Date.now() >= exp * 1000) {
      this.logout();
      return false;
    }

    const nbf = Number(payload.nbf);
    if (Number.isFinite(nbf) && Date.now() < nbf * 1000) {
      this.logout();
      return false;
    }

    const roleClaims = payload.role || payload.roles || payload.Roles || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    if (roleClaims === undefined && !localStorage.getItem('roles') && !localStorage.getItem('rol')) {
      this.logout();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    return localStorage.getItem('token') || localStorage.getItem('accessToken');
  }

  getAccessToken(): string | null {
    return this.getToken();
  }

  getRol(): string | null {
    return localStorage.getItem('rol');
  }

  getRole(): string | null {
   const directRole = this.getRol();
   if (directRole) return directRole;
   const storedRoles = localStorage.getItem('roles');
   if (!storedRoles) return null;
   try {
     const parsed = JSON.parse(storedRoles);
     if (Array.isArray(parsed) && parsed.length > 0) {
       return String(parsed[0]).trim();
     }
   } catch {}
   return storedRoles.split(/[;,|]/)[0]?.trim() || null;
  }

  /**
   * Obtiene la lista unificada de todos los roles asignados al usuario actual.
   * Lee desde:
   * 1. Claims del JWT decodificado ('role', 'roles', schema claim de .NET Identity)
   * 2. Array serializado en localStorage ('roles')
   * 3. Valor simple en localStorage ('rol')
   */
  getRoles(): string[] {
    const rolesSet = new Set<string>();

    if (!this.isTokenValid()) {
      return [];
    }

    // 1. Intentar decodificar claims del token JWT
    const token = this.getToken();
    if (token && token.includes('.')) {
      const parsed = this.decodeJwtPayload(token);
      if (parsed) {
        const msRoleClaim = parsed['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        const directRole = parsed['role'] || parsed['roles'] || parsed['Roles'];

        if (Array.isArray(msRoleClaim)) {
          msRoleClaim.forEach(r => r && rolesSet.add(String(r).trim()));
        } else if (typeof msRoleClaim === 'string') {
          rolesSet.add(msRoleClaim.trim());
        }

        if (Array.isArray(directRole)) {
          directRole.forEach(r => r && rolesSet.add(String(r).trim()));
        } else if (typeof directRole === 'string') {
          rolesSet.add(directRole.trim());
        }
      }
    }

    // 2. Revisar arreglo almacenado en localStorage
    const storedRoles = localStorage.getItem('roles');
    if (storedRoles) {
      try {
        const parsedArray = JSON.parse(storedRoles);
        if (Array.isArray(parsedArray)) {
          parsedArray.forEach(r => r && rolesSet.add(String(r).trim()));
        }
      } catch {
        storedRoles.split(/[,;/|]+/).forEach(r => r && rolesSet.add(r.trim()));
      }
    }

    // 3. Revisar rol principal en localStorage
    const mainRol = this.getRol();
    if (mainRol) {
      mainRol.split(/[,;/|]+/).forEach(r => r && rolesSet.add(r.trim()));
    }

    return Array.from(rolesSet);
  }

  getUserId(): number | null {
    const id = localStorage.getItem('userId');
    return id ? parseInt(id, 10) : null;
  }

  /**
   * Obtiene dinÃ¡micamente el ID del estudiante autenticado.
   * Evita colisiones con el ID 1 que pertenece al Administrador.
   */
  getEstudianteId(): number | null {
    const estId = localStorage.getItem('estudianteId');
    if (estId) {
      const parsed = parseInt(estId, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed !== 1) return parsed;
    }
    const roles = this.getRoles();
    const rol = this.getRol() || '';
    const esEst = roles.some(r => r === 'Estudiante' || r === 'Ayudante') ||
      rol.toLowerCase().includes('estudiante') || rol.toLowerCase().includes('ayudante');
    if (esEst) {
      const uId = this.getUserId();
      if (uId && uId !== 1) return uId;
    }
    return null;
  }

  hasRole(role: string): boolean {
    if (!role) return false;
    const target = role.trim().toLowerCase();
    const roles = this.getRoles();
    return roles.some(r => {
      const normalized = String(r || '').trim().toLowerCase();
      return normalized === target || normalized.includes(target) || target.includes(normalized);
    });
  }

  hasAnyRole(roles: string[]): boolean {
    if (!roles || roles.length === 0) return false;
    return roles.some(r => this.hasRole(r));
  }

  /**
   * Getter reactivo del usuario en sesiÃ³n actual.
   * Permite acceder como `this.authService.currentUser?.id`.
   */
  get currentUser(): UserDto | null {
    const token = this.getToken();
    if (!token) return null;
    const activeRoles = this.getRoles();
    const rol = this.getRol() || (activeRoles.length > 0 ? activeRoles[0] : '');
    const isStudent = activeRoles.some(r => r === 'Estudiante' || r === 'Ayudante') ||
                      rol.toLowerCase().includes('estudiante') || rol.toLowerCase().includes('ayudante');
    const estId = this.getEstudianteId();
    const userId = this.getUserId();
    const resolvedId = (isStudent && estId) ? estId : (userId ?? 0);
    return {
      id: resolvedId,
      username: localStorage.getItem('username') || '',
      token: token,
      rol: rol,
      role: rol,
      roles: activeRoles,
      Roles: activeRoles,
      nombre: localStorage.getItem('nombre') || '',
      apellido: localStorage.getItem('apellido') || '',
      correo: localStorage.getItem('correo') || ''
    };
  }

  /**
   * MÃ©todo compatible para llamadas `this.authService.getCurrentUser()`.
   */
  getCurrentUser(): UserDto | null {
    return this.currentUser;
  }
}


