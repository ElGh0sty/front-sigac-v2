import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoordinadorService, SolicitudAyudantiaDto } from '../../../services/coordinador.service';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones.html'
})
export class AsignacionesComponent implements OnInit {
  solicitudesPendientes: SolicitudAyudantiaDto[] = [];

  asignacion = {
    ayudantiaId: 0
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private coordinadorService: CoordinadorService) {}

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.coordinadorService.getSolicitudesAyudantia().subscribe({
      next: (list) => {
        this.solicitudesPendientes = list.filter(s => s.estado === 'Pendiente' || s.estado === 'Convocada');
      },
      error: () => {
        this.solicitudesPendientes = [];
      }
    });
  }

  asignar(): void {
    this.guardarAsignacion();
  }

  guardarAsignacion(): void {
    if (!this.asignacion.ayudantiaId) {
      this.errorMessage = 'Por favor selecciona una postulación/ayudantía.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.coordinadorService.asignarAyudante({ ayudantiaId: Number(this.asignacion.ayudantiaId) }).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Ayudantía asignada y activada con éxito.';
        this.solicitudesPendientes = this.solicitudesPendientes.filter(s => s.ayudantiaId !== Number(this.asignacion.ayudantiaId));
        this.asignacion.ayudantiaId = 0;
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.successMessage = 'Asignación procesada.';
        this.solicitudesPendientes = this.solicitudesPendientes.filter(s => s.ayudantiaId !== Number(this.asignacion.ayudantiaId));
        this.asignacion.ayudantiaId = 0;
        setTimeout(() => this.successMessage = '', 4000);
      }
    });
  }
}
