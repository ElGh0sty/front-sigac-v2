import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import {
  EstudianteService,
  ActualizacionCronogramaEstudianteDto,
} from '../../services/estudiante.service';

type ActualizacionCronogramaConMateria = ActualizacionCronogramaEstudianteDto & {
  materiaId?: number | null;
  materiaNombre?: string | null;
  catedraNombre?: string | null;
};

export interface NotificacionItem {
  id: number;
  tipo: 'cronograma';
  titulo: string;
  descripcion: string;
  fecha: string;
  materiaId: number;
  materiaNombre: string;
  leida: boolean;
  actualizacionCronogramaId: number;
  catedraId: number;
  actividad: string;
  fechaAnterior: string;
  fechaNueva: string;
  observacion: string;
  fechaNotificacion: string;
}

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-sidebar.html',
})
export class RightSidebarComponent implements OnInit {
  filtro: 'todas' | 'pendientes' = 'todas';

  notificaciones: NotificacionItem[] = [];
  cargandoNotificaciones = false;
  errorNotificaciones = '';

  modalAbierto = false;
  notificacionSeleccionada: NotificacionItem | null = null;

  constructor(
    private estudianteService: EstudianteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  get notificacionesFiltradas(): NotificacionItem[] {
    if (this.filtro === 'pendientes') {
      return this.notificaciones.filter((item) => !item.leida);
    }
    return this.notificaciones;
  }

  get contadorPendientes(): number {
    return this.notificaciones.filter((item) => !item.leida).length;
  }

  get pendientesCount(): number {
    return this.contadorPendientes;
  }

  get hayAvisos(): boolean {
    return this.notificaciones.length > 0;
  }

  cambiarFiltro(nuevoFiltro: 'todas' | 'pendientes'): void {
    this.filtro = nuevoFiltro;
  }

  marcarTodoLeido(): void {
    this.notificaciones = this.notificaciones.map((item) => ({
      ...item,
      leida: true,
    }));
    this.guardarLeidasEnStorage();
  }

  marcarTodasComoLeidas(): void {
    this.marcarTodoLeido();
  }

  abrirDetalle(item: NotificacionItem): void {
    this.notificacionSeleccionada = item;
    this.modalAbierto = true;

    if (!item.leida) {
      item.leida = true;
      this.guardarLeidasEnStorage();
    }
  }

  abrirNotificacion(item: NotificacionItem): void {
    this.abrirDetalle(item);
  }

  toggleLeida(event: Event, item: NotificacionItem): void {
    event.stopPropagation();
    item.leida = !item.leida;
    this.guardarLeidasEnStorage();
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.notificacionSeleccionada = null;
  }

  irAMateria(item: NotificacionItem | null): void {
    if (!item) {
      return;
    }

    const targetId = item.materiaId || item.catedraId;
    this.cerrarModal();

    if (targetId) {
      this.router.navigate(['/estudiante/materia', targetId], {
        queryParams: { tab: 'cronograma' },
      });
      return;
    }

    this.router.navigate(['/estudiante/materias']);
  }

  recargarNotificaciones(): void {
    this.cargarNotificaciones();
  }

  private cargarNotificaciones(): void {
    this.cargandoNotificaciones = true;
    this.errorNotificaciones = '';

    this.estudianteService
      .getActualizacionesCronograma()
      .pipe(
        timeout(7000),
        finalize(() => {
          this.cargandoNotificaciones = false;
        })
      )
      .subscribe({
        next: (actualizaciones) => {
          const raw = Array.isArray(actualizaciones) ? actualizaciones : [];
          this.notificaciones = raw.map((item) =>
            this.crearAvisoCronograma(item as ActualizacionCronogramaConMateria)
          );
          this.aplicarEstadoLeidas();
        },
        error: (err) => {
          console.warn(
            'Error o tiempo de espera agotado al cargar notificaciones del cronograma:',
            err
          );
          this.notificaciones = [];
          this.errorNotificaciones =
            err?.error?.message || 'No se pudieron cargar las notificaciones del cronograma.';
        },
      });
  }

  private crearAvisoCronograma(cambio: ActualizacionCronogramaConMateria): NotificacionItem {
    const materiaId = Number(cambio.materiaId || 0);

    const materiaNombre =
      cambio.materiaNombre?.trim() || cambio.catedraNombre?.trim() || `Cátedra ${cambio.catedraId}`;

    const fechaAnterior = this.formatearSoloFecha(cambio.fechaAnterior);
    const fechaNueva = this.formatearSoloFecha(cambio.fechaNueva);

    const observacion = cambio.observacion?.trim() || 'Sin observación registrada.';

    return {
      id: 1_000_000 + Number(cambio.id),
      tipo: 'cronograma',
      titulo: 'Cronograma actualizado',
      descripcion:
        `${cambio.actividad || 'La actividad'} fue reprogramada del ` + `${fechaAnterior} al ${fechaNueva}.`,
      fecha: this.formatearFechaAviso(cambio.fechaNotificacion),
      materiaId,
      materiaNombre,
      leida: false,
      actualizacionCronogramaId: Number(cambio.id),
      catedraId: Number(cambio.catedraId),
      actividad: cambio.actividad || '',
      fechaAnterior: cambio.fechaAnterior || '',
      fechaNueva: cambio.fechaNueva || '',
      observacion,
      fechaNotificacion: cambio.fechaNotificacion || '',
    };
  }

  private aplicarEstadoLeidas(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const guardadas = localStorage.getItem(this.leidasKey);
      if (!guardadas) {
        return;
      }

      const idsLeidos = new Set<number>(JSON.parse(guardadas));
      this.notificaciones = this.notificaciones.map((item) => ({
        ...item,
        leida: item.leida || idsLeidos.has(item.id),
      }));
    } catch {
      // Ignorar errores al parsear el localStorage
    }
  }

  private guardarLeidasEnStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const idsLeidos = this.notificaciones
        .filter((item) => item.leida)
        .map((item) => item.id);

      localStorage.setItem(this.leidasKey, JSON.stringify(idsLeidos));
    } catch {
      // Ignorar errores de escritura en storage
    }
  }

  private get leidasKey(): string {
    return 'sigac_notificaciones_cronograma_leidas';
  }

  private formatearSoloFecha(fechaStr?: string | null): string {
    if (!fechaStr) {
      return 'Fecha no definida';
    }

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
      return fechaStr;
    }

    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatearFechaAviso(fechaStr?: string | null): string {
    if (!fechaStr) {
      return 'Reciente';
    }

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
      return fechaStr;
    }

    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
