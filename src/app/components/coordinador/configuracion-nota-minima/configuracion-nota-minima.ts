import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { CoordinadorService, CatedraMinimoNotaDto } from '../../../services/coordinador.service';

@Component({
  selector: 'app-configuracion-nota-minima',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion-nota-minima.html',
  styleUrls: ['./configuracion-nota-minima.css']
})
export class ConfiguracionNotaMinimaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private coordinadorService = inject(CoordinadorService);

  configForm!: FormGroup;
  catedras: CatedraMinimoNotaDto[] = [];
  catedraSeleccionada: CatedraMinimoNotaDto | null = null;

  isLoading = false;
  isSubmitting = false;
  mensajeExito = '';
  mensajeError = '';

  ngOnInit(): void {
    this.iniciarFormulario();
    this.cargarCatedras();
  }

  iniciarFormulario(): void {
    this.configForm = this.fb.group({
      catedraId: ['', [Validators.required]],
      minimoNota: [8.0, [Validators.required, Validators.min(1.0), Validators.max(10.0)]]
    });

    this.configForm.get('catedraId')?.valueChanges.subscribe(id => {
      const cat = this.catedras.find(c => c.id === Number(id));
      if (cat) {
        this.catedraSeleccionada = cat;
        this.configForm.get('minimoNota')?.setValue(cat.minimoNota, { emitEvent: false });
        this.mensajeExito = '';
        this.mensajeError = '';
      }
    });
  }

  cargarCatedras(): void {
    this.isLoading = true;
    this.coordinadorService.getCatedrasConMinimoNota().subscribe({
      next: (list) => {
        this.catedras = list;
        this.isLoading = false;
        if (list.length > 0 && !this.configForm.get('catedraId')?.value) {
          this.configForm.get('catedraId')?.setValue(list[0].id);
        }
      },
      error: () => {
        this.isLoading = false;
        this.mensajeError = 'No se pudieron cargar las cátedras académicas desde el servidor.';
      }
    });
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    this.configForm.get('minimoNota')?.setValue(val);
  }

  ajustarNota(delta: number): void {
    const current = Number(this.configForm.get('minimoNota')?.value || 8.0);
    const nueva = Math.min(10.0, Math.max(1.0, Math.round((current + delta) * 10) / 10));
    this.configForm.get('minimoNota')?.setValue(nueva);
  }

  guardarConfiguracion(): void {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      this.mensajeError = 'Por favor seleccione una cátedra y asigne una nota válida entre 1.0 y 10.0.';
      return;
    }

    const { catedraId, minimoNota } = this.configForm.value;
    const catIdNum = Number(catedraId);
    const notaNum = Number(minimoNota);

    this.isSubmitting = true;
    this.mensajeExito = '';
    this.mensajeError = '';

    this.coordinadorService.actualizarMinimoNota(catIdNum, notaNum).subscribe({
      next: (resp: any) => {
        this.isSubmitting = false;
        const msg = resp?.mensaje || `Nota mínima actualizada a ${notaNum.toFixed(1)} / 10.0 exitosamente.`;
        this.mensajeExito = msg;

        const item = this.catedras.find(c => c.id === catIdNum);
        if (item) {
          item.minimoNota = notaNum;
          this.catedraSeleccionada = item;
        }

        Swal.fire({
          icon: 'success',
          title: '¡Configuración Guardada!',
          text: msg,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Aceptar'
        });
      },
      error: () => {
        this.isSubmitting = false;
        this.mensajeError = 'Ocurrió un error al actualizar la nota mínima en el servidor backend.';
        Swal.fire({
          icon: 'error',
          title: 'Error de Servidor',
          text: 'No se pudo guardar la configuración de nota mínima.'
        });
      }
    });
  }
}
