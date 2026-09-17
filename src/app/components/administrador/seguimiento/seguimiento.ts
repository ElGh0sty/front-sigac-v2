import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoordinadorService } from '../../../services/coordinador.service';

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seguimiento.html'
})
export class SeguimientoComponent implements OnInit {
  ayudantias: any[] = [];
  isLoading = false;

  constructor(private coordinadorService: CoordinadorService) {}

  ngOnInit() {
    this.cargarSeguimiento();
  }

  cargarSeguimiento() {
    this.isLoading = true;
    this.coordinadorService.getSeguimientoAyudantias().subscribe({
      next: (data: any[]) => {
        this.isLoading = false;
        if (data && data.length > 0) {
          this.ayudantias = data;
        } else {
          this.ayudantias = [];
        }
      },
      error: () => {
        this.isLoading = false;
        this.ayudantias = [];
      }
    });
  }
}
