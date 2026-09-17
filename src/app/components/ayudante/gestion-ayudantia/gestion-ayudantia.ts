import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EstudianteService, HistorialAyudantiaDto } from '../../../services/estudiante.service';
import { DocenteService, MonitoreoAyudantiaDto } from '../../../services/docente.service';
import { AyudantiaService } from '../../../services/ayudantia.service';
import { PostulacionComponent } from '../../estudiante/postulacion/postulacion';

export interface ValidacionRequisitosEstudiante {
  porcentajeMalla: number;
  promedioEstudiante: number;
  promedioCarrera: number;
  promedioCurso: number;
  cumpleRequisitos: boolean;
}

@Component({
  selector: 'app-gestion-ayudantia',
  imports: [CommonModule, RouterModule, PostulacionComponent],
  templateUrl: './gestion-ayudantia.html',
  styleUrls: ['./gestion-ayudantia.css']
})
export class GestionAyudantiaComponent implements OnInit {
  private estudianteService = inject(EstudianteService);
  private docenteService = inject(DocenteService);
  private ayudantiaService = inject(AyudantiaService);

  tab: 'catedra' | 'requisitos' | 'postulaciones' = 'catedra';

  cargando = true;
  cargandoMonitoreo = false;

  // Modelos respaldados 100% por los endpoints reales del backend
  historial: HistorialAyudantiaDto[] = [];
  ayudantiaActiva: HistorialAyudantiaDto | null = null;
  monitoreo: MonitoreoAyudantiaDto | null = null;
  requisitos: ValidacionRequisitosEstudiante | null = null;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    const idGuardado = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const estudianteId = idGuardado ? Number(idGuardado) : 1;

    // 1. Cargar Historial de Ayudantías (GET /api/Estudiante/ayudantias/historial)
    this.estudianteService.getHistorialAyudantias().subscribe({
      next: (data) => {
        this.historial = Array.isArray(data) ? data : [];
        
        // Buscar la ayudantía en estado Asignada o activa
        this.ayudantiaActiva = this.historial.find(h => 
          h.estadoAyudantia?.toLowerCase().includes('asignad') ||
          h.estadoAyudantia?.toLowerCase().includes('activ')
        ) || (this.historial.length > 0 ? this.historial[0] : null);

        // 2. Si existe ayudantía, cargar monitoreo oficial del docente (GET /api/docente/ayudantias/{id}/monitoreo)
        if (this.ayudantiaActiva) {
          this.cargarMonitoreo(this.ayudantiaActiva.ayudantiaId);
        }

        this.cargando = false;
      },
      error: () => {
        this.historial = [];
        this.ayudantiaActiva = null;
        this.cargando = false;
      }
    });

    // 3. Cargar validación de méritos del estudiante (GET /api/coordinador/estudiantes/{id}/validacion-requisitos)
    this.ayudantiaService.getValidacionRequisitosEstudiante(estudianteId).subscribe({
      next: (req) => {
        this.requisitos = req;
      }
    });
  }

  cargarMonitoreo(ayudantiaId: number): void {
    this.cargandoMonitoreo = true;
    this.docenteService.monitorearAyudantia(ayudantiaId).subscribe({
      next: (res) => {
        this.monitoreo = res;
        this.cargandoMonitoreo = false;
      },
      error: () => {
        this.cargandoMonitoreo = false;
      }
    });
  }

  get totalActividades(): number {
    return this.monitoreo?.planificacion?.length || 0;
  }

  get actividadesCompletadas(): number {
    return this.monitoreo?.planificacion?.filter(a => a.completada).length || 0;
  }

  get porcentajeAvance(): number {
    if (this.totalActividades === 0) return 0;
    return Math.round((this.actividadesCompletadas / this.totalActividades) * 100);
  }
}

