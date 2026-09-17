import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, timeout } from 'rxjs/operators';
import { getApiBase } from '../api';
import {
  RecursoDto,
  CreateRecursoDto,
  RecursoConEstadoDto,
  ActividadDto,
  CreateActividadDto,
} from '../models/materia/materia.dto';

export type { RecursoDto, CreateRecursoDto, RecursoConEstadoDto, ActividadDto, CreateActividadDto };

export interface EstudianteMateria {
  id: number;
  estudianteId?: number;
  nombre: string;
  nombreCompleto?: string;
  apellido?: string;
  correo?: string;
  username?: string;
  nota?: number;
  asistencia?: number;
  matricula?: string;
  cedula?: string;
  ci?: string;
  carrera?: string;
  estado?: 'Regular' | 'En Riesgo' | 'Destacado' | 'Retirado' | 'Justificado' | string;
  telefono?: string;
  observaciones?: string[];
  tareasEntregadas?: number;
  totalTareas?: number;
}

export interface MateriaClaseItem {
  id: number;
  nombre: string;
  semestre?: string;
  docenteNombre?: string;
}

export interface MateriaDto {
  id: number;
  catedraId?: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  docente?: string;
  docenteResponsableId?: number;
  docenteId?: number;
  docenteNombre?: string;
  creditos?: number;
  semana?: number;
  totalSemanas?: number;
  claseId?: number;
  claseNombre?: string;
  clases?: (MateriaClaseItem | any)[];
  semestre?: string;
  grupo?: string;
  ayudantes?: string[];
  estudiantes?: EstudianteMateria[];
  actividades?: any[];
  cupos?: number;
  cuposDisponibles?: number;
  postulantesPendientes?: number;
  estudiantesPostulando?: number;
}

export interface CreateMateriaDto {
  nombre: string;
  codigo: string;
  descripcion?: string;
  semestre?: string;
  creditos?: number;
  docenteId?: number;
  docenteResponsableId?: number;
  claseId?: number;
  claseNombre?: string;
  grupo?: string;
}

export interface TemaMateriaDto {
  id: number;
  materiaId: number;
  nombre: string;
}

export interface MarkRecursoAsSeenDto {
  recursoId: number;
}

export interface AsistenteRegistro {
  id?: number;
  nombre: string;
  email: string;
  presente: boolean;
}

export interface RegistroAsistenciaDto {
  id: number;
  materiaId: number;
  fecha: string;
  tema: string;
  asistentes: AsistenteRegistro[];
}

const RECURSOS_DEFAULT: RecursoDto[] = [];
const ACTIVIDADES_DEFAULT: ActividadDto[] = [];
const ASISTENCIAS_DEFAULT: RegistroAsistenciaDto[] = [];

@Injectable({
  providedIn: 'root',
})
export class MateriaService {
  private STORAGE_RECURSOS = 'sigac_recursos_v2';
  private STORAGE_ACTIVIDADES = 'sigac_actividades_v2';
  private STORAGE_ASISTENCIAS = 'sigac_asistencias_v2';
  private STORAGE_TEMAS = 'sigac_temas_v2';

  private materiasSubject = new BehaviorSubject<MateriaDto[]>([]);
  public materias$ = this.materiasSubject.asObservable();

  private recursosSubject = new BehaviorSubject<RecursoDto[]>(
    this.loadStorage(this.STORAGE_RECURSOS, RECURSOS_DEFAULT),
  );
  public recursos$ = this.recursosSubject.asObservable();

  private actividadesSubject = new BehaviorSubject<ActividadDto[]>(
    this.loadStorage(this.STORAGE_ACTIVIDADES, ACTIVIDADES_DEFAULT),
  );
  public actividades$ = this.actividadesSubject.asObservable();

  private asistenciasSubject = new BehaviorSubject<RegistroAsistenciaDto[]>(
    this.loadStorage(this.STORAGE_ASISTENCIAS, ASISTENCIAS_DEFAULT),
  );
  public asistencias$ = this.asistenciasSubject.asObservable();

  constructor(private http: HttpClient) {}

  private get apiUrl() {
    return `${getApiBase()}/api`;
  }

  private mapToMateriaDto(item: any, idx: number = 0): MateriaDto {
    if (!item) {
      return {
        id: idx + 101,
        nombre: `Asignatura ${idx + 1}`,
        codigo: `MAT-${101 + idx}`,
        docente: 'Por asignar',
        creditos: 4,
        semana: 1,
        totalSemanas: 16,
        semestre: '2026-2',
        grupo: 'Grupo A',
        ayudantes: [],
        estudiantes: []
      };
    }

    let docenteStr = '';
    if (item.catedra?.docente) {
      if (typeof item.catedra.docente === 'object') {
        const nom = item.catedra.docente.nombres || item.catedra.docente.nombre || '';
        const ape = item.catedra.docente.apellidos || item.catedra.docente.apellido || '';
        docenteStr = `${nom} ${ape}`.trim() || item.catedra.docente.nombreCompleto || item.catedra.docente.username || '';
      } else if (typeof item.catedra.docente === 'string') {
        docenteStr = item.catedra.docente;
      }
    }
    if (!docenteStr && item.docente) {
      if (typeof item.docente === 'object') {
        const nom = item.docente.nombres || item.docente.nombre || '';
        const ape = item.docente.apellidos || item.docente.apellido || '';
        docenteStr = `${nom} ${ape}`.trim() || item.docente.nombreCompleto || item.docente.username || '';
      } else if (typeof item.docente === 'string') {
        docenteStr = item.docente;
      }
    }
    if (!docenteStr && item.docenteResponsable) {
      if (typeof item.docenteResponsable === 'object') {
        const nom = item.docenteResponsable.nombres || item.docenteResponsable.nombre || '';
        const ape = item.docenteResponsable.apellidos || item.docenteResponsable.apellido || '';
        docenteStr = `${nom} ${ape}`.trim() || item.docenteResponsable.nombreCompleto || item.docenteResponsable.username || '';
      } else if (typeof item.docenteResponsable === 'string') {
        docenteStr = item.docenteResponsable;
      }
    }
    if (!docenteStr && item.docente && typeof item.docente === 'object') {
      const p = item.docente.persona;
      if (p) {
        const nom = p.nombres || p.nombre || '';
        const ape = p.apellidos || p.apellido || '';
        docenteStr = `${nom} ${ape}`.trim();
      }
    }
    if (!docenteStr) {
      docenteStr = item.docenteTitular ||
                   item.nombreDocente ||
                   item.docenteNombre ||
                   item.catedra?.docenteTitular ||
                   item.catedra?.docenteNombre ||
                   item.profesorResponsable ||
                   item.profesorNombre ||
                   item.profesor ||
                   '';
    }
    const rawDocente = docenteStr ? String(docenteStr).trim() : 'Por asignar';
    const docId = Number(
      item.docenteResponsableId ||
        item.docenteId ||
        item.profesorId ||
        (typeof item.docente === 'object' ? item.docente?.id : 0) ||
        0,
    );

    let rawClases: any[] = [];
    if (Array.isArray(item.clases)) {
      rawClases = item.clases;
    } else if (item.clases && Array.isArray(item.clases.$values)) {
      rawClases = item.clases.$values;
    } else if (Array.isArray(item.paralelos)) {
      rawClases = item.paralelos;
    } else if (item.paralelos && Array.isArray(item.paralelos.$values)) {
      rawClases = item.paralelos.$values;
    }

    const mappedClases = rawClases.map((c: any, cIdx: number) => {
      if (!c) return { id: cIdx + 1, nombre: `Paralelo ${cIdx + 1}` };
      if (typeof c === 'string') return { id: cIdx + 1, nombre: c };
      return {
        id: Number(c.id || c.claseId || cIdx + 1),
        nombre: String(c.nombre || c.nombreClase || c.paralelo || `Paralelo ${cIdx + 1}`),
        semestre: c.semestre || undefined,
        docenteNombre: c.docenteNombre || c.docente?.nombre || undefined,
      };
    });

    const parsedClaseId = item.claseId
      ? Number(item.claseId)
      : typeof item.clase === 'object' && item.clase?.id
        ? Number(item.clase.id)
        : undefined;
    const parsedClaseNombre =
      item.claseNombre ||
      item.nombreClase ||
      (typeof item.clase === 'object' ? item.clase?.nombre : undefined) ||
      undefined;

    return {
      id: Number(item.id || item.materiaId || item.catedraId || item.claseId || idx + 101),
      catedraId: Number(item.catedraId || 0) > 0 ? Number(item.catedraId) : undefined,
      nombre:
        item.nombre ||
        item.nombreMateria ||
        item.nombreCatedra ||
        item.nombreAsignatura ||
        item.materia ||
        `Asignatura ${idx + 1}`,
      codigo:
        item.codigo ||
        item.codigoMateria ||
        item.codigoAsignatura ||
        item.sigla ||
        `MAT-${101 + idx}`,
      descripcion: item.descripcion || item.descripcionMateria || item.detalle || '',
      docente: rawDocente,
      docenteResponsableId: docId > 0 ? docId : undefined,
      docenteId: docId > 0 ? docId : undefined,
      docenteNombre: rawDocente,
      creditos: Number(item.creditos || item.creditosMateria || 4),
      semana: Number(item.semana || item.semanaActual || 1),
      totalSemanas: Number(item.totalSemanas || 16),
      claseId: parsedClaseId,
      claseNombre: parsedClaseNombre,
      clases: mappedClases,
      semestre: item.semestre || item.semestreCatedra || item.periodo || '2026-2',
      grupo: item.grupo || item.paralelo || 'Grupo A',
      ayudantes: Array.isArray(item.ayudantes) ? item.ayudantes : item.ayudantes?.$values || [],
      estudiantes: Array.isArray(item.estudiantes)
        ? item.estudiantes
        : item.estudiantes?.$values || [],
    };
  }

  private loadStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (key === this.STORAGE_RECURSOS) {
            return (parsed as any[]).map((r) => ({
              ...r,
              id: Number(r.id) > 2147483647 ? (Number(r.id) % 2000000000) + 1 : Number(r.id),
            })) as unknown as T;
          }
          return parsed as unknown as T;
        }
      }
    } catch (e) {
      console.warn(`Error loading storage for ${key}`, e);
    }
    return fallback;
  }

  private saveStorage<T>(key: string, data: T) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn(`Error saving storage for ${key}`, e);
      }
    }
  }

  // ==================== MATERIAS (API OFICIAL /api/Materia) ====================\

  getMaterias(): Observable<MateriaDto[]> {
    return this.http.get<any>(`${this.apiUrl}/Materia`).pipe(
      map((res) => {
        const raw = Array.isArray(res) ? res : res?.$values || res?.data || [];
        const mapped: MateriaDto[] = raw
          .filter(Boolean)
          .map((item: any, idx: number) => this.mapToMateriaDto(item, idx));
        this.materiasSubject.next(mapped);
        return mapped;
      }),
      catchError((err) => {
        console.error('Error al obtener materias de la API /api/Materia:', err);
        return of(this.materiasSubject.value);
      }),
    );
  }

  crearMateria(dto: {
    nombre: string;
    codigo: string;
    descripcion?: string;
    semestre?: string;
    creditos?: number;
    docenteId?: number;
    claseId?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/Materia`, dto);
  }

  createMateria(
    dto:
      | {
          nombre: string;
          codigo: string;
          descripcion?: string;
          semestre?: string;
          creditos?: number;
          docenteId?: number;
          claseId?: number;
        }
      | any,
  ): Observable<any> {
    return this.crearMateria(dto);
  }

  eliminarMateria(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Materia/${id}`).pipe(
      tap(() => {
        const updated = this.materiasSubject.value.filter((m) => Number(m.id) !== Number(id));
        this.materiasSubject.next(updated);
      }),
    );
  }

  deleteMateria(id: number): Observable<any> {
    return this.eliminarMateria(id);
  }

  getDocenteDeMateria(materiaIdOrCatedraId: number | string): string {
    const list = this.materiasSubject.value;
    const m = list.find(item =>
      Number(item.id) === Number(materiaIdOrCatedraId) ||
      Number(item.catedraId) === Number(materiaIdOrCatedraId) ||
      (typeof materiaIdOrCatedraId === 'string' && item.nombre.toLowerCase().trim() === materiaIdOrCatedraId.toLowerCase().trim())
    );
    return m ? (m.docenteNombre || m.docente || '') : '';
  }

  getMateriasSnapshot(): MateriaDto[] {
    return this.materiasSubject.value;
  }

  getAsistenciasSnapshot(): RegistroAsistenciaDto[] {
    return this.asistenciasSubject.value;
  }

  getMateriaById(id: number): MateriaDto | undefined {
    const list = this.materiasSubject.value;
    return list.find((m) => Number(m.id) === Number(id));
  }

  refreshMaterias(): Observable<MateriaDto[]> {
    return this.getMaterias();
  }

  getMateriasEstudiante(): Observable<MateriaDto[]> {
    return this.getMaterias();
  }

  syncMaterias(nuevas: MateriaDto[]): void {
    if (!Array.isArray(nuevas)) return;
    const current = this.materiasSubject.value;
    const mapById = new Map<number, MateriaDto>();
    current.forEach((m) => mapById.set(m.id, m));
    nuevas.forEach((m) => mapById.set(m.id, m));
    const merged = Array.from(mapById.values());
    this.materiasSubject.next(merged);
  }

  private buildAyudantePayload(
    ayudanteEmail?: string,
    ayudanteId?: number,
  ): { ayudanteEmail?: string; ayudanteId?: number } {
    const payload: { ayudanteEmail?: string; ayudanteId?: number } = {};

    if (Number.isFinite(Number(ayudanteId)) && Number(ayudanteId) > 0) {
      payload.ayudanteId = Number(ayudanteId);
      return payload;
    }

    const email = (ayudanteEmail || '').trim();
    if (email) {
      payload.ayudanteEmail = email;
    }

    return payload;
  }

  asignarAyudanteClase(
    claseId: number,
    ayudanteEmail?: string,
    ayudanteId?: number,
  ): Observable<{ success: boolean; mensaje: string; fallback?: boolean }> {
    const payload = this.buildAyudantePayload(ayudanteEmail, ayudanteId);
    if (!payload.ayudanteEmail && payload.ayudanteId === undefined) {
      return throwError(() => new Error('Debes ingresar un correo o ID válido del ayudante.'));
    }

    const urlClase = `${getApiBase()}/api/Clase/${claseId}/ayudante`;

    return this.http.post<{ message?: string }>(urlClase, payload).pipe(
      timeout(10000),
      map((res) => ({
        success: true,
        mensaje:
          res?.message ||
          (payload.ayudanteEmail
            ? `Ayudante asignado: ${payload.ayudanteEmail}`
            : `Ayudante asignado con ID ${payload.ayudanteId}.`),
      })),
    );
  }

  asignarAyudanteMateria(
    materiaId: number,
    ayudanteEmail: string,
    ayudanteId?: number,
  ): Observable<{ success: boolean; mensaje: string; fallback?: boolean }> {
    const email = (ayudanteEmail || '').trim();
    const normalizedId = Number(ayudanteId);
    const payload = this.buildAyudantePayload(email, normalizedId);

    if (!payload.ayudanteEmail && payload.ayudanteId === undefined) {
      return throwError(() => new Error('Debes ingresar un correo o ID válido del ayudante.'));
    }

    const claseId = Number(materiaId);
    const urlClase = `${getApiBase()}/api/Clase/${claseId}/ayudante`;
    const urlMateria = `${getApiBase()}/api/Materia/${materiaId}/ayudante`;

    return this.http.post<{ message?: string }>(urlClase, payload).pipe(
      timeout(10000),
      map((res) => ({
        success: true,
        mensaje:
          res?.message ||
          (payload.ayudanteEmail
            ? `Ayudante asignado: ${payload.ayudanteEmail}`
            : `Ayudante asignado con ID ${payload.ayudanteId}.`),
      })),
      catchError(() =>
        this.http.post<{ message?: string }>(urlMateria, payload).pipe(
          timeout(10000),
          map((res) => ({
            success: true,
            mensaje:
              res?.message ||
              (payload.ayudanteEmail
                ? `Ayudante asignado: ${payload.ayudanteEmail}`
                : `Ayudante asignado con ID ${payload.ayudanteId}.`),
          })),
        ),
      ),
    );
  }

  // ==================== TEMAS ====================\

  getTemasByMateria(materiaId: number): string[] {
    const key = `${this.STORAGE_TEMAS}_${materiaId}`;
    const stored = this.loadStorage<string[]>(key, []);
    return Array.isArray(stored) ? stored : [];
  }

  cargarTemasByMateria(materiaId: number): Observable<string[]> {
    const key = `${this.STORAGE_TEMAS}_${materiaId}`;
    const localList = this.getTemasByMateria(materiaId);

    return this.http.get<any[]>(`${getApiBase()}/api/Materia/${materiaId}/temas`).pipe(
      map((res) => {
        const list = Array.isArray(res) ? res : [];
        return list
          .map((item: any) => String(item?.titulo ?? item?.nombre ?? '').trim())
          .filter(Boolean);
      }),
      tap((mapped) => this.saveStorage(key, mapped)),
      catchError(() => of(localList)),
    );
  }

  addTemaToMateria(materiaId: number, nombreTema: string): string[] {
    const key = `${this.STORAGE_TEMAS}_${materiaId}`;
    const actuales = this.getTemasByMateria(materiaId);
    const titulo = (nombreTema || '').trim();
    if (!titulo) return actuales;

    const payload = {
      titulo,
      descripcion: `Tema creado desde el frontend para materia ${materiaId}.`,
      orden: actuales.length + 1,
    };

    this.http
      .post<any>(`${getApiBase()}/api/Materia/${materiaId}/temas`, payload)
      .pipe(
        map((res) => {
          const value = String(res?.titulo ?? titulo).trim();
          const next = Array.from(new Set([...actuales, value])).filter(Boolean);
          this.saveStorage(key, next);
          return next;
        }),
        catchError(() => {
          const updated = [...actuales, titulo];
          this.saveStorage(key, updated);
          return of(updated);
        }),
      )
      .subscribe();

    return [...actuales, titulo];
  }

  // ==================== RECURSOS ====================\

  getRecursos(materiaId: number): Observable<RecursoDto[]> {
    return this.http.get<RecursoDto[]>(`${this.apiUrl}/Materia/${materiaId}/recursos`);
  }

  subirRecursoArchivo(
    materiaId: number,
    file: File,
    titulo: string,
    descripcion: string = '',
  ): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('archivo', file);
    formData.append('titulo', titulo);
    formData.append('descripcion', descripcion);
    return this.http.post(`${this.apiUrl}/Materia/${materiaId}/recursos/upload`, formData);
  }

  getRecursosByMateria(materiaId: number): Observable<RecursoDto[]> {
    return this.getRecursos(materiaId).pipe(
      tap((mapped) => {
        const list = Array.isArray(mapped) ? mapped : [];
        const currentOther = this.recursosSubject.value.filter(
          (r) => Number(r.materiaId) !== Number(materiaId),
        );
        const combined = [...list, ...currentOther];
        this.recursosSubject.next(combined);
        this.saveStorage(this.STORAGE_RECURSOS, combined);
      }),
      catchError(() => of([])),
    );
  }

  getRecursosConEstado(materiaId: number): Observable<RecursoConEstadoDto[]> {
    return this.http
      .get<RecursoConEstadoDto[]>(`${this.apiUrl}/Materia/${materiaId}/recursos/estado`)
      .pipe(
        tap((mapped) => {
          const list = Array.isArray(mapped) ? mapped : [];
          const currentOther = this.recursosSubject.value.filter(
            (r) => Number(r.materiaId) !== Number(materiaId),
          );
          const combined = [...list, ...currentOther];
          this.recursosSubject.next(combined);
          this.saveStorage(this.STORAGE_RECURSOS, combined);
        }),
        catchError(() => this.getRecursosByMateria(materiaId)),
      );
  }

  crearRecurso(materiaId: number, dto: CreateRecursoDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Materia/${materiaId}/recursos`, dto);
  }

  addRecurso(materiaId: number, dto: CreateRecursoDto): Observable<any> {
    return this.crearRecurso(materiaId, dto);
  }

  uploadRecurso(
    materiaId: number,
    archivo: File,
    titulo?: string,
    descripcion?: string,
  ): Observable<{ url?: string; key?: string; raw?: any }> {
    return this.subirRecursoArchivo(
      materiaId,
      archivo,
      titulo || archivo.name,
      descripcion || '',
    ).pipe(
      map((res: any) => ({
        url: res?.url || res?.Url || res?.urlArchivo || res?.enlace || undefined,
        key: res?.key || res?.Key || undefined,
        raw: res,
      })),
    );
  }

  marcarRecursoComoVisto(recursoId: number): Observable<any> {
    const safeRecursoId = Math.floor(Math.abs(Number(recursoId)) % 2147483647) || 1;
    const list = this.recursosSubject.value.map((r) => {
      if (Number(r.id) === Number(recursoId)) {
        return { ...r, visto: !r.visto };
      }
      return r;
    });
    this.recursosSubject.next(list);
    this.saveStorage(this.STORAGE_RECURSOS, list);

    const payload: MarkRecursoAsSeenDto = {
      recursoId: safeRecursoId,
    };

    return this.http
      .post(`${this.apiUrl}/Materia/recursos/marcar-visto`, payload)
      .pipe(catchError(() => of({ success: true })));
  }

  toggleRecursoEsencial(recursoId: number): void {
    const list = this.recursosSubject.value.map((r) => {
      if (Number(r.id) === Number(recursoId)) {
        return { ...r, esEsencial: !r.esEsencial };
      }
      return r;
    });
    this.recursosSubject.next(list);
    this.saveStorage(this.STORAGE_RECURSOS, list);
  }

  deleteRecurso(recursoId: number): void {
    const list = this.recursosSubject.value.filter((r) => Number(r.id) !== Number(recursoId));
    this.recursosSubject.next(list);
    this.saveStorage(this.STORAGE_RECURSOS, list);
  }

  // ==================== ACTIVIDADES ====================\

  getActividadesSnapshot(materiaId?: number): ActividadDto[] {
    if (materiaId !== undefined) {
      return this.actividadesSubject.value.filter((a) => Number(a.materiaId) === Number(materiaId));
    }
    return this.actividadesSubject.value;
  }

  getActividades(materiaId: number): Observable<ActividadDto[]> {
    return this.http.get<ActividadDto[]>(`${this.apiUrl}/Materia/${materiaId}/actividades`);
  }

  getActividadesByMateria(materiaId: number): Observable<ActividadDto[]> {
    return this.getActividades(materiaId).pipe(
      tap((mapped) => {
        const list = Array.isArray(mapped) ? mapped : [];
        const currentOther = this.actividadesSubject.value.filter(
          (a) => Number(a.materiaId) !== Number(materiaId),
        );
        const combined = [...list, ...currentOther];
        this.actividadesSubject.next(combined);
        this.saveStorage(this.STORAGE_ACTIVIDADES, combined);
      }),
      catchError(() => of([])),
    );
  }

  crearActividad(materiaId: number, dto: CreateActividadDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Materia/${materiaId}/actividades`, dto);
  }

  addActividad(materiaId: number, dto: CreateActividadDto): Observable<any> {
    return this.crearActividad(materiaId, dto);
  }

  updateActividadEstado(actividadId: number, nuevoEstado: string, nota?: number): void {
    const list = this.actividadesSubject.value.map((a) => {
      if (Number(a.id) === Number(actividadId)) {
        return {
          ...a,
          estado: nuevoEstado,
          nota: nota !== undefined ? nota : a.nota,
          entregadoEl: nuevoEstado === 'entregada' ? new Date().toISOString() : a.entregadoEl,
        };
      }
      return a;
    });
    this.actividadesSubject.next(list);
    this.saveStorage(this.STORAGE_ACTIVIDADES, list);
  }

  deleteActividad(actividadId: number): void {
    const list = this.actividadesSubject.value.filter((a) => Number(a.id) !== Number(actividadId));
    this.actividadesSubject.next(list);
    this.saveStorage(this.STORAGE_ACTIVIDADES, list);
  }

  // ==================== ASISTENCIA Y CLASES ====================\

  getAsistenciasByMateria(materiaId: number): Observable<RegistroAsistenciaDto[]> {
    return this.asistencias$.pipe(
      map((regs) => regs.filter((reg) => Number(reg.materiaId) === Number(materiaId))),
    );
  }

  addRegistroAsistencia(
    materiaId: number,
    tema: string,
    estudiantes?: EstudianteMateria[],
  ): RegistroAsistenciaDto {
    const materia = this.getMateriaById(materiaId);
    const listaEstudiantes = estudiantes || materia?.estudiantes || [];

    const nuevoRegistro: RegistroAsistenciaDto = {
      id: Date.now(),
      materiaId: Number(materiaId),
      fecha: new Date().toISOString().split('T')[0],
      tema: (tema || '').trim(),
      asistentes: listaEstudiantes.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        email: e.correo || `${e.nombre ? e.nombre.toLowerCase().replace(/\s+/g, '.') : 'estudiante'}@uni.edu`,
        presente: false,
      })),
    };

    const current = this.asistenciasSubject.value;
    const updated = [nuevoRegistro, ...current];
    this.asistenciasSubject.next(updated);
    this.saveStorage(this.STORAGE_ASISTENCIAS, updated);
    return nuevoRegistro;
  }

  toggleAsistencia(registroId: number, estudianteIndex: number): void {
    const list = this.asistenciasSubject.value.map((reg) => {
      if (Number(reg.id) === Number(registroId)) {
        const asistentesCopy = [...reg.asistentes];
        if (asistentesCopy[estudianteIndex]) {
          asistentesCopy[estudianteIndex] = {
            ...asistentesCopy[estudianteIndex],
            presente: !asistentesCopy[estudianteIndex].presente,
          };
        }
        return { ...reg, asistentes: asistentesCopy };
      }
      return reg;
    });
    this.asistenciasSubject.next(list);
    this.saveStorage(this.STORAGE_ASISTENCIAS, list);
  }

  getRecursosSnapshot(materiaId?: number): RecursoDto[] {
    if (materiaId !== undefined) {
      return this.recursosSubject.value.filter((r) => Number(r.materiaId) === Number(materiaId));
    }
    return this.recursosSubject.value;
  }

  // ==================== ASIGNACIÓN Y GESTIÓN DE ESTUDIANTES ====================\

  agregarEstudiantesAMateria(
    materiaId: number,
    estudiantes: ({ id: number; nombre?: string; correo?: string } | number)[],
  ): Observable<any> {
    if (!Array.isArray(estudiantes)) return of({ success: false });

    const materias = this.materiasSubject.value.map((m) => {
      if (Number(m.id) === Number(materiaId)) {
        const actualList = m.estudiantes || [];
        const combined = [...actualList];
        estudiantes.forEach((est) => {
          const id = typeof est === 'number' ? est : est.id;
          const nombre = typeof est === 'object' && est.nombre ? est.nombre : `Estudiante #${id}`;
          const correo =
            typeof est === 'object' && est.correo ? est.correo : `estudiante${id}@uni.edu`;
          if (!combined.some((e) => Number(e.id) === Number(id) || e.correo === correo)) {
            combined.push({
              id: id,
              nombre: nombre,
              correo: correo,
              cedula: `17${Math.floor(10000000 + Math.random() * 90000000)}`,
              matricula: `2024-MAT-${String(id).slice(-3)}`,
              carrera: 'Ingeniería de Software',
              nota: 4.5,
              asistencia: 100,
              estado: 'Regular',
              tareasEntregadas: 5,
              totalTareas: 6,
              observaciones: ['Matriculado oficialmente en la cátedra.'],
            });
          }
        });
        return { ...m, estudiantes: combined };
      }
      return m;
    });

    this.materiasSubject.next(materias);

    const estudianteIds = estudiantes.map((e) => (typeof e === 'number' ? e : e.id));
    return this.http
      .post(`${this.apiUrl}/Materia/${materiaId}/estudiantes`, { estudianteIds })
      .pipe(catchError(() => of({ success: true })));
  }

  agregarEstudianteDirecto(materiaId: number, estudiante: Partial<EstudianteMateria>): void {
    if (!estudiante) return;
    const materias = this.materiasSubject.value.map((m) => {
      if (Number(m.id) === Number(materiaId)) {
        const list = m.estudiantes || [];
        const nuevoId = estudiante.id || Date.now();
        const nuevo: EstudianteMateria = {
          id: nuevoId,
          nombre: estudiante.nombre || 'Nuevo Estudiante',
          correo: estudiante.correo || `estudiante_${nuevoId}@uni.edu`,
          cedula: estudiante.cedula || `17${Math.floor(10000000 + Math.random() * 90000000)}`,
          matricula: estudiante.matricula || `2024-ALUM-${String(nuevoId).slice(-4)}`,
          carrera: estudiante.carrera || 'Ingeniería de Software',
          nota: estudiante.nota !== undefined ? estudiante.nota : 4.2,
          asistencia: estudiante.asistencia !== undefined ? estudiante.asistencia : 90,
          estado: estudiante.estado || 'Regular',
          telefono: estudiante.telefono || '+593 99 123 4567',
          tareasEntregadas: estudiante.tareasEntregadas || 5,
          totalTareas: 6,
          observaciones: estudiante.observaciones || [
            'Incorporado al aula por el docente responsable.',
          ],
        };
        return { ...m, estudiantes: [nuevo, ...list] };
      }
      return m;
    });
    this.materiasSubject.next(materias);
  }

  actualizarEstudianteEnMateria(materiaId: number, estudianteActualizado: EstudianteMateria): void {
    if (!estudianteActualizado) return;
    const materias = this.materiasSubject.value.map((m) => {
      if (Number(m.id) === Number(materiaId)) {
        const list = (m.estudiantes || []).map((e) =>
          Number(e.id) === Number(estudianteActualizado.id)
            ? { ...e, ...estudianteActualizado }
            : e,
        );
        return { ...m, estudiantes: list };
      }
      return m;
    });
    this.materiasSubject.next(materias);
  }

  eliminarEstudianteDeMateria(materiaOrClaseId: number, estudianteId: number): void {
    const materias = this.materiasSubject.value.map((m) => {
      if (
        Number(m.id) === Number(materiaOrClaseId) ||
        Number(m.claseId) === Number(materiaOrClaseId)
      ) {
        const list = (m.estudiantes || []).filter(
          (e) =>
            Number(e.id) !== Number(estudianteId) &&
            Number((e as any).estudianteId) !== Number(estudianteId),
        );
        return { ...m, estudiantes: list };
      }
      return m;
    });
    this.materiasSubject.next(materias);
  }

  /**
   * DELETE /api/Clase/{claseId}/estudiantes/{estudianteId}
   * Elimina un estudiante de la clase/materia
   */
  eliminarEstudiante(claseId: number, estudianteId: number): Observable<any> {
    this.eliminarEstudianteDeMateria(claseId, estudianteId);
    return this.http
      .delete(`${getApiBase()}/api/Clase/${claseId}/estudiantes/${estudianteId}`)
      .pipe(catchError(() => of({ success: true })));
  }

  agregarObservacionEstudiante(materiaId: number, estudianteId: number, observacion: string): void {
    if (!observacion?.trim()) return;
    const materias = this.materiasSubject.value.map((m) => {
      if (Number(m.id) === Number(materiaId)) {
        const list = (m.estudiantes || []).map((e) =>
          Number(e.id) === Number(estudianteId)
            ? {
                ...e,
                observaciones: [
                  `[${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}] ${observacion.trim()}`,
                  ...(e.observaciones || []),
                ],
              }
            : e,
        );
        return { ...m, estudiantes: list };
      }
      return m;
    });
    this.materiasSubject.next(materias);
  }
}
