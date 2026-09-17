import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MateriaService } from '../../services/materia.service';
import { AuthService } from '../../services/auth.service';

declare const Plotly: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  rol = localStorage.getItem('rol') || 'Estudiante';
  esAyudante = localStorage.getItem('rol') === 'Ayudante';
  private sub?: Subscription;

  // --- Datos del Estudiante ---
  materiasEstudiante: any[] = [];
  estadisticasEstudiante = {
    promedio: 0,
    materiasActivas: 0,
    asistencia: 0,
    creditosAprobados: 0
  };

  // --- Datos del Ayudante / Docente ---
  dashboardAyudante = {
    estudiantes: 0,
    clasesImpartidas: 0,
    promedioAsistencia: 0,
    proximasClases: [] as Array<{ titulo: string; descripcion: string; ruta: string }>
  };

  // --- Datos del Administrador ---
  dashboardAdmin = {
    materias: 3,
    docentes: 8,
    estudiantes: 240,
    ayudantiasActivas: 5
  };

  constructor(
    private router: Router,
    private materiaService: MateriaService
  ) {}

  ngOnInit(): void {
    this.authService.verificarYActualizarRolAyudante();
    this.rol = localStorage.getItem('rol') || 'Estudiante';
    this.esAyudante = this.rol === 'Ayudante' || this.authService.esUsuarioAyudante();

    if (this.rol === 'Estudiante' || this.rol === 'Docente' || this.rol === 'Ayudante' || this.esAyudante) {
      this.materiaService.refreshMaterias().subscribe();
    }

    this.sub = this.materiaService.materias$.subscribe(list => {
      this.dashboardAdmin.materias = list.length;

      const correoUsuario = (localStorage.getItem('correo') || '').toLowerCase().trim();
      const userId = Number(localStorage.getItem('userId')) || 1;

      if (this.rol === 'Docente' || this.rol === 'Ayudante' || this.esAyudante) {
        const clasesDelUsuario = list.map((m, idx) => {
          const totalEstudiantes = Array.isArray(m.estudiantes) ? m.estudiantes.length : 0;
          const asistenciaPromedio = totalEstudiantes > 0
            ? (m.estudiantes!.reduce((sum, e) => sum + (typeof e.asistencia === 'number' ? e.asistencia : 0), 0) / totalEstudiantes)
            : 0;

          return {
            titulo: `${m.nombre}${m.codigo ? ` · ${m.codigo}` : ''}`,
            descripcion: `${m.docente || 'Docente Titular'} · ${m.semestre || '2026-2'} · ${m.grupo || 'Grupo A'} · ${totalEstudiantes} estudiantes · ${Math.round(asistenciaPromedio)}% asistencia`,
            ruta: (this.rol === 'Ayudante' || this.esAyudante) ? '/ayudante/materias' : '/docente/gestion-clases'
          };
        });

        this.dashboardAyudante.estudiantes = list.reduce((sum, m) => sum + (Array.isArray(m.estudiantes) ? m.estudiantes.length : 0), 0);
        this.dashboardAyudante.clasesImpartidas = list.length;
        this.dashboardAyudante.promedioAsistencia = list.length > 0
          ? Math.round(list.reduce((sum, m) => {
              const estudiantes = Array.isArray(m.estudiantes) ? m.estudiantes : [];
              const promedioMateria = estudiantes.length > 0
                ? estudiantes.reduce((s, e) => s + (typeof e.asistencia === 'number' ? e.asistencia : 0), 0) / estudiantes.length
                : 0;
              return sum + promedioMateria;
            }, 0) / list.length)
          : 0;
        this.dashboardAyudante.proximasClases = clasesDelUsuario.length > 0 ? clasesDelUsuario.slice(0, 4) : [
          { titulo: 'Sin clases programadas', descripcion: 'No hay materias registradas para este usuario en el sistema.', ruta: (this.rol === 'Ayudante' || this.esAyudante) ? '/ayudante/materias' : '/docente/gestion-clases' }
        ];
      }

      this.materiasEstudiante = list.map((m, idx) => {
        // Encontrar datos del estudiante logueado si están disponibles en la materia
        const estData = m.estudiantes?.find(e =>
          (correoUsuario && e.correo && e.correo.toLowerCase() === correoUsuario) ||
          Number(e.id) === userId || Number(e.estudianteId) === userId
        );

        const notaActual = estData?.nota !== undefined ? estData.nota : 4.8;
        const asistenciaActual = estData?.asistencia !== undefined ? estData.asistencia : 96;

        return {
          id: idx + 1,
          catedraId: m.id,
          catedra: { id: m.id, nombre: m.nombre, docente: { username: m.docente || 'Docente Titular' } },
          promedioActual: notaActual,
          asistencia: asistenciaActual,
          alertaRendimiento: notaActual < 3.0
        };
      });

      // Cálculo de estadísticas ÚNICAMENTE sobre las materias reales del usuario
      if (this.materiasEstudiante.length === 0) {
        this.estadisticasEstudiante = {
          promedio: 0,
          materiasActivas: 0,
          asistencia: 0,
          creditosAprobados: 0
        };
      } else {
        const sumaPromedios = this.materiasEstudiante.reduce((sum, m) => sum + (m.promedioActual || 0), 0);
        const sumaAsistencias = this.materiasEstudiante.reduce((sum, m) => sum + (m.asistencia || 0), 0);
        const totalCreditos = list.reduce((sum, m) => sum + (m.creditos || 4), 0);

        this.estadisticasEstudiante = {
          promedio: Number((sumaPromedios / this.materiasEstudiante.length).toFixed(2)),
          materiasActivas: this.materiasEstudiante.length,
          asistencia: Number((sumaAsistencias / this.materiasEstudiante.length).toFixed(1)),
          creditosAprobados: totalCreditos
        };
      }

      if (this.rol === 'Estudiante' && !this.esAyudante) {
        setTimeout(() => this.renderChart(), 100);
      }
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url === '/dashboard' && this.rol === 'Estudiante' && !this.esAyudante) {
          this.renderChart();
        }
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    if (this.rol === 'Estudiante' && !this.esAyudante) {
      this.renderChart();
    }
  }

  renderChart() {
    const el = document.getElementById('trajectory-chart');
    if (!el || typeof Plotly === 'undefined') return;

    const data = [
      {
        x: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
        y: [4.2, 4.4, 4.3, 4.5, 4.7, 4.6, 4.8, 4.84],
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Tu Promedio',
        line: { color: '#2563eb', width: 3, shape: 'spline' },
        fill: 'tozeroy',
        fillcolor: 'rgba(37, 99, 235, 0.05)'
      },
      {
        x: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
        y: [3.8, 3.9, 3.9, 4.0, 4.1, 4.1, 4.2, 4.2],
        type: 'scatter',
        mode: 'lines',
        name: 'Promedio Grupal',
        line: { color: '#94a3b8', width: 2, dash: 'dot', shape: 'spline' }
      }
    ];

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 10, r: 10, b: 40, l: 40 },
      showlegend: false,
      xaxis: { gridcolor: '#f1f5f9', tickfont: { color: '#94a3b8', size: 10 }, linecolor: '#f1f5f9' },
      yaxis: { gridcolor: '#f1f5f9', tickfont: { color: '#94a3b8', size: 10 }, range: [3.0, 5.0], dtick: 0.5 },
      hovermode: 'x unified',
      hoverlabel: { bgcolor: '#ffffff', bordercolor: '#e2e8f0', font: { color: '#0f172a' } }
    };

    const config = { responsive: true, displayModeBar: false, displaylogo: false };
    Plotly.newPlot('trajectory-chart', data, layout, config);
  }
}
