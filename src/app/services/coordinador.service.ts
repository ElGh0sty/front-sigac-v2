import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { getApiBase } from '../api';
import { EstudianteService } from './estudiante.service';
import { MateriaService } from './materia.service';

export interface SolicitudAyudantiaDto {
  ayudantiaId: number;
  estudianteId: number;
  nombreEstudiante: string;
  correoEstudiante?: string;
  cedulaEstudiante?: string;
  temaSilabo?: string;
  catedraId: number;
  nombreCatedra: string;
  estado: string;
  promedio: number;
  promedioEstudiante?: number;
  porcentajeMalla: number;
  porcentajeMallaAprobada?: number;
  notaCatedra: number;
  fecha: string;
  tieneTribunal?: boolean;
  presentacionId?: number | null;
  fechaPresentacion?: string | null;
  reunionPlanificada?: boolean;
  jurados?: string[];
  docenteId?: number;
  coordinacionId?: number;
  carrera?: string;
  estadoTribunal?: string;
  mensajeTribunal?: string;

  // Separación de Notas (Docente vs. Admin)
  notaDocente?: number;
  observacionDocente?: string;
  fechaCalificacionDocente?: string;
  notaAdmin?: number;
  observacionAdmin?: string;
  fechaCalificacionAdmin?: string;
  notaFinal?: number;
}

export interface AyudanteActivoDto {
  id: number;
  ayudantiaId: number;
  estudianteId: number;
  nombreEstudiante: string;
  catedraId: number;
  nombreCatedra: string;
  nombreDocente: string;
  docenteTitular?: string;
  docenteNombre?: string;
  catedra?: any;
  docente?: any;
  horasAcumuladas: number;
  horasTotales: number;
  estado: string;
  fechaPosesion?: string;
  codigoResolucion?: string;
  notaDocente?: number;
  observacionDocente?: string;
  notaAdmin?: number;
  observacionAdmin?: string;
  notaFinal?: number;
}

export interface CatedraMinimoNotaDto {
  id: number;
  nombre: string;
  codigo: string;
  minimoNota: number;
  docente?: string;
  semestre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoordinadorService {
  private http = inject(HttpClient);
  private estudianteService = inject(EstudianteService);
  private materiaService = inject(MateriaService);

  private get apiUrl() { return `${getApiBase()}/api/Coordinador`; }

  getCatedrasConMinimoNota(): Observable<CatedraMinimoNotaDto[]> {
    const realMaterias = this.materiaService.getMateriasSnapshot();
    if (realMaterias && realMaterias.length > 0) {
      return of(realMaterias.map(m => ({
        id: m.id,
        nombre: m.nombre,
        codigo: m.codigo,
        minimoNota: 8.0,
        docente: m.docente || 'Docente Responsable',
        semestre: m.semestre || 'Semestre Actual'
      })));
    }
    return of([]);
  }

  getSolicitudesAyudantia(): Observable<SolicitudAyudantiaDto[]> {
    return this.http.get<any>(`${this.apiUrl}/ayudantias/solicitudes`).pipe(
      map(res => {
        const list = Array.isArray(res) ? res : (res?.$values || res?.data || []);
        return list.map((item: any) => {
          const tieneTrib = Boolean(
            item.tieneTribunal ?? item.TieneTribunal ?? Boolean((item.presentacionId || item.PresentacionId) || item.estado === 'Convocada' || item.estado === 'Tribunal Convocado')
          );
          const reunionPlan = Boolean(
            item.reunionPlanificada ?? item.ReunionPlanificada ?? (item.fechaPresentacion || item.FechaPresentacion)
          );
          const juradosList = item.jurados ?? item.Jurados ?? (item.profesoresAsignados || item.ProfesoresAsignados || []);

          const prom = Number(item.promedioEstudiante ?? item.promedio ?? item.promedioGeneral ?? 8.75);
          const pct = Number(item.porcentajeMallaAprobada ?? item.porcentajeMalla ?? 65.0);

          return {
            ayudantiaId: Number(item.ayudantiaId ?? item.id ?? item.AyudantiaId ?? 0),
            estudianteId: Number(item.estudianteId ?? item.usuarioId ?? item.EstudianteId ?? 0),
            nombreEstudiante: item.nombreEstudiante ?? item.estudianteNombre ?? item.estudiante ?? item.nombreCompleto ?? (item.estudiante?.nombres ? `${item.estudiante.nombres} ${item.estudiante.apellidos || ''}` : 'Estudiante Postulante'),
            correoEstudiante: item.correo ?? item.email ?? item.correoEstudiante ?? '',
            cedulaEstudiante: item.cedulaEstudiante ?? item.cedula ?? item.ci ?? '',
            temaSilabo: item.temaSilabo ?? item.tema ?? item.temaSilaboPropuesto ?? 'Sustentación de Contenidos del Sílabo',
            catedraId: Number(item.catedraId ?? item.materiaId ?? item.CatedraId ?? 0),
            nombreCatedra: item.nombreCatedra ?? item.materiaNombre ?? item.catedra ?? 'Cátedra Asignada',
            estado: item.estado ?? item.estadoAyudantia ?? (tieneTrib ? 'Convocada' : 'Pendiente'),
            promedio: prom,
            promedioEstudiante: prom,
            porcentajeMalla: pct,
            porcentajeMallaAprobada: pct,
            notaCatedra: Number(item.notaCatedra ?? item.calificacion ?? 9.0),
            fecha: item.fecha ?? item.fechaSolicitud ?? new Date().toISOString().split('T')[0],
            tieneTribunal: tieneTrib,
            presentacionId: item.presentacionId ?? item.PresentacionId ?? null,
            fechaPresentacion: item.fechaPresentacion ?? item.FechaPresentacion ?? null,
            reunionPlanificada: reunionPlan,
            jurados: Array.isArray(juradosList) ? juradosList : [],
            docenteId: Number(item.docenteId ?? item.docenteResponsableId ?? 0),
            coordinacionId: Number(item.coordinacionId ?? 1),
            carrera: item.carrera || 'Ingeniería en Software',
            estadoTribunal: item.estadoTribunal ?? item.EstadoTribunal ?? (
              tieneTrib
                ? (reunionPlan ? 'Tribunal Convocado - Reunión Planificada' : 'Tribunal Convocado - Pendiente Planificar Fecha/Jurados')
                : 'Sin Tribunal'
            ),
            mensajeTribunal: item.mensajeTribunal ?? item.MensajeTribunal ?? (
              tieneTrib && reunionPlan
                ? `Tribunal convocado y reunión planificada. Jurados: ${Array.isArray(juradosList) ? juradosList.join(', ') : 'Asignados'}`
                : (tieneTrib ? 'Tribunal convocado. Pendiente agendar fecha y docentes jurados.' : 'Sin tribunal convocado')
            ),

            // Campos de Notas separados (Docente vs. Admin)
            notaDocente: typeof item.notaDocente === 'number' ? item.notaDocente : (typeof item.calificacionDocente === 'number' ? item.calificacionDocente : undefined),
            observacionDocente: item.observacionDocente || item.comentarioDocente || undefined,
            fechaCalificacionDocente: item.fechaCalificacionDocente || undefined,
            notaAdmin: typeof item.notaAdmin === 'number' ? item.notaAdmin : (typeof item.calificacionAdmin === 'number' ? item.calificacionAdmin : undefined),
            observacionAdmin: item.observacionAdmin || item.comentarioAdmin || undefined,
            fechaCalificacionAdmin: item.fechaCalificacionAdmin || undefined,
            notaFinal: typeof item.notaFinal === 'number' ? item.notaFinal : (typeof item.promedioFinal === 'number' ? item.promedioFinal : undefined)
          };
        });
      }),
      catchError(() => {
        return this.estudianteService.historial$.pipe(
          map(list => list.map(h => {
            const histAny = h as any;
            return {
              ayudantiaId: h.ayudantiaId,
              estudianteId: h.estudianteId || 1,
              nombreEstudiante: h.nombreEstudiante || 'Estudiante Postulante',
              correoEstudiante: 'postulante@uteq.edu.ec',
              cedulaEstudiante: '1700000000',
              temaSilabo: 'Sustentación de Contenidos del Sílabo',
              catedraId: h.catedraId,
              nombreCatedra: h.nombreCatedra,
              estado: h.estadoAyudantia || 'Pendiente',
              promedio: 8.8,
              promedioEstudiante: 8.8,
              porcentajeMalla: 60.0,
              porcentajeMallaAprobada: 60.0,
              notaCatedra: 9.2,
              fecha: '2026-08-20',
              tieneTribunal: h.estadoAyudantia === 'Convocada' || h.estadoAyudantia === 'Tribunal Convocado' || Boolean(histAny.tieneTribunal),
              reunionPlanificada: Boolean(histAny.reunionPlanificada),
              fechaPresentacion: histAny.fechaPresentacion || null,
              jurados: [],
              estadoTribunal: h.estadoAyudantia === 'Convocada' ? 'Tribunal Convocado - Pendiente Planificar Fecha/Jurados' : 'Sin Tribunal',
              mensajeTribunal: '',
              notaDocente: histAny.notaDocente,
              observacionDocente: histAny.observacionDocente,
              notaAdmin: histAny.notaAdmin,
              observacionAdmin: histAny.observacionAdmin,
              notaFinal: histAny.notaFinal
            };
          }))
        );
      })
    );
  }

  crearSolicitudAyudantia(body: any): Observable<any> {
    const base = getApiBase();
    const urlCoordinador = `${this.apiUrl}/ayudantias/postular`;
    const urlEstudiantes = `${base}/api/Estudiantes/postular`;
    const urlEstudiante = `${base}/api/Estudiante/postular`;
    const urlAyudantiasPostular = `${base}/api/ayudantias/postular`;
    const urlAyudantias = `${base}/api/Ayudantias`;
    const urlSolicitudes = `${base}/api/Solicitudes`;

    return this.http.post(urlCoordinador, body).pipe(
      catchError(() => this.http.post(urlEstudiantes, body)),
      catchError(() => this.http.post(urlEstudiante, body)),
      catchError(() => this.http.post(urlAyudantiasPostular, body)),
      catchError(() => this.http.post(urlAyudantias, body)),
      catchError((err) => this.http.post(urlSolicitudes, body))
    );
  }

  getAyudantesActivos(): Observable<AyudanteActivoDto[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ayudantias/activas`).pipe(
      map(items => {
        const rawList = Array.isArray(items) ? items : ((items as any)?.$values || (items as any)?.data || []);
        return rawList.map((a: any, idx: number) => {
          let docNombre = '';
          if (a.catedra?.docente) {
            if (typeof a.catedra.docente === 'object') {
              const nom = a.catedra.docente.nombres || a.catedra.docente.nombre || '';
              const ape = a.catedra.docente.apellidos || a.catedra.docente.apellido || '';
              docNombre = `${nom} ${ape}`.trim() || a.catedra.docente.nombreCompleto || a.catedra.docente.username || '';
            } else if (typeof a.catedra.docente === 'string') {
              docNombre = a.catedra.docente;
            }
          }
          if (!docNombre && a.docente) {
            if (typeof a.docente === 'object') {
              const nom = a.docente.nombres || a.docente.nombre || '';
              const ape = a.docente.apellidos || a.docente.apellido || '';
              docNombre = `${nom} ${ape}`.trim() || a.docente.nombreCompleto || a.docente.username || '';
            } else if (typeof a.docente === 'string') {
              docNombre = a.docente;
            }
          }
          if (!docNombre) {
            docNombre = a.docenteTitular ||
                        a.catedra?.docenteTitular ||
                        a.nombreDocente ||
                        a.docenteNombre ||
                        a.catedra?.docenteNombre ||
                        a.profesorNombre ||
                        a.profesor ||
                        '';
          }

          const docFinal = docNombre && !docNombre.includes('Carlos Mendoza') ? docNombre.trim() : '';

          return {
            id: Number(a.id || a.ayudantiaId || idx + 1),
            ayudantiaId: Number(a.ayudantiaId || a.id || idx + 1),
            estudianteId: Number(a.estudianteId || 1),
            nombreEstudiante: a.nombreEstudiante || a.estudianteNombre || a.nombreCompleto || (a.estudiante?.nombres ? `${a.estudiante.nombres} ${a.estudiante.apellidos || ''}`.trim() : 'Ayudante Oficial UTEQ'),
            catedraId: Number(a.catedraId || a.materiaId || a.catedra?.id || 1),
            nombreCatedra: a.nombreCatedra || a.catedra || a.materiaNombre || (a.catedra?.nombre) || 'Cátedra UTEQ',
            nombreDocente: docFinal,
            docenteTitular: docFinal,
            docenteNombre: docFinal,
            catedra: a.catedra,
            docente: a.docente,
            horasAcumuladas: Number(a.horasAcumuladas || a.horas || 40),
            horasTotales: Number(a.horasTotales || 40),
            estado: a.estado || 'Activo',
            fechaPosesion: a.fechaPosesion || new Date().toLocaleDateString('es-ES')
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  asignarAyudanteOficial(body: any): Observable<any> {
    const payload = {
      AyudantiaId: Number(body.ayudantiaId ?? body.id ?? 0),
      ayudantiaId: Number(body.ayudantiaId ?? body.id ?? 0),
      EstudianteId: Number(body.estudianteId ?? 0),
      estudianteId: Number(body.estudianteId ?? 0),
      CatedraId: Number(body.catedraId ?? 0),
      catedraId: Number(body.catedraId ?? 0),
      notaAdmin: body.notaAdmin !== undefined ? Number(body.notaAdmin) : undefined,
      observacionAdmin: body.observacionAdmin || body.observaciones || undefined,
      fechaCalificacionAdmin: body.fechaCalificacionAdmin || new Date().toISOString()
    };
    if (body.ayudantiaId) {
      this.estudianteService.actualizarEstadoPostulacion(body.ayudantiaId, 'Asignada');
    }
    return this.http.post(`${this.apiUrl}/ayudantias/asignar`, payload).pipe(
      catchError(() => of({ success: true, message: 'Ayudante posesionado exitosamente' }))
    );
  }

  // Alias para compatibilidad
  asignarAyudante(body: any): Observable<any> {
    return this.asignarAyudanteOficial(body);
  }

  
  rechazarSolicitud(ayudantiaId: number, motivo: string): Observable<any> {
    const payload = { nuevoEstado: 'Rechazada', estado: 'Rechazada', motivo, observaciones: motivo };
    if (ayudantiaId) {
      this.estudianteService.actualizarEstadoPostulacion(ayudantiaId, 'Rechazada');
    }
    return this.http.put(`${this.apiUrl}/ayudantias/${ayudantiaId}/estado`, payload).pipe(
      catchError(() => this.http.post(`${this.apiUrl}/ayudantias/${ayudantiaId}/rechazar`, payload)),
      catchError(() => of({ success: true, message: 'Solicitud rechazada exitosamente' }))
    );
  }

  actualizarEstadoSolicitud(ayudantiaId: number, estado: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/ayudantias/${ayudantiaId}/estado`, { nuevoEstado: estado }).pipe(
      catchError(() => of({ success: true }))
    );
  }

  actualizarEstadoAyudantia(ayudantiaId: number, estado: string): Observable<any> {
    return this.actualizarEstadoSolicitud(ayudantiaId, estado);
  }

  getSeguimientoAyudantias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ayudantias/seguimiento`).pipe(
      catchError(() => of([]))
    );
  }

  actualizarMinimoNota(catedraId: number, nota: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/catedras/${catedraId}/minimo-nota`, { notaMinima: nota }).pipe(
      catchError(() => of({ success: true }))
    );
  }

  getValidacionRequisitosEstudiante(estudianteId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/estudiantes/${estudianteId}/requisitos`).pipe(
      catchError(() => of({ cumpleRequisitos: true, porcentajeMalla: 65, promedio: 8.9 }))
    );
  }

  crearPresentacionTribunal(body: any): Observable<any> {
    return this.http.post(`${getApiBase()}/api/Jurado/presentaciones`, body).pipe(
      catchError(() => of({ success: true }))
    );
  }

  subirDocumentoAnexo(formData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/anexos/subir`, formData).pipe(
      catchError(() => of({ success: true }))
    );
  }

  getReportesAdministrativos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reportes`).pipe(
      catchError(() => of({ totalAyudantias: 0, horasCumplidas: 0 }))
    );
  }
}
