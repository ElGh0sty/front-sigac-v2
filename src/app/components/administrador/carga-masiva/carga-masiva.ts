import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { EstudiantesService, BulkUploadResponseDto, ImportJobResultDto } from '../../../services/estudiantes.service';
import { ClaseDto, ClaseService } from '../../../services/clase.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-carga-masiva-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './carga-masiva.html',
  styleUrls: ['./carga-masiva.css']
})
export class CargaMasivaEstudiantesComponent implements OnInit {
  private estudiantesService = inject(EstudiantesService);
  private claseService = inject(ClaseService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  clases: ClaseDto[] = [];
  claseSeleccionadaId: number | '' = '';
  cargandoClases = false;

  archivoSeleccionado: File | null = null;
  isDragging = false;
  isUploading = false;
  progreso = 0;

  resultado: BulkUploadResponseDto | null = null;
  jobDetalle: ImportJobResultDto | null = null;
  mensajeError = '';
  isDownloadingTemplate = false;

  ngOnInit(): void {
    this.cargarClases();

    this.route.queryParamMap.subscribe(params => {
      const qClaseId = Number(params.get('claseId') || 0);
      if (qClaseId > 0) {
        this.claseSeleccionadaId = qClaseId;
      }
    });
  }

  cargarClases(): void {
    this.cargandoClases = true;
    this.claseService.getClases().subscribe({
      next: (list) => {
        this.clases = Array.isArray(list) ? list : [];
        this.cargandoClases = false;
        if (!this.claseSeleccionadaId && this.clases.length > 0) {
          const primerClase = this.clases[0];
          this.claseSeleccionadaId = Number(primerClase.id);
        }
      },
      error: (err) => {
        console.error('Error al cargar clases para carga masiva:', err);
        this.clases = [];
        this.cargandoClases = false;
      }
    });
  }

  get claseSeleccionadaObj(): ClaseDto | undefined {
    return this.clases.find(c => Number(c.id) === Number(this.claseSeleccionadaId));
  }

  // Manejo de eventos drag and drop
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

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.procesarArchivo(event.dataTransfer.files[0]);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivo(input.files[0]);
    }
  }

  procesarArchivo(archivo: File): void {
    this.mensajeError = '';
    this.resultado = null;

    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'csv') {
      this.mensajeError = 'Formato no permitido. Por favor seleccione un archivo en formato .xlsx o .csv con las columnas oficiales.';
      return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
      this.mensajeError = 'El archivo excede el tamaño máximo permitido de 10 MB.';
      return;
    }

    this.archivoSeleccionado = archivo;
  }

  /**
   * Ejecuta la carga masiva consumiendo POST /api/estudiantes/bulk-upload?claseId=${this.claseSeleccionadaId}
   */
  subirArchivo(): void {
    if (!this.claseSeleccionadaId || Number(this.claseSeleccionadaId) <= 0) {
      this.mensajeError = 'Debes seleccionar obligatoriamente una clase o curso de destino antes de iniciar la carga masiva.';
      Swal.fire({
        icon: 'warning',
        title: 'Clase Requerida',
        text: this.mensajeError
      });
      return;
    }

    if (!this.archivoSeleccionado) {
      this.mensajeError = 'Por favor selecciona un archivo en formato .xlsx o .csv para procesar.';
      Swal.fire({
        icon: 'warning',
        title: 'Archivo Requerido',
        text: this.mensajeError
      });
      return;
    }

    this.isUploading = true;
    this.progreso = 0;
    this.mensajeError = '';
    this.resultado = null;

    const targetClaseId = Number(this.claseSeleccionadaId);

    Swal.fire({
      title: 'Procesando Carga Masiva...',
      text: 'Registrando estudiantes en la base de datos y despachando credenciales por correo.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.estudiantesService.bulkUploadConProgreso(this.archivoSeleccionado, targetClaseId).subscribe({
      next: (evento) => {
        this.progreso = Math.max(this.progreso, evento.progreso);
        if (evento.respuesta) {
          this.resultado = evento.respuesta;
          this.resultado.claseId = targetClaseId;
          this.isUploading = false;
          Swal.close();
          Swal.fire({
            icon: 'success',
            title: '¡Carga Masiva Exitosa!',
            text: `Se han matriculado los estudiantes en la clase exitosamente.`
          });
          if (evento.respuesta.jobId) {
            this.consultarJob(evento.respuesta.jobId);
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading = false;
        Swal.close();
        const serverMessage = err?.error?.message || err?.error?.title || err?.message;
        this.mensajeError = `No se pudo completar la carga masiva en el endpoint /api/estudiantes/bulk-upload. ${serverMessage ? `Detalle: ${serverMessage}` : ''}`.trim();
        Swal.fire({
          icon: 'error',
          title: 'Error en la Carga Masiva',
          text: this.mensajeError
        });
      }
    });
  }

  irAClase(): void {
    const cId = Number(this.claseSeleccionadaId);
    if (!cId) return;

    const rol = (this.authService.getRol() || this.authService.getRole() || '').toLowerCase();
    const esDocente = rol.includes('docente') && !rol.includes('admin');
    const targetRoute = esDocente ? '/docente/gestion-estudiantes' : '/admin/gestion-estudiantes';

    this.router.navigate([targetRoute], { queryParams: { claseId: cId } });
  }

  /**
   * GET /api/estudiantes/template
   * Descarga la plantilla oficial en formato CSV
   */
  descargarPlantilla(): void {
    this.isDownloadingTemplate = true;
    this.estudiantesService.descargarPlantilla().subscribe({
      next: (blob) => {
        this.isDownloadingTemplate = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_carga_masiva_estudiantes.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.isDownloadingTemplate = false;
        const serverMessage = err?.error?.message || err?.error?.title || err?.message;
        this.mensajeError = `No se pudo descargar la plantilla desde /api/estudiantes/template. ${serverMessage ? `Detalle: ${serverMessage}` : ''}`.trim();
      }
    });
  }

  /**
   * GET /api/estudiantes/imports/{jobId}/result
   */
  consultarJob(jobId: string): void {
    this.estudiantesService.getResultadoImportacion(jobId).subscribe({
      next: (job) => {
        this.jobDetalle = job;
      },
      error: () => {
        this.jobDetalle = null;
      }
    });
  }

  reiniciar(): void {
    this.archivoSeleccionado = null;
    this.resultado = null;
    this.jobDetalle = null;
    this.progreso = 0;
    this.mensajeError = '';
  }
}
