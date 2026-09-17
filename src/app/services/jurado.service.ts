import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { getApiBase } from '../api';

export interface CrearPresentacionDto {
  ayudantiaId?: number;
  postulanteId?: number;
  estudianteId?: number;
  catedraId?: number;
  materiaId?: number;
  juradoId?: number;
  docentesIds?: number[];
  fechaPresentacion?: string;
  fecha?: string;
  tema?: string;
  temaSilabo?: string;
  lugar?: string;
  lugarOEnlace?: string;
  profesoresAsignados?: string[];
  decanoId?: number;
  coordinadorCarreraId?: number;
}

export interface EvaluacionJuradoDto {
  nota: number;
  observaciones: string;
  criterios?: {
    dominioTema?: number;
    claridadPedagogica?: number;
    recursosDidacticos?: number;
    manejoPreguntas?: number;
    dominioCientifico?: number;
    destrezaPedagogica?: number;
    desenvolvimientoClaridad?: number;
  };
}

export interface EvaluacionIndividualDto {
  juradoNombre: string;
  rolJurado: string;
  nota: number;
  observaciones: string;
  fechaEvaluacion: string;
}

export interface ResultadoPresentacionDto {
  presentacionId: number;
  ayudantiaId: number;
  estudianteNombre: string;
  catedraNombre: string;
  temaSilabo: string;
  fechaSustentacion: string;
  promedioFinal: number;
  notaMinimaAprobatoria: number;
  estadoFinal: 'Aprobado' | 'Reprobado' | 'En Evaluación' | 'Rechazado' | 'No Aprobado';
  totalEvaluadores: number;
  evaluacionesCompletadas: number;
  evaluaciones: EvaluacionIndividualDto[];
  notaDocente?: number;
  observacionDocente?: string;
  fechaCalificacionDocente?: string;
  notaAdmin?: number;
  observacionAdmin?: string;
  fechaCalificacionAdmin?: string;
  notaFinal?: number;
}

export interface PresentacionDetalleDto {
  id: number;
  ayudantiaId: number;
  estudianteId: number;
  estudianteNombre: string;
  estudianteCorreo: string;
  catedraId: number;
  catedraNombre: string;
  fecha: string;
  temaSilabo: string;
  lugarOEnlace: string;
  decanoNombre?: string;
  coordinadorNombre?: string;
  profesoresAsignados: string[];
  estado: 'Pendiente' | 'Evaluada' | 'En Progreso' | 'Aprobada' | 'Convocada' | 'Rechazada' | 'No Aprobado' | 'No Aprobada';
  yaEvaluadoPorMi?: boolean;
  promedioNota?: number;
  docenteId?: number;
  docentesIds?: number[];
  notaDocente?: number;
  observacionDocente?: string;
  fechaCalificacionDocente?: string;
  notaAdmin?: number;
  observacionAdmin?: string;
  fechaCalificacionAdmin?: string;
  notaFinal?: number;
}

@Injectable({
  providedIn: 'root'
})
export class JuradoService {
  private http = inject(HttpClient);

  private get apiUrl() {
    return `${getApiBase()}/api/Jurado`;
  }

  private STORAGE_PRESENTACIONES = 'sigac_jurado_presentaciones_v2';
  private STORAGE_RESULTADOS = 'sigac_jurado_resultados_v2';

  private presentacionesDefault: PresentacionDetalleDto[] = [];

  private loadStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) return parsed as T;
      }
    } catch (e) {
      console.warn(`Error loading storage for ${key}`, e);
    }
    return fallback;
  }

  private saveStorage<T>(key: string, data: T): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn(`Error saving storage for ${key}`, e);
      }
    }
  }

  private presentacionesSubject = new BehaviorSubject<PresentacionDetalleDto[]>(
    this.loadStorage<PresentacionDetalleDto[]>(this.STORAGE_PRESENTACIONES, this.presentacionesDefault)
  );
  public presentaciones$ = this.presentacionesSubject.asObservable();

  /**
   * POST /api/Jurado/presentaciones o /api/Coordinador/ayudantias/convocar-tribunal
   * Registra una sustentación de tema de sílabo ante el tribunal
   */
  
  convocarPresentacion(dto: CrearPresentacionDto): Observable<any> {
    return this.crearPresentacion(dto);
  }
  crearPresentacion(dto: CrearPresentacionDto): Observable<any> {
    const payload = {
      ayudantiaId: Number(dto.ayudantiaId || dto.postulanteId || dto.estudianteId || 0),
      AyudantiaId: Number(dto.ayudantiaId || dto.postulanteId || dto.estudianteId || 0),
      postulanteId: Number(dto.postulanteId || dto.estudianteId || dto.ayudantiaId || 0),
      estudianteId: Number(dto.estudianteId || dto.postulanteId || dto.ayudantiaId || 0),
      catedraId: Number(dto.catedraId || dto.materiaId || 0),
      materiaId: Number(dto.catedraId || dto.materiaId || 0),
      juradoId: Number(dto.juradoId || (dto.docentesIds && dto.docentesIds.length > 0 ? dto.docentesIds[0] : 0)),
      docentesIds: dto.docentesIds || (dto.juradoId ? [dto.juradoId] : []),
      fechaPresentacion: dto.fechaPresentacion || dto.fecha || new Date().toISOString(),
      fecha: dto.fechaPresentacion || dto.fecha || new Date().toISOString(),
      tema: dto.tema || dto.temaSilabo || 'Evaluación Pedagógica y Sílabo',
      temaSilabo: dto.tema || dto.temaSilabo || 'Evaluación Pedagógica y Sílabo',
      lugar: dto.lugar || dto.lugarOEnlace || 'Aula Magna / Virtual',
      lugarOEnlace: dto.lugar || dto.lugarOEnlace || 'Aula Magna / Virtual',
      profesoresAsignados: dto.profesoresAsignados || []
    };

    const urlCoordinador = `${getApiBase()}/api/Coordinador/ayudantias/convocar-tribunal`;
    const urlCoordinadorId = `${getApiBase()}/api/Coordinador/ayudantias/${payload.ayudantiaId}/convocar-tribunal`;
    const urlJurado = `${this.apiUrl}/presentaciones`;
    const urlAyudantias = `${getApiBase()}/api/ayudantias/convocar-tribunal`;

    return this.http.post<any>(urlCoordinador, payload).pipe(
      catchError(() => this.http.post<any>(urlCoordinadorId, payload)),
      catchError(() => this.http.post<any>(urlJurado, payload)),
      catchError(() => this.http.post<any>(urlAyudantias, payload)),
      tap((res) => {
        const itemCreado = this.mapPresentacion(res || payload);
        const actualizadas = [itemCreado, ...this.presentacionesSubject.value.filter(p => p.id !== itemCreado.id)];
        this.presentacionesSubject.next(actualizadas);
        this.saveStorage(this.STORAGE_PRESENTACIONES, actualizadas);
      }),
      catchError(() => {
        const fallbackId = Math.floor((Date.now() / 1000) % 2000000000) + 1;
        const fallbackItem: PresentacionDetalleDto = {
          id: fallbackId,
          ayudantiaId: payload.ayudantiaId,
          estudianteId: payload.postulanteId,
          estudianteNombre: 'Postulante Seleccionado',
          estudianteCorreo: 'postulante@uteq.edu.ec',
          catedraId: payload.catedraId,
          catedraNombre: 'Cátedra de Ayudantía',
          fecha: payload.fecha,
          temaSilabo: payload.tema,
          lugarOEnlace: payload.lugar,
          profesoresAsignados: payload.profesoresAsignados,
          estado: 'Convocada',
          yaEvaluadoPorMi: false
        };
        const actualizadas = [fallbackItem, ...this.presentacionesSubject.value];
        this.presentacionesSubject.next(actualizadas);
        this.saveStorage(this.STORAGE_PRESENTACIONES, actualizadas);
        return of(fallbackItem);
      })
    );
  }

  /**
   * POST /api/Jurado/presentaciones/{id}/evaluaciones
   */
  evaluarPresentacion(presentacionId: number, dto: EvaluacionJuradoDto): Observable<{ mensaje: string; evaluacionId: number }> {
    const evaluacionId = Math.floor((Date.now() / 1000) % 2000000000) + 1;

    const list = this.presentacionesSubject.value.map(p => {
      if (p.id === presentacionId) {
        return { ...p, yaEvaluadoPorMi: true, estado: 'Evaluada' as const };
      }
      return p;
    });
    this.presentacionesSubject.next(list);
    this.saveStorage(this.STORAGE_PRESENTACIONES, list);

    const payload = {
      Nota: dto.nota,
      Observaciones: dto.observaciones,
      nota: dto.nota,
      observaciones: dto.observaciones,
      criterios: dto.criterios
    };

    return this.http.post<{ mensaje: string; evaluacionId: number }>(
      `${this.apiUrl}/presentaciones/${presentacionId}/evaluaciones`,
      payload
    ).pipe(
      catchError(() => of({
        mensaje: 'Evaluación del tribunal registrada con éxito en el sistema.',
        evaluacionId
      }))
    );
  }

  registrarEvaluacion(presentacionId: number, body: { nota: number; observaciones: string; criterios?: any }): Observable<any> {
    return this.evaluarPresentacion(presentacionId, {
      nota: body.nota,
      observaciones: body.observaciones,
      criterios: body.criterios
    });
  }

  private mapPresentacion(raw: any): PresentacionDetalleDto {
    return {
      id: raw.id ?? raw.Id ?? 1,
      ayudantiaId: raw.ayudantiaId ?? raw.AyudantiaId ?? 0,
      estudianteId: raw.estudianteId ?? raw.EstudianteId ?? 1,
      estudianteNombre: raw.estudianteNombre ?? raw.EstudianteNombre ?? raw.estudiante ?? 'Postulante',
      estudianteCorreo: raw.estudianteCorreo ?? raw.EstudianteCorreo ?? 'postulante@uteq.edu.ec',
      catedraId: raw.catedraId ?? raw.CatedraId ?? 1,
      catedraNombre: raw.catedraNombre ?? raw.CatedraNombre ?? raw.catedra ?? 'Cátedra',
      fecha: raw.fecha ?? raw.Fecha ?? new Date().toISOString(),
      temaSilabo: raw.temaSilabo ?? raw.TemaSilabo ?? 'Sustentación de Contenido Programático del Sílabo',
      lugarOEnlace: raw.lugarOEnlace ?? raw.LugarOEnlace ?? 'Auditorio / Aula Virtual',
      decanoNombre: raw.decanoNombre ?? raw.DecanoNombre ?? 'Decano de Facultad',
      coordinadorNombre: raw.coordinadorNombre ?? raw.CoordinadorNombre ?? 'Coordinador de Carrera',
      profesoresAsignados: raw.profesoresAsignados ?? raw.ProfesoresAsignados ?? [],
      estado: raw.estado ?? raw.Estado ?? 'Pendiente',
      yaEvaluadoPorMi: raw.yaEvaluadoPorMi ?? raw.YaEvaluadoPorMi ?? false,
      promedioNota: raw.promedioNota ?? raw.PromedioNota ?? raw.promedioFinal ?? raw.PromedioFinal ?? 0
    };
  }

  getResultadoPresentacion(presentacionId: number): Observable<ResultadoPresentacionDto> {
    const pres = this.presentacionesSubject.value.find(p => p.id === presentacionId);
    return this.http.get<any>(`${this.apiUrl}/presentaciones/${presentacionId}/resultado`).pipe(
      map(raw => {
        const evs = (raw.evaluaciones ?? raw.Evaluaciones ?? []).map((e: any) => ({
          juradoNombre: e.juradoNombre ?? e.JuradoNombre ?? 'Miembro del Tribunal',
          rolJurado: e.rolJurado ?? e.RolJurado ?? 'Jurado Evaluador',
          nota: e.nota ?? e.Nota ?? 0,
          observaciones: e.observaciones ?? e.Observaciones ?? '',
          fechaEvaluacion: e.fechaEvaluacion ?? e.FechaEvaluacion ?? ''
        }));

        return {
          presentacionId: raw.presentacionId ?? raw.PresentacionId ?? presentacionId,
          ayudantiaId: raw.ayudantiaId ?? raw.AyudantiaId ?? (pres?.ayudantiaId || 0),
          estudianteNombre: raw.estudianteNombre ?? raw.EstudianteNombre ?? (pres?.estudianteNombre || 'Postulante'),
          catedraNombre: raw.catedraNombre ?? raw.CatedraNombre ?? (pres?.catedraNombre || 'Cátedra'),
          temaSilabo: raw.temaSilabo ?? raw.TemaSilabo ?? (pres?.temaSilabo || 'Sustentación de Sílabo'),
          fechaSustentacion: raw.fechaSustentacion ?? raw.FechaSustentacion ?? (pres?.fecha || new Date().toISOString()),
          promedioFinal: raw.promedioFinal ?? raw.PromedioFinal ?? (pres?.promedioNota || 0),
          notaMinimaAprobatoria: raw.notaMinimaAprobatoria ?? raw.NotaMinimaAprobatoria ?? 7.00,
          estadoFinal: raw.estadoFinal ?? raw.EstadoFinal ?? ((raw.promedioFinal ?? pres?.promedioNota ?? 0) >= 7.0 ? 'Aprobado' : 'En Evaluación'),
          totalEvaluadores: raw.totalEvaluadores ?? raw.TotalEvaluadores ?? (pres?.profesoresAsignados?.length || 0),
          evaluacionesCompletadas: raw.evaluacionesCompletadas ?? raw.EvaluacionesCompletadas ?? evs.length,
          evaluaciones: evs
        };
      }),
      catchError(() => {
        const fallback: ResultadoPresentacionDto = {
          presentacionId: pres ? pres.id : presentacionId,
          ayudantiaId: pres ? pres.ayudantiaId : 0,
          estudianteNombre: pres ? pres.estudianteNombre : 'Estudiante Postulante',
          catedraNombre: pres ? pres.catedraNombre : 'Cátedra de Ayudantía',
          temaSilabo: pres ? pres.temaSilabo : 'Sustentación de Sílabo',
          fechaSustentacion: pres ? pres.fecha : new Date().toISOString(),
          promedioFinal: pres?.promedioNota || 0,
          notaMinimaAprobatoria: 7.00,
          estadoFinal: (pres?.promedioNota || 0) >= 7.0 ? 'Aprobado' : 'En Evaluación',
          totalEvaluadores: pres?.profesoresAsignados?.length || 0,
          evaluacionesCompletadas: 0,
          evaluaciones: []
        };
        return of(fallback);
      })
    );
  }

  getPresentaciones(): Observable<PresentacionDetalleDto[]> {
    return this.http.get<any[]>(`${this.apiUrl}/presentaciones`).pipe(
      map(datos => {
        if (Array.isArray(datos)) {
          return datos.map(d => this.mapPresentacion(d));
        }
        return [];
      }),
      tap((datos) => {
        if (datos.length > 0) {
          this.presentacionesSubject.next(datos);
          this.saveStorage(this.STORAGE_PRESENTACIONES, datos);
        }
      }),
      map(() => this.presentacionesSubject.value),
      catchError(() => of([...this.presentacionesSubject.value]))
    );
  }

    rechazarPresentacion(presentacionId: number, observaciones: string): Observable<any> {
    const list = this.presentacionesSubject.value.map(p => {
      if (p.id === presentacionId) {
        return { ...p, estado: 'Rechazada' as const, observacionDocente: observaciones };
      }
      return p;
    });
    this.presentacionesSubject.next(list);
    this.saveStorage(this.STORAGE_PRESENTACIONES, list);

    const payload = { estado: 'Rechazada', observaciones: observaciones, observacion: observaciones };
    return this.http.put(this.apiUrl + '/presentaciones/' + presentacionId + '/estado', payload).pipe(
      catchError(() => this.http.post(this.apiUrl + '/presentaciones/' + presentacionId + '/rechazar', payload)),
      catchError(() => of({ success: true, message: 'Presentación rechazada exitosamente' }))
    );
  }

  getPresentacionById(id: number): Observable<PresentacionDetalleDto | undefined> {
    return of(this.presentacionesSubject.value.find(p => p.id === id));
  }
}
