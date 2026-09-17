import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, timeout } from 'rxjs/operators';
import { getApiBase } from '../api';

export interface CreateClaseDto {
  nombre: string;
  materiaId?: number;
  materiaIds?: number[];
  docenteId?: number;
  estudianteIds?: number[];
  semestre?: string;
  descripcion?: string;
  carrera?: string;
}

export interface ClaseDto {
  id: number;
  nombre: string;
  materiaId?: number;
  materiaIds?: number[];
  materiaNombre?: string;
  docenteId?: number;
  docenteNombre?: string;
  estudianteIds?: number[];
  semestre?: string;
  descripcion?: string;
  carrera?: string;
}

export interface CreateClaseSesionDto {
  materiaId: number;
  claseId?: number;
  docenteId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoClase: string;
  linkVirtual?: string;
  aplicacionVirtual?: string;
  edificioPresencial?: string;
  aulaPresencial?: string;
  pisoPresencial?: string;
  observaciones?: string;
}

export interface ClaseSesionDto {
  id: number;
  materiaId: number;
  claseId?: number;
  docenteId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoClase: string;
  linkVirtual?: string;
  aplicacionVirtual?: string;
  edificioPresencial?: string;
  aulaPresencial?: string;
  pisoPresencial?: string;
  observaciones?: string;
}

export interface CreateAsistenciaDto {
  claseSesionId?: number;
  estudianteId: number;
  presente: boolean;
}

export interface AsistenciaDto {
  id: number;
  claseSesionId: number;
  estudianteId: number;
  presente: boolean;
  nombreEstudiante?: string;
  fechaSesion?: string;
}

export interface EstudianteSesionAsistenciaDto {
  estudianteId: number;
  nombre: string;
  correo: string;
  asistenciaRegistrada: boolean;
  asistenciaId?: number | null;
  presente?: boolean | null;
}

export interface EstudiantesSesionResponse {
  claseSesionId: number;
  materiaId: number;
  claseId?: number | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estudiantes: EstudianteSesionAsistenciaDto[];
}

@Injectable({
  providedIn: 'root'
})
export class ClaseService {
  private STORAGE_CLASES = 'sigac_clases_v2';
  private STORAGE_SESIONES = 'sigac_sesiones_v2';

  private clasesSubject = new BehaviorSubject<ClaseDto[]>([]);
  public clases$ = this.clasesSubject.asObservable();

  private sesionesSubject = new BehaviorSubject<ClaseSesionDto[]>([]);
  public sesiones$ = this.sesionesSubject.asObservable();

  constructor(private http: HttpClient) {}

  private get apiUrl() { return `${getApiBase()}/api/Clase`; }
  private get sesionApiUrl() { return `${getApiBase()}/api/ClaseSesion`; }

  // Clase
  getClases(): Observable<ClaseDto[]> {
    return this.refreshClases();
  }

  refreshClases(): Observable<ClaseDto[]> {
    return this.http.get<any>(`${getApiBase()}/api/Clase`).pipe(
      timeout(10000),
      map((res) => this.normalizeClasesResponse(res)),
      tap((list) => this.clasesSubject.next(list)),
      catchError((err) => {
        console.error('No se pudieron listar las clases desde el backend:', err);
        return of(this.clasesSubject.value);
      })
    );
  }

  private normalizeClasesResponse(res: any): ClaseDto[] {
    let list: any[] = [];
    if (Array.isArray(res)) {
      list = res;
    } else if (res && Array.isArray(res.$values)) {
      list = res.$values;
    } else if (res && Array.isArray(res.clases)) {
      list = res.clases;
    } else if (res && Array.isArray(res.items)) {
      list = res.items;
    } else if (res && Array.isArray(res.data)) {
      list = res.data;
    }

    return list.map((item, index) => {
      const docNombre = item.docenteNombre
        ?? (item.docente ? (`${item.docente.nombre || ''} ${item.docente.apellido || ''}`.trim() || item.docente.username || item.docente.nombreDocente) : undefined)
        ?? item.nombreDocente ?? item.profesor;

      const matNombre = item.materiaNombre
        ?? item.materia?.nombre
        ?? item.nombreMateria;

      return {
        id: Number(item.id ?? item.claseId ?? index + 1),
        nombre: String(item.nombre ?? item.nombreClase ?? item.paralelo ?? `Clase ${index + 1}`),
        materiaId: item.materiaId ?? item.materia?.id ?? undefined,
        materiaIds: Array.isArray(item.materiaIds) ? item.materiaIds : (item.materiaId ? [Number(item.materiaId)] : []),
        materiaNombre: matNombre ? String(matNombre) : undefined,
        docenteId: item.docenteId ?? item.docente?.id ?? undefined,
        docenteNombre: docNombre ? String(docNombre) : undefined,
        estudianteIds: Array.isArray(item.estudianteIds) ? item.estudianteIds : (Array.isArray(item.estudiantes) ? item.estudiantes.map((e: any) => Number(e.id ?? e.estudianteId ?? 0)).filter(Boolean) : []),
        semestre: item.semestre ?? item.periodo ?? '2026-2',
        descripcion: item.descripcion ?? '',
        carrera: item.carrera ?? item.programa ?? 'Ingeniería de Software'
      };
    });
  }

  createClase(dto: CreateClaseDto): Observable<ClaseDto> {
    const matIds = dto.materiaIds && dto.materiaIds.length > 0
      ? dto.materiaIds
      : (dto.materiaId ? [Number(dto.materiaId)] : []);

    const resolvedMateriaId = Number(dto.materiaId || (matIds.length > 0 ? matIds[0] : 101));
    const resolvedDocenteId = dto.docenteId ? Number(dto.docenteId) : undefined;

    const postPayload: any = {
      nombre: dto.nombre.trim(),
      semestre: dto.semestre || '2026-2',
      carrera: dto.carrera || 'Ingeniería',
      descripcion: dto.descripcion?.trim() || ''
    };

    if (Number.isFinite(resolvedMateriaId) && resolvedMateriaId > 0) {
      postPayload.materiaId = resolvedMateriaId;
    }
    if (resolvedDocenteId && Number.isFinite(resolvedDocenteId) && resolvedDocenteId > 0) {
      postPayload.docenteId = resolvedDocenteId;
    }
    if (dto.estudianteIds && dto.estudianteIds.length > 0) {
      postPayload.estudianteIds = dto.estudianteIds;
    }

    return this.http.post<any>(`${getApiBase()}/api/Clase`, postPayload).pipe(
      timeout(10000),
      map((res) => {
        const created: ClaseDto = {
          id: Number(res?.id ?? res?.claseId),
          nombre: String(res?.nombre ?? dto.nombre.trim()),
          materiaId: Number(res?.materiaId ?? resolvedMateriaId),
          materiaIds: Array.isArray(res?.materiaIds) ? res.materiaIds : (matIds.length > 0 ? matIds : [resolvedMateriaId]),
          materiaNombre: res?.materiaNombre || res?.materia?.nombre,
          docenteId: res?.docenteId ? Number(res.docenteId) : (resolvedDocenteId ?? undefined),
          docenteNombre: res?.docenteNombre || res?.docente?.nombre,
          estudianteIds: Array.isArray(res?.estudianteIds) ? res.estudianteIds : (dto.estudianteIds ?? []),
          semestre: String(res?.semestre ?? dto.semestre ?? '2026-2'),
          descripcion: String(res?.descripcion ?? dto.descripcion ?? ''),
          carrera: String(res?.carrera ?? dto.carrera ?? 'Ingeniería')
        };

        if (!created.id || Number.isNaN(created.id)) {
          throw new Error('La respuesta del backend no incluye un identificador de clase válido.');
        }

        const current = this.clasesSubject.value;
        this.clasesSubject.next([created, ...current.filter(c => Number(c.id) !== Number(created.id))]);
        return created;
      }),
      catchError((err) => {
        console.error('No se pudo crear la clase en el backend:', err);
        return throwError(() => err);
      })
    );
  }

  updateClase(id: number, dto: Partial<CreateClaseDto> & { materiaId?: number; materiaNombre?: string }): Observable<any> {
    const payload: any = { ...dto };
    if (dto.materiaId) {
      payload.materiaId = Number(dto.materiaId);
      payload.materiaIds = [Number(dto.materiaId)];
    }
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      timeout(10000),
      tap(() => {
        const list = this.clasesSubject.value.map(c => {
          if (Number(c.id) === Number(id)) {
            return {
              ...c,
              ...payload,
              materiaId: payload.materiaId ?? c.materiaId,
              materiaNombre: payload.materiaNombre ?? c.materiaNombre
            };
          }
          return c;
        });
        this.clasesSubject.next(list);
      }),
      catchError((err) => {
        console.warn('Backend updateClase warning, falling back:', err);
        const list = this.clasesSubject.value.map(c => {
          if (Number(c.id) === Number(id)) {
            return {
              ...c,
              ...payload,
              materiaId: payload.materiaId ?? c.materiaId,
              materiaNombre: payload.materiaNombre ?? c.materiaNombre
            };
          }
          return c;
        });
        this.clasesSubject.next(list);
        return of({ success: true, fallback: true });
      })
    );
  }

  /**
   * DELETE /api/Clase/{id}
   * Conectado directamente al endpoint oficial de eliminación de clase
   */
  deleteClase(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      timeout(10000),
      tap(() => {
        const list = this.clasesSubject.value.filter(c => Number(c.id) !== Number(id));
        this.clasesSubject.next(list);
      }),
      catchError((err) => {
        // En caso de que el backend requiera parámetro query en lugar de ruta
        if (err.status === 405) {
          return this.http.delete(`${this.apiUrl}?id=${id}`).pipe(
            tap(() => {
              const list = this.clasesSubject.value.filter(c => Number(c.id) !== Number(id));
              this.clasesSubject.next(list);
            })
          );
        }
        console.error('No se pudo eliminar la clase en el backend:', err);
        return throwError(() => err);
      })
    );
  }

  eliminarClase(id: number): Observable<any> {
    return this.deleteClase(id);
  }

  getClaseById(id: number): Observable<ClaseDto> {
    const found = this.clasesSubject.value.find(c => Number(c.id) === Number(id));
    if (found) {
      return of(found);
    }
    return this.http.get<ClaseDto>(`${this.apiUrl}/${id}`);
  }

  addEstudiantesToClase(claseId: number, estudianteIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${claseId}/estudiantes`, estudianteIds);
  }

  eliminarEstudiante(claseId: number, estudianteId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${claseId}/estudiantes/${estudianteId}`);
  }

  getEstudiantesFromClase(claseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${claseId}/estudiantes`);
  }

  // ==================== SESIONES (RF-019) ====================

  createClaseSesion(dto: CreateClaseSesionDto): Observable<ClaseSesionDto> {
    return this.http.post<ClaseSesionDto>(this.sesionApiUrl, dto).pipe(
      tap((sesion) => {
        const actual = this.sesionesSubject.value;
        this.sesionesSubject.next([
          sesion,
          ...actual.filter(s => Number(s.id) !== Number(sesion.id))
        ]);
      })
    );
  }

  getClaseSesionById(id: number): Observable<ClaseSesionDto> {
    return this.http.get<ClaseSesionDto>(`${this.sesionApiUrl}/${id}`).pipe(
      tap((sesion) => {
        const actual = this.sesionesSubject.value;
        this.sesionesSubject.next([
          sesion,
          ...actual.filter(s => Number(s.id) !== Number(sesion.id))
        ]);
      })
    );
  }

  getSesionesByMateria(materiaId: number): Observable<ClaseSesionDto[]> {
    return this.http
      .get<ClaseSesionDto[]>(`${this.sesionApiUrl}/materia/${materiaId}`)
      .pipe(
        map((res: any) => this.normalizarSesiones(res)),
        tap((sesiones) => this.actualizarSesionesCache(sesiones, 'materia', materiaId)),
        catchError((err) => {
          if (err?.status === 404) {
            this.actualizarSesionesCache([], 'materia', materiaId);
            return of([]);
          }
          return throwError(() => err);
        })
      );
  }

  getSesionesByClase(claseId: number): Observable<ClaseSesionDto[]> {
    return this.http
      .get<ClaseSesionDto[]>(`${this.sesionApiUrl}/clase/${claseId}`)
      .pipe(
        map((res: any) => this.normalizarSesiones(res)),
        tap((sesiones) => this.actualizarSesionesCache(sesiones, 'clase', claseId)),
        catchError((err) => {
          if (err?.status === 404) {
            this.actualizarSesionesCache([], 'clase', claseId);
            return of([]);
          }
          return throwError(() => err);
        })
      );
  }

  private normalizarSesiones(res: any): ClaseSesionDto[] {
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res?.$values)
        ? res.$values
        : Array.isArray(res?.data)
          ? res.data
          : [];

    return list.map((s: any) => ({
      id: Number(s.id ?? s.claseSesionId),
      materiaId: Number(s.materiaId),
      claseId: s.claseId != null ? Number(s.claseId) : undefined,
      docenteId: Number(s.docenteId),
      fecha: String(s.fecha ?? ''),
      horaInicio: String(s.horaInicio ?? ''),
      horaFin: String(s.horaFin ?? ''),
      tipoClase: String(s.tipoClase ?? ''),
      linkVirtual: s.linkVirtual ?? '',
      aplicacionVirtual: s.aplicacionVirtual ?? '',
      edificioPresencial: s.edificioPresencial ?? '',
      aulaPresencial: s.aulaPresencial ?? '',
      pisoPresencial: s.pisoPresencial ?? '',
      observaciones: s.observaciones ?? ''
    }));
  }

  private actualizarSesionesCache(
    nuevas: ClaseSesionDto[],
    filtro: 'materia' | 'clase',
    id: number
  ): void {
    const otras = this.sesionesSubject.value.filter((s) =>
      filtro === 'materia'
        ? Number(s.materiaId) !== Number(id)
        : Number(s.claseId) !== Number(id)
    );
    this.sesionesSubject.next([...nuevas, ...otras]);
  }

  // ==================== ASISTENCIA (RF-020) ====================

  getEstudiantesDeSesion(claseSesionId: number): Observable<EstudiantesSesionResponse> {
    return this.http.get<EstudiantesSesionResponse>(
      `${this.sesionApiUrl}/${claseSesionId}/estudiantes`
    );
  }

  registrarAsistencia(
    claseSesionId: number,
    dto: CreateAsistenciaDto
  ): Observable<AsistenciaDto> {
    const payload = {
      estudianteId: Number(dto.estudianteId),
      presente: Boolean(dto.presente)
    };

    return this.http
      .post<any>(`${this.sesionApiUrl}/${claseSesionId}/asistencia`, payload)
      .pipe(
        map((res: any) => {
          const a = res?.asistencia ?? res;
          return {
            id: Number(a.id),
            claseSesionId: Number(a.claseSesionId ?? claseSesionId),
            estudianteId: Number(a.estudianteId ?? dto.estudianteId),
            presente: Boolean(a.presente),
            nombreEstudiante: a.nombreEstudiante,
            fechaSesion: a.fechaSesion
          } as AsistenciaDto;
        })
      );
  }

  getAsistenciaBySesion(claseSesionId: number): Observable<AsistenciaDto[]> {
    return this.http
      .get<any>(`${this.sesionApiUrl}/${claseSesionId}/asistencia`)
      .pipe(
        map((res: any) => {
          const registros = Array.isArray(res)
            ? res
            : Array.isArray(res?.registros)
              ? res.registros
              : Array.isArray(res?.$values)
                ? res.$values
                : [];

          return registros.map((a: any) => ({
            id: Number(a.id),
            claseSesionId: Number(a.claseSesionId ?? claseSesionId),
            estudianteId: Number(a.estudianteId),
            presente: Boolean(a.presente),
            nombreEstudiante: a.nombreEstudiante,
            fechaSesion: a.fechaSesion ?? res?.fecha
          }));
        })
      );
  }

  getAsistenciaEstudiante(claseSesionId: number): Observable<any> {
    return this.http.get<any>(`${this.sesionApiUrl}/estudiante/asistencia/${claseSesionId}`);
  }
}
