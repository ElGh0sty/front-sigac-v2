import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-right-sidebar-ayudante',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './right-sidebar-ayudante.html'
})
export class RightSidebarAyudanteComponent {
  proximasClases = [
    {
      titulo: 'Cálculo Avanzado (Ayudantía Virtual)',
      curso: 'Ing. de Software (Grupo A)',
      descripcion: 'Zoom Aula Virtual',
      horario: 'Lunes · 10:00 - 12:00',
      estado: 'Ocupado'
    },
    {
      titulo: 'Cálculo Avanzado (Taller de Ejercicios)',
      curso: 'Ing. de Software (Grupo A)',
      descripcion: 'Laboratorio de Cómputo 2',
      horario: 'Jueves · 11:00 - 12:00',
      estado: 'Ocupado'
    }
  ];
}
