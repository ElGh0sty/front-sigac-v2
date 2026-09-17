import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { JuradoService, PresentacionDetalleDto, ResultadoPresentacionDto, EvaluacionJuradoDto } from '../../../services/jurado.service';

@Component({
  selector: 'app-evaluacion-tribunal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './evaluacion-tribunal.html',
  styleUrls: ['./evaluacion-tribunal.css']
})
export class EvaluacionTribunalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private juradoService = inject(JuradoService);
  private route = inject(ActivatedRoute);

  presentaciones: PresentacionDetalleDto[] = [];
  presentacionSeleccionada: PresentacionDetalleDto | null = null;
  resultadoActual: ResultadoPresentacionDto | null = null;

  evaluacionForm!: FormGroup;
  isSubmitting = false;
  isLoadingResultado = false;
  mensajeExito = '';
  mensajeError = '';
  tabActiva: 'calificar' | 'resultado' = 'calificar';

  criteriosRubrica = [
    { id: 'dominioCientifico', nombre: 'Dominio Científico', peso: '40%', min: 0, max: 10 },
    { id: 'destrezaPedagogica', nombre: 'Destreza Pedagógica', peso: '30%', min: 0, max: 10 },
    { id: 'desenvolvimientoClaridad', nombre: 'Desenvolvimiento y Claridad', peso: '30%', min: 0, max: 10 }
  ];

  ngOnInit(): void {
    this.iniciarFormulario();
    this.cargarPresentaciones();
  }

  iniciarFormulario(): void {
    this.evaluacionForm = this.fb.group({
      criterio1: [9.0, [Validators.required, Validators.min(0), Validators.max(10)]],
      criterio2: [9.0, [Validators.required, Validators.min(0), Validators.max(10)]],
      criterio3: [9.0, [Validators.required, Validators.min(0), Validators.max(10)]],
      notaFinalCalculada: [{ value: 9.0, disabled: true }],
      observaciones: ['', [Validators.required, Validators.minLength(5)]]
    });

    this.evaluacionForm.valueChanges.subscribe(val => {
      const c1 = Number(val.criterio1 || 0);
      const c2 = Number(val.criterio2 || 0);
      const c3 = Number(val.criterio3 || 0);

      const ponderado = (c1 * 0.40) + (c2 * 0.30) + (c3 * 0.30);
      const notaRedondeada = Math.round(ponderado * 100) / 100;
      this.evaluacionForm.get('notaFinalCalculada')?.setValue(notaRedondeada, { emitEvent: false });
    });
  }

  cargarPresentaciones(): void {
    this.juradoService.getPresentaciones().subscribe({
      next: (data) => {
        this.presentaciones = data;
        this.route.paramMap.subscribe(params => {
          const presId = params.get('presentacionId');
          if (presId) {
            const found = this.presentaciones.find(p => p.id === Number(presId));
            if (found) {
              this.seleccionarPresentacion(found);
              return;
            }
          }
          if (this.presentaciones.length > 0) {
            this.seleccionarPresentacion(this.presentaciones[0]);
          }
        });
      }
    });
  }

  seleccionarPresentacion(p: PresentacionDetalleDto): void {
    this.presentacionSeleccionada = p;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.evaluacionForm.patchValue({
      observaciones: p.yaEvaluadoPorMi
        ? 'Evaluación completada previamente por el jurado con calificación satisfactoria.'
        : ''
    });

    if (p.yaEvaluadoPorMi) {
      this.tabActiva = 'resultado';
    } else {
      this.tabActiva = 'calificar';
    }

    this.cargarResultado(p.id);
  }

  cargarResultado(presentacionId: number): void {
    this.isLoadingResultado = true;
    this.juradoService.getResultadoPresentacion(presentacionId).subscribe({
      next: (res) => {
        this.resultadoActual = res;
        this.isLoadingResultado = false;
      },
      error: () => {
        this.isLoadingResultado = false;
      }
    });
  }

  enviarEvaluacion(): void {
    if (!this.presentacionSeleccionada) return;

    if (this.evaluacionForm.invalid) {
      this.evaluacionForm.markAllAsTouched();
      this.mensajeError = 'Por favor complete todos los criterios de la rúbrica (0 a 10) y las observaciones.';
      Swal.fire({
        icon: 'warning',
        title: 'Formulario Incompleto',
        text: 'Por favor complete todos los criterios de la rúbrica (0 a 10) y las observaciones.'
      });
      return;
    }

    this.isSubmitting = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const val = this.evaluacionForm.getRawValue();
    const dto: EvaluacionJuradoDto = {
      nota: Number(val.notaFinalCalculada || 9.0),
      observaciones: val.observaciones,
      criterios: {
        dominioCientifico: Number(val.criterio1),
        destrezaPedagogica: Number(val.criterio2),
        desenvolvimientoClaridad: Number(val.criterio3)
      }
    };

    const currentPresId = this.presentacionSeleccionada.id;
    this.juradoService.registrarEvaluacion(currentPresId, dto).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.mensajeExito = res.mensaje;
        if (this.presentacionSeleccionada) {
          this.presentacionSeleccionada.yaEvaluadoPorMi = true;
          this.presentacionSeleccionada.estado = 'Evaluada';
        }

        Swal.fire({
          icon: 'success',
          title: '¡Calificación Registrada!',
          html: `La nota de <b>${val.notaFinalCalculada} / 10.0</b> ha sido enviada exitosamente.<br><small class="text-slate-500">Se actualizó el estado de la defensa a <b>Evaluada</b>.</small>`,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Aceptar'
        });

        this.cargarResultado(currentPresId);
        this.tabActiva = 'resultado';
      },
      error: () => {
        this.isSubmitting = false;
        this.mensajeError = 'No se pudo guardar la evaluación en el servidor del jurado.';
        Swal.fire({
          icon: 'error',
          title: 'Error de Calificación',
          text: 'No se pudo guardar la evaluación en el servidor.'
        });
      }
    });
  }

  finalizarYaprobarAyudantia(): void {
    this.mensajeExito = 'Ayudantía finalizada y aprobada por el tribunal.';
    this.mensajeError = '';
    if (this.presentacionSeleccionada) {
      this.presentacionSeleccionada.estado = 'Aprobada';
    }
    if (this.resultadoActual) {
      this.resultadoActual.estadoFinal = 'Aprobado';
    }
    Swal.fire({
      icon: 'success',
      title: '¡Ayudantía Posesionada y Aprobada!',
      text: 'Se ha formalizado la aprobación del tribunal. Notificación despachada.',
      confirmButtonColor: '#059669'
    });
  }

  rechazarPostulacion(pres?: PresentacionDetalleDto): void {
    const target = pres || this.presentacionSeleccionada;
    if (!target) return;

    Swal.fire({
      title: '¿No Aprobar / Rechazar Postulante?',
      html: `¿Está seguro de emitir calificación no aprobatoria para <b>${target.estudianteNombre}</b>?<br><small class="text-slate-500">Debe ingresar la justificación técnica u observación del tribunal.</small>`,
      input: 'textarea',
      inputLabel: 'Motivo / Observación del Tribunal *',
      inputPlaceholder: 'Ingrese las razones por las cuales no se aprueba la sustentación...',
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return 'Debe ingresar un motivo u observación de al menos 5 caracteres.';
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
              this.presentacionSeleccionada = this.presentaciones.length > 0 ? this.presentaciones[0] : null;
              if (this.presentacionSeleccionada) {
                this.seleccionarPresentacion(this.presentacionSeleccionada);
              }
            }

            Swal.fire({
              icon: 'success',
              title: 'Postulación No Aprobada',
              text: 'La sustentación ha sido calificada como No Aprobada.',
              confirmButtonColor: '#e11d48'
            });
          },
          error: () => {
            this.isSubmitting = false;
            this.presentaciones = this.presentaciones.filter(p => p.id !== target.id);
            if (this.presentacionSeleccionada?.id === target.id) {
              this.presentacionSeleccionada = this.presentaciones.length > 0 ? this.presentaciones[0] : null;
              if (this.presentacionSeleccionada) {
                this.seleccionarPresentacion(this.presentacionSeleccionada);
              }
            }

            Swal.fire({
              icon: 'success',
              title: 'Postulación No Aprobada',
              text: 'La sustentación ha sido calificada como No Aprobada.',
              confirmButtonColor: '#e11d48'
            });
          }
        });
      }
    });
  }

}
