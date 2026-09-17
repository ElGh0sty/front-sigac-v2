import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ActividadService, ActividadDetalleDto, EntregaEstudianteDto } from '../../../services/actividad.service';

interface FilaCalificacion {
  entrega: EntregaEstudianteDto;
  calificacionInput: number | null;
  retroalimentacionInput: string;
  guardando: boolean;
  guardadoExitoso: boolean;
  error: string;
}

@Component({
  selector: 'app-calificar-actividad-docente',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './calificar-actividad-docente.html',
  styleUrls: ['./calificar-actividad-docente.css']
})
export class CalificarActividadDocenteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private actividadService = inject(ActividadService);

  actividadId: number = 1;
  actividad: ActividadDetalleDto | null = null;
  filas: FilaCalificacion[] = [];
  filtroEstado: string = 'Todos';
  busquedaTexto: string = '';

  mensajeGlobalExito: string = '';
  mensajeGlobalError: string = '';

  get esAyudante(): boolean {
    const rol = (localStorage.getItem('rol') || '').toLowerCase();
    return rol.includes('ayudante');
  }

  get rutaRetorno(): string {
    return this.esAyudante ? '/ayudante/materias' : '/docente/gestion-clases';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('actividadId');
      this.actividadId = idParam ? parseInt(idParam, 10) : 1;
      this.cargarActividadYEntregas();
    });
  }

  cargarActividadYEntregas(): void {
    this.actividadService.getActividadPorId(this.actividadId).subscribe(act => {
      this.actividad = act;
    });

    this.actividadService.getEntregasActividad(this.actividadId).subscribe(entregas => {
      this.filas = entregas.map(e => ({
        entrega: { ...e },
        calificacionInput: e.calificacion !== undefined && e.calificacion !== null ? e.calificacion : null,
        retroalimentacionInput: e.retroalimentacion || '',
        guardando: false,
        guardadoExitoso: false,
        error: ''
      }));
    });
  }

  /**
   * Asienta de manera nominal la nota y retroalimentación de un estudiante individual
   * POST /api/docente/actividades/calificar
   */
  guardarCalificacionFila(fila: FilaCalificacion): void {
    if (fila.calificacionInput === null || fila.calificacionInput === undefined || isNaN(fila.calificacionInput)) {
      fila.error = 'Debe ingresar una nota numérica válida.';
      return;
    }

    if (fila.calificacionInput < 0 || fila.calificacionInput > 10) {
      fila.error = 'La calificación debe estar entre 0.0 y 10.0 puntos.';
      return;
    }

    fila.guardando = true;
    fila.error = '';
    fila.guardadoExitoso = false;

    const payload = {
      actividadId: this.actividadId,
      estudianteId: fila.entrega.estudianteId,
      calificacion: Number(fila.calificacionInput),
      retroalimentacion: fila.retroalimentacionInput.trim()
    };

    this.actividadService.calificarEntregaIndividual(payload).subscribe({
      next: (res) => {
        fila.guardando = false;
        fila.guardadoExitoso = true;
        fila.entrega.estado = 'Calificado';
        fila.entrega.calificacion = payload.calificacion;
        fila.entrega.retroalimentacion = payload.retroalimentacion;
        fila.entrega.fechaCalificacion = new Date().toISOString();

        this.mensajeGlobalExito = `Calificación de ${fila.entrega.estudianteNombre} guardada exitosamente (${payload.calificacion}/10.0).`;
        setTimeout(() => {
          fila.guardadoExitoso = false;
        }, 3000);
      },
      error: (err) => {
        fila.guardando = false;
        fila.error = 'Error al registrar la calificación en el servidor.';
      }
    });
  }

  get filasFiltradas(): FilaCalificacion[] {
    return this.filas.filter(f => {
      const matchEstado = this.filtroEstado === 'Todos' || f.entrega.estado === this.filtroEstado;
      const matchTexto = !this.busquedaTexto ||
        f.entrega.estudianteNombre.toLowerCase().includes(this.busquedaTexto.toLowerCase()) ||
        (f.entrega.estudianteMatricula && f.entrega.estudianteMatricula.toLowerCase().includes(this.busquedaTexto.toLowerCase()));
      return matchEstado && matchTexto;
    });
  }

  get totalEntregados(): number {
    return this.filas.filter(f => f.entrega.estado === 'Entregado' || f.entrega.estado === 'Calificado').length;
  }

  get totalCalificados(): number {
    return this.filas.filter(f => f.entrega.estado === 'Calificado').length;
  }

  get promedioCalificaciones(): number {
    const calificados = this.filas.filter(f => f.entrega.calificacion !== undefined && f.entrega.calificacion !== null);
    if (calificados.length === 0) return 0;
    const suma = calificados.reduce((acc, f) => acc + (f.entrega.calificacion || 0), 0);
    return Math.round((suma / calificados.length) * 100) / 100;
  }
}
