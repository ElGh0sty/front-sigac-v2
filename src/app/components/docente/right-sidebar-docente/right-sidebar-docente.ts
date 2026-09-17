import { ApplicationRef, ChangeDetectorRef, Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { take, timeout } from 'rxjs';

import { DocenteService } from '../../../services/docente.service';

interface AlertaRendimientoDocente {
  estudianteId: number;
  nombreEstudiante: string;
  promedioActual: number | null;
  catedraId: number | null;
  claseId: number;
  claseNombre: string;
}

@Component({
  selector: 'app-right-sidebar-docente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-sidebar-docente.html',
})
export class RightSidebarDocenteComponent implements OnInit {
  alertas: AlertaRendimientoDocente[] = [];

  cargando = false;
  errorMessage = '';

  constructor(
    private docenteService: DocenteService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef,
  ) {}

  ngOnInit(): void {
    this.cargarAlertas();
  }

  private refrescarVista(): void {
    this.cdr.markForCheck();

    setTimeout(() => {
      this.cdr.markForCheck();
      this.appRef.tick();
    }, 0);
  }

  cargarAlertas(): void {
    this.cargando = true;
    this.errorMessage = '';

    this.refrescarVista();

    this.docenteService
      .getClasesDocente()
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: (data: any) => {
          console.log('CLASES RECIBIDAS EN PANEL DE ALERTAS:', data);

          const clases = Array.isArray(data) ? data : [];

          const nuevasAlertas: AlertaRendimientoDocente[] = [];

          for (const clase of clases) {
            const claseId = Number(clase.claseId || clase.id || 0);

            const claseNombre =
              clase.nombreMateria ||
              clase.materiaNombre ||
              clase.materia ||
              clase.nombre ||
              clase.codigo ||
              'Clase';

            const estudiantes = Array.isArray(clase.estudiantes) ? clase.estudiantes : [];

            for (const estudiante of estudiantes) {
              if (estudiante.alertaRendimiento === true) {
                nuevasAlertas.push({
                  estudianteId: Number(estudiante.estudianteId || estudiante.id || 0),

                  nombreEstudiante:
                    estudiante.nombreCompleto ||
                    estudiante.nombre ||
                    estudiante.username ||
                    'Estudiante',

                  promedioActual:
                    estudiante.promedioActual === null || estudiante.promedioActual === undefined
                      ? null
                      : Number(estudiante.promedioActual),

                  catedraId:
                    estudiante.catedraId === null || estudiante.catedraId === undefined
                      ? null
                      : Number(estudiante.catedraId),

                  claseId,

                  claseNombre,
                });
              }
            }
          }

          this.alertas = nuevasAlertas;

          this.cargando = false;

          console.log('ALERTAS DE RENDIMIENTO:', this.alertas);

          this.refrescarVista();
        },

        error: (err: any) => {
          console.error('ERROR CARGANDO ALERTAS:', err);

          this.alertas = [];
          this.cargando = false;

          if (err?.name === 'TimeoutError') {
            this.errorMessage = 'El servidor tardó demasiado en cargar las alertas.';
          } else {
            this.errorMessage = 'No se pudieron cargar las alertas de rendimiento.';
          }

          this.refrescarVista();
        },
      });
  }

  verEstudiante(alerta: AlertaRendimientoDocente): void {
    this.router.navigate(['/docente/gestion-estudiantes'], {
      queryParams: {
        claseId: alerta.claseId,
        abrirEstudiante: alerta.estudianteId,
        t: Date.now(),
      },
    });
  }
}
