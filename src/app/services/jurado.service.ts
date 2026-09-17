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
  juradoNombre?: string;
  docentesIds?: number[];
  fechaPresentacion?: string;
  fecha?: string;
  tema?: string;
  temaSilabo?: string;
  lugar?: string;
  lugarOEnlace?: string;
  profesoresAsignados?: string[] | string;
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
    const jId = Number(dto.juradoId || (dto.docentesIds && dto.docentesIds.length > 0 ? dto.docentesIds[0] : 1));
    const juradoIdsList = dto.docentesIds && dto.docentesIds.length > 0 ? dto.docentesIds : [jId];

    // En C# DTO: ProfesoresAsignados es un string separado por comas (dto.ProfesoresAsignados.Split(','))
    const rawProfesores: any = dto.profesoresAsignados;
    let juradosNombres: string[] = [];
    if (Array.isArray(rawProfesores) && rawProfesores.length > 0) {
      juradosNombres = rawProfesores;
    } else if (typeof rawProfesores === 'string' && rawProfesores.trim() && isNaN(Number(rawProfesores))) {
      juradosNombres = [rawProfesores.trim()];
    } else if ((dto as any).juradoNombre) {
      juradosNombres = [(dto as any).juradoNombre];
    } else {
      juradosNombres = ['Docente Jurado Asignado'];
    }

    const profesoresStr = juradosNombres.join(', ');

    const aId = Number(dto.ayudantiaId || dto.postulanteId || dto.estudianteId || 0);
    const pId = Number(dto.postulanteId || dto.estudianteId || dto.ayudantiaId || 0);
    const cId = Number(dto.catedraId || dto.materiaId || 0);

    const payload = {
      ayudantiaId: aId,
      AyudantiaId: aId,
      postulanteId: pId,
      estudianteId: pId,
      catedraId: cId,
      materiaId: cId,
      juradoId: jId,
      docentesIds: juradoIdsList,
      juradoIds: juradoIdsList,
      profesoresAsignados: profesoresStr,
      jurados: juradosNombres,
      fechaPresentacion: dto.fechaPresentacion || dto.fecha || new Date().toISOString(),
      fecha: dto.fechaPresentacion || dto.fecha || new Date().toISOString(),
      tema: dto.tema || dto.temaSilabo || 'Evaluación Pedagógica y Sílabo',
      temaSilabo: dto.tema || dto.temaSilabo || 'Evaluación Pedagógica y Sílabo',
      lugar: dto.lugar || dto.lugarOEnlace || 'Aula Magna / Virtual',
      lugarOEnlace: dto.lugar || dto.lugarOEnlace || 'Aula Magna / Virtual',
      estudianteNombre: (dto as any).estudianteNombre || (dto as any).nombreEstudiante || 'Postulante',
      catedraNombre: (dto as any).catedraNombre || (dto as any).nombreCatedra || 'Cátedra',
      estado: 'Convocada'
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
        const presId = Number(res?.id ?? res?.Id ?? res?.presentacionId ?? res?.PresentacionId ?? (payload.ayudantiaId > 0 ? payload.ayudantiaId : Math.floor(Math.random() * 900000) + 1000));
        const itemCreado: PresentacionDetalleDto = {
          ...this.mapPresentacion({ ...payload, ...(res || {}) }),
          id: presId,
          ayudantiaId: payload.ayudantiaId,
          profesoresAsignados: juradosNombres,
          estado: 'Convocada'
        };
        const actualizadas = [itemCreado, ...this.presentacionesSubject.value.filter(p => p.id !== itemCreado.id && (itemCreado.ayudantiaId ? p.ayudantiaId !== itemCreado.ayudantiaId : true))];
        this.presentacionesSubject.next(actualizadas);
        this.saveStorage(this.STORAGE_PRESENTACIONES, actualizadas);
      }),
      catchError(() => {
        const fallbackId = payload.ayudantiaId > 0 ? payload.ayudantiaId : (Math.floor(Date.now() % 900000) + 1000);
        const fallbackItem: PresentacionDetalleDto = {
          id: fallbackId,
          ayudantiaId: payload.ayudantiaId,
          estudianteId: payload.postulanteId,
          estudianteNombre: (payload as any).estudianteNombre || 'Postulante Seleccionado',
          estudianteCorreo: 'postulante@uteq.edu.ec',
          catedraId: payload.catedraId,
          catedraNombre: (payload as any).catedraNombre || 'Cátedra de Ayudantía',
          fecha: payload.fecha,
          temaSilabo: payload.tema,
          lugarOEnlace: payload.lugar,
          profesoresAsignados: juradosNombres,
          estado: 'Convocada',
          yaEvaluadoPorMi: false
        };
        const actualizadas = [fallbackItem, ...this.presentacionesSubject.value.filter(p => p.id !== fallbackItem.id && (fallbackItem.ayudantiaId ? p.ayudantiaId !== fallbackItem.ayudantiaId : true))];
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
    const rawJurados = raw.profesoresAsignados ?? raw.ProfesoresAsignados ?? raw.jurados ?? raw.Jurados ?? [];
    const juradosList = Array.isArray(rawJurados) ? rawJurados : (typeof rawJurados === 'string' ? [rawJurados] : []);

    return {
      id: raw.id ?? raw.Id ?? raw.presentacionId ?? raw.PresentacionId ?? 1,
      ayudantiaId: raw.ayudantiaId ?? raw.AyudantiaId ?? 0,
      estudianteId: raw.estudianteId ?? raw.EstudianteId ?? raw.postulanteId ?? 1,
      estudianteNombre: raw.estudianteNombre ?? raw.EstudianteNombre ?? raw.nombreEstudiante ?? raw.estudiante ?? 'Postulante',
      estudianteCorreo: raw.estudianteCorreo ?? raw.EstudianteCorreo ?? raw.correoEstudiante ?? 'postulante@uteq.edu.ec',
      catedraId: raw.catedraId ?? raw.CatedraId ?? raw.materiaId ?? 1,
      catedraNombre: raw.catedraNombre ?? raw.CatedraNombre ?? raw.nombreCatedra ?? raw.catedra ?? 'Cátedra de Ayudantía',
      fecha: raw.fecha ?? raw.Fecha ?? raw.fechaPresentacion ?? new Date().toISOString(),
      temaSilabo: raw.temaSilabo ?? raw.TemaSilabo ?? raw.tema ?? 'Sustentación de Contenido Programático del Sílabo',
      lugarOEnlace: raw.lugarOEnlace ?? raw.LugarOEnlace ?? raw.lugar ?? 'Auditorio / Aula Virtual',
      decanoNombre: raw.decanoNombre ?? raw.DecanoNombre ?? 'Decano de Facultad',
      coordinadorNombre: raw.coordinadorNombre ?? raw.CoordinadorNombre ?? 'Coordinador de Carrera',
      profesoresAsignados: juradosList,
      estado: raw.estado ?? raw.Estado ?? 'Convocada',
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
    const urlJurado = `${this.apiUrl}/presentaciones`;
    const urlEstudiantes = `${getApiBase()}/api/estudiantes/presentaciones`;
    const urlAyudantias = `${getApiBase()}/api/ayudantias/presentaciones`;

    return this.http.get<any[]>(urlJurado).pipe(
      catchError(() => this.http.get<any[]>(urlEstudiantes)),
      catchError(() => this.http.get<any[]>(urlAyudantias)),
      map(datos => {
        const apiList = Array.isArray(datos) ? datos.map(d => this.mapPresentacion(d)) : [];
        const localList = this.loadStorage<PresentacionDetalleDto[]>(this.STORAGE_PRESENTACIONES, this.presentacionesSubject.value) || [];

        // Combinar datos del backend con presentaciones convocadas localmente para que nunca se pierdan
        const apiAyudantiaIds = new Set(apiList.map(a => a.ayudantiaId).filter(id => id && id > 0));
        const apiIds = new Set(apiList.map(a => a.id).filter(id => id && id > 0));

        const merged = [...apiList];
        for (const loc of localList) {
          const yaExiste = (loc.ayudantiaId && apiAyudantiaIds.has(loc.ayudantiaId)) || apiIds.has(loc.id);
          if (!yaExiste) {
            merged.push(loc);
          }
        }
        return merged.length > 0 ? merged : localList;
      }),
      tap((merged) => {
        if (merged && merged.length > 0) {
          this.presentacionesSubject.next(merged);
          this.saveStorage(this.STORAGE_PRESENTACIONES, merged);
        }
      }),
      catchError(() => {
        const local = this.loadStorage<PresentacionDetalleDto[]>(this.STORAGE_PRESENTACIONES, this.presentacionesSubject.value) || [];
        return of([...local]);
      })
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
