import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ActividadService, ActividadDetalleDto, EntregaEstudianteDto } from '../../../services/actividad.service';
import { MateriaService, ActividadDto } from '../../../services/materia.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-entrega-tarea-estudiante',
  imports: [CommonModule, RouterModule],
  templateUrl: './entrega-tarea-estudiante.html',
  styleUrls: ['./entrega-tarea-estudiante.css']
})
export class EntregaTareaEstudianteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private actividadService = inject(ActividadService);
  private materiaService = inject(MateriaService);
  private authService = inject(AuthService);

  actividadId: number = 1;
  actividad: ActividadDetalleDto | null = null;
  miEntrega: EntregaEstudianteDto | null = null;
  materiaId: number = 101;

  archivoSeleccionado: File | null = null;
  isDragging = false;
  isUploading = false;
  mensajeExito = '';
  mensajeError = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('actividadId');
      this.actividadId = idParam ? parseInt(idParam, 10) : 1;
      this.cargarDatos();
    });
  }

  cargarDatos(): void {
    const estudianteId = this.authService.getUserId() || 1;

    // Buscar si existe en MateriaService para tener sincronización completa con la materia
    const acts: ActividadDto[] = this.materiaService.getActividadesSnapshot();
    const actMateria = acts.find((a: ActividadDto) => a.id === this.actividadId);
    if (actMateria) {
      this.materiaId = actMateria.materiaId || 101;
      const mat = this.materiaService.getMateriaById(this.materiaId);
      this.actividad = {
        id: actMateria.id || this.actividadId,
        catedraId: this.materiaId,
        catedraNombre: mat ? mat.nombre : 'Cálculo Avanzado',
        docenteNombre: mat ? (mat.docente || 'Dra. Evelyn Vance') : 'Dra. Evelyn Vance',
        titulo: actMateria.titulo,
        descripcion: actMateria.descripcion,
        fechaPublicacion: '2026-03-01T08:00:00',
        fechaLimite: actMateria.fechaEntrega ? `${actMateria.fechaEntrega}T23:59:00` : '2026-03-25T23:59:00',
        ponderacionPuntos: 10.0,
        tipo: (actMateria.tipo as any) || 'Taller',
        formatoPermitido: '.pdf, .docx, .zip'
      };

      if (actMateria.estado === 'entregada' || actMateria.estado === 'calificada') {
        this.miEntrega = {
          id: 999,
          actividadId: this.actividadId,
          estudianteId: estudianteId,
          estudianteNombre: 'Estudiante Sesión Actual',
          estado: actMateria.estado === 'calificada' ? 'Calificado' : 'Entregado',
          fechaEntrega: new Date().toISOString(),
          nombreArchivo: `Entrega_Actividad_${this.actividadId}.pdf`,
          tamanoArchivo: '2.1 MB',
          archivoUrl: '#',
          calificacion: actMateria.nota,
          retroalimentacion: actMateria.nota ? 'Trabajo revisado y calificado satisfactoriamente.' : undefined
        };
      }
    } else {
      this.actividadService.getActividadPorId(this.actividadId).subscribe(act => {
        this.actividad = act;
        if (act && act.catedraId) this.materiaId = act.catedraId;
      });

      this.actividadService.getMiEntrega(this.actividadId, estudianteId).subscribe(ent => {
        this.miEntrega = ent;
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivo(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.procesarArchivo(event.dataTransfer.files[0]);
    }
  }

  procesarArchivo(file: File): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    // Validar extensiones permitidas (.pdf, .docx, .zip)
    const extPermitidas = ['.pdf', '.docx', '.zip', '.rar'];
    const nombre = file.name.toLowerCase();
    const esValido = extPermitidas.some(ext => nombre.endsWith(ext));

    if (!esValido) {
      this.mensajeError = `Formato no soportado. Formatos admitidos: ${extPermitidas.join(', ')}`;
      return;
    }

    // Validar tamaño máximo (25 MB)
    if (file.size > 25 * 1024 * 1024) {
      this.mensajeError = 'El archivo supera el límite máximo permitido de 25 MB.';
      return;
    }

    this.archivoSeleccionado = file;
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = null;
    this.mensajeError = '';
  }

  /**
   * Empaqueta el archivo en FormData y envía la solicitud al backend
   * POST /api/estudiante/actividades/{actividadId}/entregar
   */
  enviarTarea(): void {
    if (!this.archivoSeleccionado) {
      this.mensajeError = 'Por favor seleccione o arrastre un archivo antes de confirmar la entrega.';
      return;
    }

    this.isUploading = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const estudianteId = this.authService.getUserId() || 1;

    this.actividadService.entregarTarea(this.actividadId, this.archivoSeleccionado, estudianteId).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.mensajeExito = res.mensaje || '¡Actividad entregada con éxito! Su archivo ha sido registrado.';
        this.archivoSeleccionado = null;
        this.materiaService.updateActividadEstado(this.actividadId, 'entregada');
        this.cargarDatos();
      },
      error: (err) => {
        this.isUploading = false;
        this.mensajeError = 'Error al enviar la entrega. Verifique su conexión y vuelva a intentarlo.';
      }
    });
  }

  getVolverUrl(): string {
    return `/estudiante/materia/${this.materiaId || 101}`;
  }

  getTamanoLegible(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
