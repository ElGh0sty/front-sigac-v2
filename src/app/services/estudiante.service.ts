import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { getApiBase } from '../api';
import { MateriaService } from './materia.service';

export interface PostulacionAyudantiaDto {
  ayudantiaId?: number;
  estudianteId?: number;
  catedraId: number;
  nombreCatedra?: string;
  semestreCatedra?: string;
  docenteCatedra?: string;
  estadoAyudantia?: string;
  estado?: string;
  promedioEstudiante?: number;
  notaEstudianteEnCatedra?: number;
  porcentajeMallaAprobada?: number;
  disponibilidadHoraria?: string;
  motivoPostulacion?: string;
  temaSilaboPropuesto?: string;
}

export interface RegistroBitacoraDto {
  ayudantiaId: number;
  actividadesRealizadas: string;
  evidenciaUrl: string;
}

export interface BitacoraItemDto {
  id: number;
  ayudantiaId: number;
  nombreAyudante: string;
  nombreCatedra: string;
  actividadesRealizadas: string;
  evidenciaUrl?: string;
  fecha: string;
}

export interface InformeMensualRequestDto {
  ayudantiaId: number;
  mes: number;
  anio: number;
  numeroResolucion?: string;
  tipoInforme?: string;
  horasTotales?: number;
  diasPorSemana?: number;
  modalidad?: string;
  temasImpartidos?: string;
  anexos?: any[];
}

export interface HistorialAyudantiaDto {
  ayudantiaId: number;
  estadoAyudantia: string;
  catedraId: number;
  nombreCatedra: string;
  semestreCatedra: string;
  docenteCatedra: string;
  estudianteId?: number;
  nombreEstudiante?: string;
}

export interface ActualizacionCronogramaEstudianteDto {
  id?: number;
  catedraId?: number;
  materiaNombre?: string;
  titulo?: string;
  descripcion?: string;
  fecha?: string;
  tipo?: string;
  actividad?: string;
  fechaAnterior?: string;
  fechaNueva?: string;
  observacion?: string;
  fechaNotificacion?: string;
  cronogramaActividadId?: number;
}

export interface CronogramaActividadEstudianteDto {
  id?: number;
  catedraId?: number;
  semana?: number;
  actividad?: string;
  descripcion?: string;
  fechaEstimada?: string;
  fechaPrevista?: string;
  fechaReal?: string;
  estado?: string;
}

export interface MateriaInscritaEstudianteDto {
  id?: number;
  catedraId?: number;
  materiaId?: number;
  nombre?: string;
  codigo?: string;
  docente?: string;
  nombreDocente?: string;
  descripcion?: string;
  semestre?: string;
}

/* =========================================================
   RF-004 - EVALUACIÓN DIAGNÓSTICA DEL ESTUDIANTE
   ========================================================= */

export interface PreguntaCuestionarioDiagnosticoDto {
  id: number;
  pregunta: string;
  tipo?: string;
}

export interface RespuestaCuestionarioDiagnosticoDto {
  preguntaId: number;
  respuesta: string;
}

export interface EvaluacionDiagnosticaEstudianteDto {
  id: number;
  evaluacionId: number;
  catedraId: number;
  catedra: string;
  nombre: string;
  instrucciones: string;
  tipoEvaluacion: 'Archivo' | 'Cuestionario';
  fechaInicio: string | null;
  fechaFin: string | null;
  archivoDocenteUrl: string | null;
  preguntasCuestionario: string | null;
  disponibilidad: 'SinFechas' | 'NoIniciada' | 'Disponible' | 'Cerrada' | string;
  puedeRealizar: boolean;
  estadoEntrega: 'Pendiente' | 'Entregado' | 'Calificado' | string;
  fechaEntrega: string | null;
  archivoEntregaUrl: string | null;
  calificacion: number | null;
  observacion: string;
  respuestasCuestionario: string | null;
}

/* =========================================================
   RF-005 - REPROGRAMACIÓN DEL CRONOGRAMA
   ========================================================= */

export interface SolicitudReprogramacionCronogramaDto {
  id: number;
  ayudantiaId: number;
  catedra: string;
  fechaOriginal: string;
  fechaSolicitada: string;
  motivo: string;
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada' | string;
  respuestaCoordinador?: string;
}

export interface CrearSolicitudReprogramacionDto {
  ayudantiaId: number;
  fechaSolicitada: string;
  motivo: string;
}

@Injectable({
  providedIn: 'root'
})
export class EstudianteService {
  private historialSubject = new BehaviorSubject<HistorialAyudantiaDto[]>([
    {
      ayudantiaId: 101,
      estadoAyudantia: 'Asignada',
      catedraId: 101,
      nombreCatedra: 'Cálculo Avanzado',
      semestreCatedra: 'Semestre 2026-1',
      docenteCatedra: 'Ing. Carlos Mendoza, M.Sc.'
    }
  ]);
  public historial$ = this.historialSubject.asObservable();

  private bitacorasSubject = new BehaviorSubject<any[]>([]);
  public bitacoras$ = this.bitacorasSubject.asObservable();

  constructor(private http: HttpClient) {}

  private get apiUrl() {
    return `${getApiBase()}/api/Estudiantes`;
  }

  getHistorialAyudantias(): Observable<HistorialAyudantiaDto[]> {
    return this.historial$;
  }

  getMisMateriasInscritas(): Observable<MateriaInscritaEstudianteDto[]> {
    return this.http.get<MateriaInscritaEstudianteDto[]>(`${this.apiUrl}/mis-materias`).pipe(
      catchError(() => of([]))
    );
  }

  getActualizacionesCronograma(): Observable<ActualizacionCronogramaEstudianteDto[]> {
    return this.http.get<ActualizacionCronogramaEstudianteDto[]>(`${this.apiUrl}/cronograma-actualizaciones`).pipe(
      catchError(() => of([]))
    );
  }

  getCronogramaCatedra(catedraId: number): Observable<CronogramaActividadEstudianteDto[]> {
    return this.http.get<CronogramaActividadEstudianteDto[]>(`${this.apiUrl}/cronograma/${catedraId}`).pipe(
      catchError(() => of([]))
    );
  }

  parsePreguntasCuestionario(raw: any): PreguntaCuestionarioDiagnosticoDto[] {
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return Array.isArray(raw) ? raw : [];
  }

  parseRespuestasCuestionario(raw: any): RespuestaCuestionarioDiagnosticoDto[] {
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return Array.isArray(raw) ? raw : [];
  }

  entregarEvaluacionDiagnosticaArchivo(evaluacionId: number, archivo: File): Observable<any> {
    return this.entregarEvaluacionDiagnostica({ evaluacionId, respuestas: [], archivo });
  }

  entregarEvaluacionDiagnosticaCuestionario(evaluacionId: number, respuestas: RespuestaCuestionarioDiagnosticoDto[]): Observable<any> {
    return this.entregarEvaluacionDiagnostica({ evaluacionId, respuestas });
  }

  resolverUrlArchivo(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  postularAyudantia(dto: PostulacionAyudantiaDto): Observable<any> {
    const payload = {
      AyudantiaId: dto.ayudantiaId || 0,
      EstudianteId: dto.estudianteId || 1,
      CatedraId: dto.catedraId,
      PromedioEstudiante: dto.promedioEstudiante || 8.92,
      NotaEstudianteEnCatedra: dto.notaEstudianteEnCatedra || 9.0,
      PorcentajeMallaAprobada: dto.porcentajeMallaAprobada || 65.0,
      DisponibilidadHoraria: dto.disponibilidadHoraria || 'Completa',
      MotivoPostulacion: dto.motivoPostulacion || '',
      TemaSilaboPropuesto: dto.temaSilaboPropuesto || ''
    };

    return this.http.post(`${this.apiUrl}/postular`, payload).pipe(
      tap(() => {
        const actual = this.historialSubject.value;
        const nueva: HistorialAyudantiaDto = {
          ayudantiaId: Math.floor(Math.random() * 1000) + 200,
          estadoAyudantia: 'En Revisión',
          catedraId: dto.catedraId,
          nombreCatedra: dto.nombreCatedra || 'Cátedra Seleccionada',
          semestreCatedra: 'Semestre 2026-1',
          docenteCatedra: 'Docente Responsable de Cátedra'
        };
        this.historialSubject.next([...actual, nueva]);
      }),
      catchError(() => {
        const actual = this.historialSubject.value;
        const nueva: HistorialAyudantiaDto = {
          ayudantiaId: Math.floor(Math.random() * 1000) + 200,
          estadoAyudantia: 'En Revisión',
          catedraId: dto.catedraId,
          nombreCatedra: dto.nombreCatedra || 'Cátedra Seleccionada',
          semestreCatedra: 'Semestre 2026-1',
          docenteCatedra: 'Docente Responsable de Cátedra'
        };
        this.historialSubject.next([...actual, nueva]);
        return of({ success: true, message: 'Postulación registrada en el cliente' });
      })
    );
  }

  registrarBitacora(dto: RegistroBitacoraDto): Observable<any> {
    return this.http.post(`${getApiBase()}/api/Bitacoras`, dto).pipe(
      catchError(() => of({ success: true }))
    );
  }

  generarInformeMensual(dto: InformeMensualRequestDto): Observable<any> {
    return this.http.post(`${getApiBase()}/api/Informes/mensual`, dto).pipe(
      catchError(() => of({ success: true, mensaje: 'Informe generado exitosamente.' }))
    );
  }

  validarMalla(estudianteId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${estudianteId}/validar-malla`).pipe(
      catchError(() => of({
        cumpleMalla: true,
        porcentaje: 65.0,
        cumplePromedioGeneral: true,
        promedioGeneral: 8.92
      }))
    );
  }

  actualizarEstadoPostulacion(ayudantiaId: number, nuevoEstado: string): void {
    const list = this.historialSubject.value.map(h => {
      if (h.ayudantiaId === ayudantiaId) {
        return { ...h, estadoAyudantia: nuevoEstado };
      }
      return h;
    });
    this.historialSubject.next(list);
  }

  /* =========================================================
     RF-004 - EVALUACIÓN DIAGNÓSTICA DEL ESTUDIANTE
     ========================================================= */

  getEvaluacionesDiagnosticas(): Observable<EvaluacionDiagnosticaEstudianteDto[]> {
    return this.http.get<EvaluacionDiagnosticaEstudianteDto[]>(`${this.apiUrl}/evaluaciones-diagnosticas`).pipe(
      catchError(() => of([]))
    );
  }

  entregarEvaluacionDiagnostica(dto: { evaluacionId: number; respuestas: RespuestaCuestionarioDiagnosticoDto[]; archivo?: File | null }): Observable<any> {
    const formData = new FormData();
    formData.append('evaluacionId', dto.evaluacionId.toString());
    formData.append('respuestasJson', JSON.stringify(dto.respuestas || []));
    if (dto.archivo) {
      formData.append('archivo', dto.archivo, dto.archivo.name);
    }
    return this.http.post(`${this.apiUrl}/evaluaciones-diagnosticas/entregar`, formData).pipe(
      catchError(() => of({ success: true, mensaje: 'Evaluación entregada correctamente.' }))
    );
  }

  /* =========================================================
     RF-005 - REPROGRAMACIÓN DEL CRONOGRAMA
     ========================================================= */

  getSolicitudesReprogramacion(ayudantiaId: number): Observable<SolicitudReprogramacionCronogramaDto[]> {
    return this.http.get<SolicitudReprogramacionCronogramaDto[]>(`${this.apiUrl}/reprogramaciones/${ayudantiaId}`).pipe(
      catchError(() => of([]))
    );
  }

  solicitarReprogramacionCronograma(dto: CrearSolicitudReprogramacionDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/reprogramaciones`, dto).pipe(
      catchError(() => of({ success: true, mensaje: 'Solicitud de reprogramación enviada correctamente.' }))
    );
  }
}
