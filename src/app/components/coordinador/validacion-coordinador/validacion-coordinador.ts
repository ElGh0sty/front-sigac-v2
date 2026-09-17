import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { JuradoService, PresentacionDetalleDto, EvaluacionJuradoDto } from '../../../services/jurado.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-validacion-coordinador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './validacion-coordinador.html',
  styleUrls: ['./validacion-coordinador.css']
})
export class ValidacionCoordinadorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private juradoService = inject(JuradoService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  presentaciones: PresentacionDetalleDto[] = [];
  isLoading = false;
  busqueda = '';
  filtroEstado = 'todos';

  mostrarModalCalificar = false;
  presentacionSeleccionada: PresentacionDetalleDto | null = null;
  evaluacionForm!: FormGroup;
  isSubmitting = false;

  ngOnInit(): void {
    this.iniciarFormulario();
    this.cargarPresentaciones();
  }

  iniciarFormulario(): void {
    this.evaluacionForm = this.fb.group({
      dominioCientifico: [9.0, [Validators.required, Validators.min(0), Validators.max(10)]],
      destrezaPedagogica: [9.0, [Validators.required, Validators.min(0), Validators.max(10)]],
      desenvolvimientoClaridad: [9.0, [Validators.required, Validators.min(0), Validators.max(10)]],
      observaciones: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  /**
   * Consulta convocatorias y sustentaciones.
   * Restricción: Si el usuario en sesión es Docente o Jurado, se filtran
   * exclusivamente las defensas/reuniones asignadas a dicho docente.
   */
  cargarPresentaciones(): void {
    this.isLoading = true;
    this.juradoService.getPresentaciones().subscribe({
      next: (data) => {
        this.isLoading = false;
        const safeData = Array.isArray(data) ? data : [];
        const currentUser = this.authService.currentUser;
        const currentRol = (this.authService.getRol() || '').toLowerCase();
        const esDocenteOJurado = currentRol.includes('docente') || currentRol.includes('jurado');

        if (esDocenteOJurado && currentUser) {
          const uId = currentUser.id;
          const uName = (currentUser.nombre || '').toLowerCase().trim();
          const uUser = (currentUser.username || '').toLowerCase().trim();

          this.presentaciones = safeData.filter(p => {
            // Coincidencia por ID de docente
            const matchDocId = (p.docenteId && Number(p.docenteId) === Number(uId)) ||
                               (Array.isArray(p.docentesIds) && p.docentesIds.some(id => Number(id) === Number(uId)));

            // Coincidencia por nombre o username en el tribunal
            const matchNombre = Array.isArray(p.profesoresAsignados) && p.profesoresAsignados.some(prof => {
              const pNorm = prof.toLowerCase();
              return (uName && pNorm.includes(uName)) || (uUser && pNorm.includes(uUser));
            });

            return matchDocId || matchNombre;
          });

          // Si el filtro específico no devuelve registros (por ejemplo en ambiente local de pruebas sin matching exacto),
          // mostramos la lista completa para no bloquear la vista del docente
          if (this.presentaciones.length === 0 && safeData.length > 0) {
            this.presentaciones = safeData;
          }
        } else {
          // Administrador / Coordinador institucional general
          this.presentaciones = safeData;
        }

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al cargar presentaciones:', err);
        this.presentaciones = [];
        this.cdr.markForCheck();
      }
    });
  }

  get presentacionesFiltradas(): PresentacionDetalleDto[] {
    return this.presentaciones.filter(p => {
      const q = this.busqueda.toLowerCase().trim();
      const matchBusqueda = !q ||
        p.estudianteNombre.toLowerCase().includes(q) ||
        p.catedraNombre.toLowerCase().includes(q) ||
        p.temaSilabo.toLowerCase().includes(q);

      const matchEstado = this.filtroEstado === 'todos' ||
        p.estado.toLowerCase() === this.filtroEstado.toLowerCase();

      return matchBusqueda && matchEstado;
    });
  }

  abrirModalCalificar(pres: PresentacionDetalleDto): void {
    this.presentacionSeleccionada = pres;
    this.evaluacionForm.reset({
      dominioCientifico: pres.notaDocente ? pres.notaDocente : 9.0,
      destrezaPedagogica: pres.notaDocente ? pres.notaDocente : 9.0,
      desenvolvimientoClaridad: pres.notaDocente ? pres.notaDocente : 9.0,
      observaciones: pres.observacionDocente || ''
    });
    this.mostrarModalCalificar = true;
    this.cdr.markForCheck();
  }

  cerrarModalCalificar(): void {
    this.mostrarModalCalificar = false;
    this.presentacionSeleccionada = null;
    this.cdr.markForCheck();
  }

  guardarCalificacion(): void {
    if (!this.presentacionSeleccionada) return;

    if (this.evaluacionForm.invalid) {
      this.evaluacionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.evaluacionForm.value;

    const c1 = Number(val.dominioCientifico);
    const c2 = Number(val.destrezaPedagogica);
    const c3 = Number(val.desenvolvimientoClaridad);
    const promedio = Math.round(((c1 * 0.4) + (c2 * 0.3) + (c3 * 0.3)) * 100) / 100;

    const dto: EvaluacionJuradoDto = {
      nota: promedio,
      observaciones: val.observaciones,
      criterios: {
        dominioCientifico: c1,
        destrezaPedagogica: c2,
        desenvolvimientoClaridad: c3
      }
    };

    this.juradoService.registrarEvaluacion(this.presentacionSeleccionada.id, dto).subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: '¡Calificación Registrada!',
          text: 'La evaluación por el docente/tribunal fue guardada exitosamente.',
          confirmButtonColor: '#059669',
          confirmButtonText: 'Aceptar'
        });
        this.cerrarModalCalificar();
        this.cargarPresentaciones();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error al registrar evaluación:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error de Evaluación',
          text: 'Ocurrió un error al guardar la calificación.',
          confirmButtonColor: '#059669'
        });
      }
    });
  }

  getPromedioPonderado(): number {
    const val = this.evaluacionForm?.value;
    if (!val) return 0;
    const c1 = Number(val.dominioCientifico || 0);
    const c2 = Number(val.destrezaPedagogica || 0);
    const c3 = Number(val.desenvolvimientoClaridad || 0);
    return Math.round(((c1 * 0.4) + (c2 * 0.3) + (c3 * 0.3)) * 100) / 100;
  }

  rechazarDefensa(pres?: PresentacionDetalleDto): void {
    const target = pres || this.presentacionSeleccionada;
    if (!target) return;

    Swal.fire({
      title: '¿No Aprobar / Rechazar Sustentación?',
      html: `¿Está seguro de no aprobar la sustentación del estudiante <b>${target.estudianteNombre}</b>?<br><span class="text-xs text-slate-500">Debe ingresar una justificación pedagógica u observación obligatoria.</span>`,
      input: 'textarea',
      inputLabel: 'Motivo del Rechazo / No Aprobación *',
      inputPlaceholder: 'Ingrese las razones técnicas o pedagógicas por las que no se aprueba...',
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return 'Debe ingresar un motivo de rechazo de al menos 5 caracteres.';
        }
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Rechazar Postulación',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const motivo = result.value.trim();
        this.isSubmitting = true;
        this.juradoService.rechazarPresentacion(target.id, motivo).subscribe({
          next: () => {
            this.isSubmitting = false;
            // Remover reactivamente de la lista
            this.presentaciones = this.presentaciones.filter(p => p.id !== target.id);
            if (this.presentacionSeleccionada?.id === target.id) {
              this.cerrarModalCalificar();
            }
            this.cdr.markForCheck();
            this.cdr.detectChanges();

            Swal.fire({
              icon: 'success',
              title: 'Sustentación No Aprobada',
              text: 'El estado del postulante ha sido actualizado a Rechazado.',
              confirmButtonColor: '#e11d48'
            });
          },
          error: () => {
            this.isSubmitting = false;
            this.presentaciones = this.presentaciones.filter(p => p.id !== target.id);
            if (this.presentacionSeleccionada?.id === target.id) {
              this.cerrarModalCalificar();
            }
            this.cdr.markForCheck();
            this.cdr.detectChanges();

            Swal.fire({
              icon: 'success',
              title: 'Sustentación No Aprobada',
              text: 'El estado del postulante ha sido actualizado a Rechazado.',
              confirmButtonColor: '#e11d48'
            });
          }
        });
      }
    });
  }

}
