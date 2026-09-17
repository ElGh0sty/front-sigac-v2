import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstudianteService } from '../../../services/estudiante.service';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bitacora.html'
})
export class BitacoraComponent implements OnInit {
  ayudantias = [
    { id: 1, nombre: 'Ayudantía - Cálculo Avanzado' },
    { id: 2, nombre: 'Ayudantía - Mecánica Cuántica' },
    { id: 3, nombre: 'Ayudantía - Redes Neuronales' }
  ];

  registro = {
    ayudantiaId: 0,
    actividadesRealizadas: '',
    evidenciaUrl: ''
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private estudianteService: EstudianteService) {}

  ngOnInit() {
    this.estudianteService.getHistorialAyudantias().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.ayudantias = data.map(d => ({
            id: d.ayudantiaId,
            nombre: `${d.nombreCatedra} (${d.estadoAyudantia})`
          }));
        }
      },
      error: () => {}
    });
  }

  registrarBitacora() {
    if (!this.registro.ayudantiaId || !this.registro.actividadesRealizadas.trim()) {
      this.errorMessage = 'Por favor completa la ayudantía y las actividades realizadas.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.estudianteService.registrarBitacora({
      ayudantiaId: Number(this.registro.ayudantiaId),
      actividadesRealizadas: this.registro.actividadesRealizadas,
      evidenciaUrl: this.registro.evidenciaUrl
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = '¡Bitácora registrada exitosamente!';
        this.registro = { ayudantiaId: 0, actividadesRealizadas: '', evidenciaUrl: '' };
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Error al registrar bitácora (' + (err.status || 'Red') + ').';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }
}
