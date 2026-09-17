import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ocupacion-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ocupacion-horarios.html'
})
export class OcupacionHorariosComponent {
  clases = [
    { id: 1, nombre: 'Ingeniería de Software 2026-2' },
    { id: 2, nombre: 'Ciencias de la Computación 2026-1' }
  ];

  claseSeleccionadaId: number = 0;

  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horas = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

  // Horarios ocupados por clase
  ocupados = new Map<number, { dia: string; horaInicio: string; horaFin: string }[]>();

  constructor() {
    // Simulación de datos para la clase 1
    this.ocupados.set(1, [
      { dia: 'Lunes', horaInicio: '10:00', horaFin: '12:00' },
      { dia: 'Miércoles', horaInicio: '08:00', horaFin: '10:00' }
    ]);
  }

  getOcupadosClase(): any[] {
    return this.ocupados.get(this.claseSeleccionadaId) || [];
  }

  toggleOcupado(dia: string, hora: string) {
    const claseOcupados = this.getOcupadosClase();
    const idx = claseOcupados.findIndex(o => o.dia === dia && o.horaInicio === hora);
    if (idx > -1) {
      claseOcupados.splice(idx, 1);
    } else {
      claseOcupados.push({ dia, horaInicio: hora, horaFin: hora });
    }
    this.ocupados.set(this.claseSeleccionadaId, claseOcupados);
  }

  isOcupado(dia: string, hora: string): boolean {
    return this.getOcupadosClase().some(o => o.dia === dia && o.horaInicio === hora);
  }
}
