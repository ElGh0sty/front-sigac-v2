import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { getApiBase } from '../api';

export interface ActividadDetalleDto {
  id: number;
  catedraId: number;
  catedraNombre: string;
  docenteNombre: string;
  titulo: string;
  descripcion: string;
  fechaPublicacion: string;
  fechaLimite: string;
  ponderacionPuntos: number;
  tipo: 'Taller' | 'Proyecto' | 'Laboratorio' | 'Investigación';
  formatoPermitido: string; // e.g. '.pdf, .docx, .zip'
}

export interface EntregaEstudianteDto {
  id: number;
  actividadId: number;
  estudianteId: number;
  estudianteNombre: string;
  estudianteMatricula?: string;
  estudianteCorreo?: string;
  estado: 'Entregado' | 'Pendiente' | 'Calificado' | 'Atrasado';
  fechaEntrega?: string;
  nombreArchivo?: string;
  tamanoArchivo?: string;
  archivoUrl?: string;
  calificacion?: number; // 0 - 10 o 0 - 100
  retroalimentacion?: string;
  fechaCalificacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActividadService {
  private http = inject(HttpClient);

  private get baseUrl() {
    return getApiBase();
  }

  // Actividades académicas en memoria
  private actividadesMock: ActividadDetalleDto[] = [
    {
      id: 1,
      catedraId: 201,
      catedraNombre: 'Cálculo Avanzado',
      docenteNombre: 'Dra. Evelyn Vance',
      titulo: 'Taller 3: Aplicaciones de Integrales de Superficie y Flujo Vectorial',
      descripcion: 'Desarrollar los ejercicios 1 al 8 de la Guía de Prácticas. Demostrar rigurosamente el Teorema de la Divergencia de Gauss con sus respectivas representaciones gráficas en software matemático.',
      fechaPublicacion: '2026-03-01T08:00:00',
      fechaLimite: '2026-03-25T23:59:00',
      ponderacionPuntos: 10.0,
      tipo: 'Taller',
      formatoPermitido: '.pdf, .zip'
    },
    {
      id: 2,
      catedraId: 202,
      catedraNombre: 'Estructuras de Datos y Algoritmos',
      docenteNombre: 'Ing. Carlos Mendoza',
      titulo: 'Proyecto 1: Implementación de Árboles Rojo-Negro y B-Trees',
      descripcion: 'Implementar en C++ o Java las operaciones de inserción, rotación y eliminación manteniendo invariantes de balanceo. Incluir informe comparativo de tiempos de ejecución con conjuntos de 100K elementos.',
      fechaPublicacion: '2026-03-05T10:00:00',
      fechaLimite: '2026-03-28T23:59:00',
      ponderacionPuntos: 10.0,
      tipo: 'Proyecto',
      formatoPermitido: '.zip, .pdf'
    },
    {
      id: 3,
      catedraId: 203,
      catedraNombre: 'Física Clásica',
      docenteNombre: 'Dr. Fernando Ortiz',
      titulo: 'Laboratorio 2: Conservación del Momento Angular en Cuerpos Rígidos',
      descripcion: 'Reporte experimental de la sesión de laboratorio con análisis de incertidumbre, propagación de errores y conclusiones.',
      fechaPublicacion: '2026-03-10T09:00:00',
      fechaLimite: '2026-03-20T23:59:00',
      ponderacionPuntos: 10.0,
      tipo: 'Laboratorio',
      formatoPermitido: '.pdf'
    }
  ];

  // Base de entregas nominales por estudiante para actividades
  private entregasMock: Record<number, EntregaEstudianteDto[]> = {
    1: [
      {
        id: 101,
        actividadId: 1,
        estudianteId: 1,
        estudianteNombre: 'Alejandro David García Mendoza',
        estudianteMatricula: 'EST-2022-045',
        estudianteCorreo: 'alejandro.garcia@universidad.edu',
        estado: 'Calificado',
        fechaEntrega: '2026-03-18T16:42:00',
        nombreArchivo: 'Taller3_Calculo_AlejandroGarcia.pdf',
        tamanoArchivo: '2.4 MB',
        archivoUrl: '#',
        calificacion: 9.75,
        retroalimentacion: 'Excelente deducción matemática del flujo en el cono truncado. Gráficas impecables.',
        fechaCalificacion: '2026-03-19T10:15:00'
      },
      {
        id: 102,
        actividadId: 1,
        estudianteId: 2,
        estudianteNombre: 'Valeria Sofía Ramos Salazar',
        estudianteMatricula: 'EST-2022-089',
        estudianteCorreo: 'valeria.ramos@universidad.edu',
        estado: 'Entregado',
        fechaEntrega: '2026-03-19T21:10:00',
        nombreArchivo: 'ValeriaRamos_TallerIntegralesSuperficie.pdf',
        tamanoArchivo: '3.1 MB',
        archivoUrl: '#'
      },
      {
        id: 103,
        actividadId: 1,
        estudianteId: 3,
        estudianteNombre: 'Mateo Sebastián López Morales',
        estudianteMatricula: 'EST-2023-012',
        estudianteCorreo: 'mateo.lopez@universidad.edu',
        estado: 'Pendiente'
      },
      {
        id: 104,
        actividadId: 1,
        estudianteId: 4,
        estudianteNombre: 'Camila Andrea Torres Benítez',
        estudianteMatricula: 'EST-2023-034',
        estudianteCorreo: 'camila.torres@universidad.edu',
        estado: 'Entregado',
        fechaEntrega: '2026-03-20T11:05:00',
        nombreArchivo: 'CamilaTorres_Taller3_Final.pdf',
        tamanoArchivo: '1.8 MB',
        archivoUrl: '#'
      },
      {
        id: 105,
        actividadId: 1,
        estudianteId: 5,
        estudianteNombre: 'Daniel Esteban Paredes Castro',
        estudianteMatricula: 'EST-2022-110',
        estudianteCorreo: 'daniel.paredes@universidad.edu',
        estado: 'Pendiente'
      }
    ]
  };

  /**
   * Obtiene los detalles de una actividad específica
   */
  getActividadPorId(actividadId: number): Observable<ActividadDetalleDto> {
    const act = this.actividadesMock.find(a => a.id === actividadId) || this.actividadesMock[0];
    return of(act);
  }

  /**
   * Obtiene la entrega actual de un estudiante específico para una actividad
   */
  getMiEntrega(actividadId: number, estudianteId: number): Observable<EntregaEstudianteDto | null> {
    const lista = this.entregasMock[actividadId] || [];
    const entrega = lista.find(e => e.estudianteId === estudianteId) || null;
    return of(entrega);
  }

  /**
   * ESTUDIANTE:
   * POST /api/estudiante/actividades/{actividadId}/entregar (multipart/form-data)
   * Envía el archivo de la tarea empaquetado en FormData
   */
  entregarTarea(actividadId: number, archivo: File, estudianteId: number = 1): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    formData.append('actividadId', actividadId.toString());
    formData.append('estudianteId', estudianteId.toString());

    return this.http.post(`${this.baseUrl}/api/estudiante/actividades/${actividadId}/entregar`, formData).pipe(
      catchError(() => {
        // Mock fallback en memoria
        if (!this.entregasMock[actividadId]) {
          this.entregasMock[actividadId] = [];
        }

        let entrega = this.entregasMock[actividadId].find(e => e.estudianteId === estudianteId);
        const formatSize = (bytes: number) => {
          if (bytes < 1024) return bytes + ' B';
          if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
          return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        };

        if (entrega) {
          entrega.estado = 'Entregado';
          entrega.fechaEntrega = new Date().toISOString();
          entrega.nombreArchivo = archivo.name;
          entrega.tamanoArchivo = formatSize(archivo.size);
          entrega.archivoUrl = '#';
        } else {
          entrega = {
            id: Date.now(),
            actividadId,
            estudianteId,
            estudianteNombre: 'Estudiante Sesión Actual',
            estado: 'Entregado',
            fechaEntrega: new Date().toISOString(),
            nombreArchivo: archivo.name,
            tamanoArchivo: formatSize(archivo.size),
            archivoUrl: '#'
          };
          this.entregasMock[actividadId].unshift(entrega);
        }

        return of({
          success: true,
          mensaje: `Archivo "${archivo.name}" entregado con éxito para la actividad.`,
          entrega
        });
      })
    );
  }

  /**
   * DOCENTE:
   * GET /api/docente/actividades/{actividadId}/entregas
   * Obtiene la nómina de estudiantes y sus estados de entrega
   */
  getEntregasActividad(actividadId: number): Observable<EntregaEstudianteDto[]> {
    return this.http.get<EntregaEstudianteDto[]>(`${this.baseUrl}/api/docente/actividades/${actividadId}/entregas`).pipe(
      catchError(() => {
        const lista = this.entregasMock[actividadId] || this.entregasMock[1] || [];
        return of([...lista]);
      })
    );
  }

  /**
   * DOCENTE:
   * POST /api/docente/actividades/calificar
   * Asigna nota nominal y retroalimentación personalizada a cada estudiante
   */
  calificarEntregaIndividual(body: { estudianteId: number; actividadId: number; calificacion: number; retroalimentacion: string }): Observable<any> {
    const lista = this.entregasMock[body.actividadId] || this.entregasMock[1];
    const item = lista ? lista.find(e => e.estudianteId === body.estudianteId) : null;
    const entregaId = item ? item.id : 101;

    const payload = {
      EntregaId: entregaId,
      entregaId: entregaId,
      Calificacion: Number(body.calificacion),
      calificacion: Number(body.calificacion),
      Retroalimentacion: body.retroalimentacion || '',
      retroalimentacion: body.retroalimentacion || '',
      estudianteId: body.estudianteId,
      actividadId: body.actividadId
    };

    return this.http.post(`${this.baseUrl}/api/docente/actividades/calificar`, payload).pipe(
      catchError(() => {
        if (item) {
          item.estado = 'Calificado';
          item.calificacion = body.calificacion;
          item.retroalimentacion = body.retroalimentacion;
          item.fechaCalificacion = new Date().toISOString();
        }
        return of({
          success: true,
          mensaje: 'Calificación nominal y retroalimentación registradas exitosamente.',
          body: payload
        });
      })
    );
  }
}
