import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { getApiBase } from '../api';

export interface DocenteRegistroDto {
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  correo: string;
  roles: string[];
}

export interface DocenteItemDto {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  correo: string;
  roles: string[];
  activo: boolean;
  departamento?: string;
  titulo?: string;
  carrera?: string;
  coordinacionId?: number;
  carreraId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDocenteService {
  private http = inject(HttpClient);

  private get baseUrl() {
    return getApiBase();
  }

  // No se utiliza almacenamiento local para docentes: todo debe venir del backend
  private docentesBase: DocenteItemDto[] = [];

  // Placeholders para compatibilidad: retornan listas vacías
  private getDocentesGuardadosLocal(): DocenteItemDto[] { return []; }
  private guardarDocenteLocal(_: DocenteItemDto): void { /* no-op */ }
  private getListaCompletaLocal(): DocenteItemDto[] { return []; }

  /**
   * POST /api/Usuarios
   * Registra un nuevo usuario con roles; usa el endpoint oficial del backend.
   */
   crearDocente(docenteDto: { username: string; password: string; nombre: string; apellido: string; correo: string; roles: string[] }): Observable<any> {
     const payload = {
       username: docenteDto.username,
       password: docenteDto.password,
       nombre: docenteDto.nombre,
       apellido: docenteDto.apellido,
       correo: docenteDto.correo,
       roles: docenteDto.roles
     };

     // Enviar al endpoint principal; si falla, intentar registro alternativo y propagar error si ambos fallan
     return this.http.post(`${this.baseUrl}/api/Usuarios`, payload).pipe(
       catchError(() => this.http.post(`${this.baseUrl}/api/Login/register`, payload))
     );
   }

  /**
   * GET /api/Usuarios?rol=Docente
   * Obtiene la lista real de usuarios/docentes del backend.
   */
  getDocentes(): Observable<DocenteItemDto[]> {
   const urlUsuarios = `${this.baseUrl}/api/Usuarios?rol=Docente`;
   const urlUsuariosBase = `${this.baseUrl}/api/Usuarios`;
   const urlPersona = `${this.baseUrl}/api/Persona`;
   const urlDocente = `${this.baseUrl}/api/Docente`;

   return this.http.get<any[]>(urlUsuarios).pipe(
     catchError(() => this.http.get<any[]>(urlUsuariosBase)),
     catchError(() => this.http.get<any[]>(urlPersona)),
     catchError(() => this.http.get<any[]>(urlDocente)),
     map((data: any) => {
       let rawList: any[] = [];
       if (Array.isArray(data)) {
         rawList = data;
       } else if (data && Array.isArray(data.$values)) {
         rawList = data.$values;
       } else if (data && Array.isArray(data.docentes)) {
         rawList = data.docentes;
       } else if (data && Array.isArray(data.personas)) {
         rawList = data.personas;
       } else if (data && Array.isArray(data.items)) {
         rawList = data.items;
       } else if (data && Array.isArray(data.data)) {
         rawList = data.data;
       }

       if (rawList.length === 0) {
         return this.getListaCompletaLocal();
       }

       const mapped = rawList.map((p: any, idx: number) => {
         const roles = Array.isArray(p.roles)
           ? p.roles
           : (Array.isArray(p.Roles) ? p.Roles : (p.rol || p.Rol ? [p.rol || p.Rol] : ['Docente']));
         const correo = String(p.correo ?? p.email ?? p.CORREO ?? `${(p.username ?? p.usuario ?? `docente.${idx + 1}`).split('@')[0]}@uteq.edu.ec`);

         return {
           id: Number(p.id ?? p.M_ID ?? p.docenteId ?? p.personaId ?? idx + 1),
           username: String(p.username ?? p.usuario ?? p.USERNAME ?? correo.split('@')[0] ?? `docente.${idx + 1}`),
           nombre: String(p.nombre ?? p.NOMBRE ?? 'Docente'),
           apellido: String(p.apellido ?? p.APELLIDO ?? ''),
           correo,
           roles,
           activo: p.activo !== false,
           departamento: p.departamento || 'Facultad de Ingeniería',
           titulo: p.titulo || 'Docente Titular'
         } as DocenteItemDto;
       });

       // No se inyectan docentes locales; devolver sólo lo que traiga el backend
       return mapped;
     }),
     catchError(() => of([]))
   );
  }

  /**
   * GET /api/Usuarios?rol={rol}
   * Obtiene usuarios filtrando por rol si se proporciona.
   */
  getUsuariosPorRol(rol?: string): Observable<DocenteItemDto[]> {
    const q = (rol && rol !== 'Todos') ? `?rol=${encodeURIComponent(rol)}` : '';
    const url = `${this.baseUrl}/api/Usuarios${q}`;

    const fallbackPersona = `${this.baseUrl}/api/Persona`;
    const fallbackDocente = `${this.baseUrl}/api/Docente`;

    return this.http.get<any[]>(url).pipe(
      catchError(() => this.http.get<any[]>(fallbackPersona)),
      catchError(() => this.http.get<any[]>(fallbackDocente)),
      map((data: any) => {
        let rawList: any[] = [];
        if (Array.isArray(data)) {
          rawList = data;
        } else if (data && Array.isArray(data.$values)) {
          rawList = data.$values;
        } else if (data && Array.isArray(data.docentes)) {
          rawList = data.docentes;
        } else if (data && Array.isArray(data.personas)) {
          rawList = data.personas;
        } else if (data && Array.isArray(data.items)) {
          rawList = data.items;
        } else if (data && Array.isArray(data.data)) {
          rawList = data.data;
        }

        if (rawList.length === 0) {
          return this.getListaCompletaLocal();
        }

        const mapped = rawList.map((p: any, idx: number) => {
          const roles = Array.isArray(p.roles)
            ? p.roles
            : (Array.isArray(p.Roles) ? p.Roles : (p.rol || p.Rol ? [p.rol || p.Rol] : ['Usuario']));
          const correo = String(p.correo ?? p.email ?? p.CORREO ?? `${(p.username ?? p.usuario ?? `user.${idx + 1}`).split('@')[0]}@uteq.edu.ec`);

          return {
            id: Number(p.id ?? p.M_ID ?? p.docenteId ?? p.personaId ?? idx + 1),
            username: String(p.username ?? p.usuario ?? p.USERNAME ?? correo.split('@')[0] ?? `user.${idx + 1}`),
            nombre: String(p.nombre ?? p.NOMBRE ?? 'Usuario'),
            apellido: String(p.apellido ?? p.APELLIDO ?? ''),
            correo,
            roles,
            activo: p.activo !== false,
            departamento: p.departamento || 'Facultad',
            titulo: p.titulo || ''
          } as DocenteItemDto;
        });

        return mapped;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene los docentes vinculados a la coordinacion/carrera del coordinador en sesion.
   */
  getDocentesCoordinados(carreraOCoordinacion?: string | number): Observable<DocenteItemDto[]> {
    return this.getDocentes().pipe(
      map((docs: DocenteItemDto[]) => {
        const list: DocenteItemDto[] = Array.isArray(docs) ? docs : [];
        if (!carreraOCoordinacion || list.length === 0) return list;
        const filtro = String(carreraOCoordinacion).trim().toLowerCase();
        return list.filter(d => {
          const dep = (d.departamento || '').toLowerCase();
          const carr = (d.carrera || '').toLowerCase();
          return !filtro || dep.includes(filtro) || carr.includes(filtro) || filtro.includes(dep) || filtro.includes(carr);
        });
      })
    );
  }
}
