import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ClaseService, ClaseDto } from '../../../services/clase.service';
import { MateriaService, MateriaDto } from '../../../services/materia.service';

export interface HorarioItem {
  id?: number;
  claseId: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
  materia: string;
  docente?: string;
  plataforma?: string;
  aula?: string;
  esMiClase?: boolean;
}

@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './horarios.html'
})
export class HorariosComponent implements OnInit, OnDestroy {
  rol = localStorage.getItem('rol') || 'Estudiante';
  esAyudante = this.rol === 'Ayudante' || this.rol === 'Docente';

  get esModoAyudante(): boolean {
    const rol = (localStorage.getItem('rol') || this.rol || '').trim().toLowerCase();
    return rol === 'ayudante' || this.router.url.includes('/ayudante');
  }

  get esDocenteOAdmin(): boolean {
    const rol = (localStorage.getItem('rol') || this.rol || '').trim().toLowerCase();
    return rol === 'docente' || rol === 'administrador';
  }

  get nombreCursoAsignado(): string {
    return 'Ingeniería de Software 2026-2 (Cálculo Avanzado - Grupo A)';
  }

  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horas = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  alturaCelda = 60;

  // Lista de todas las clases disponibles para el combobox
  clasesDisponibles: Array<{ id: number; nombre: string; materia: string }> = [
    { id: 1, nombre: 'Ingeniería de Software 2026-2', materia: 'Cálculo Avanzado' },
    { id: 2, nombre: 'Ciencias Físicas e Ingeniería 2026-1', materia: 'Mecánica Cuántica' },
    { id: 3, nombre: 'Ciencias de la Computación 2026-2', materia: 'Redes Neuronales y AI' }
  ];

  // Identificador de la clase seleccionada en el selector (o 'todas')
  claseSeleccionadaId: number | 'todas' = 'todas';
  claseSeleccionadaInfo: { id: number; nombre: string; materia: string } | null = null;

  // Horarios registrados
  horariosRegistrados: HorarioItem[] = [
    {
      claseId: 1,
      dia: 'Lunes',
      horaInicio: '10:00',
      horaFin: '12:00',
      materia: 'Cálculo Avanzado',
      docente: 'Dra. Evelyn Vance',
      plataforma: 'Zoom Aula Virtual',
      esMiClase: true
    },
    {
      claseId: 2,
      dia: 'Miércoles',
      horaInicio: '08:00',
      horaFin: '10:00',
      materia: 'Mecánica Cuántica',
      docente: 'Dr. Marcus Thorne',
      aula: 'Aula 301 - Edif. Central',
      esMiClase: false
    },
    {
      claseId: 3,
      dia: 'Viernes',
      horaInicio: '14:00',
      horaFin: '16:00',
      materia: 'Redes Neuronales y AI',
      docente: 'Prof. Sarah Chen',
      plataforma: 'Google Meet',
      esMiClase: false
    },
    {
      claseId: 1,
      dia: 'Jueves',
      horaInicio: '11:00',
      horaFin: '12:00',
      materia: 'Cálculo Avanzado (Taller)',
      docente: 'Dra. Evelyn Vance',
      aula: 'Laboratorio de Cómputo 2',
      esMiClase: true
    }
  ];

  // Vista seleccionada: Matriz semanal o Lista de agenda por días
  vistaActiva: 'semanal' | 'agenda' = 'semanal';

  // Variables para la selección manual de horas por ayudante
  seleccionadas = new Set<string>();
  diaSeleccionado: string = 'Lunes';

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private claseService: ClaseService,
    private materiaService: MateriaService
  ) {}

  ngOnInit(): void {
    // 1. Cargar clases del servicio
    this.subs.push(
      this.claseService.clases$.subscribe(clases => {
        if (clases && clases.length > 0) {
          this.clasesDisponibles = clases.map(c => ({
            id: c.id,
            nombre: c.nombre,
            materia: c.descripcion || c.nombre
          }));
        }
        // Verificar si la clase seleccionada coincide
        this.actualizarInfoClaseSeleccionada();
      })
    );

    // 2. Leer parámetro de ruta :claseId (ej: /horarios/:claseId)
    this.subs.push(
      this.route.paramMap.subscribe(params => {
        const idParam = params.get('claseId');
        if (idParam) {
          const idNum = Number(idParam);
          if (!isNaN(idNum)) {
            this.seleccionarClase(idNum, false);
          }
        } else {
          // Si no hay parámetro de claseId, comprobar queryParams por compatibilidad
          const queryId = this.route.snapshot.queryParams['claseId'];
          if (queryId) {
            this.seleccionarClase(Number(queryId), false);
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // Manejar cambio en el combobox / selector
  onClaseSelectorChange(valor: string): void {
    if (valor === 'todas') {
      this.claseSeleccionadaId = 'todas';
      this.claseSeleccionadaInfo = null;
      // Navegar a la ruta base de horarios
      this.router.navigate(['/horarios']);
    } else {
      const idNum = Number(valor);
      this.seleccionarClase(idNum, true);
    }
  }

  seleccionarClase(claseId: number, actualizarRuta: boolean = true): void {
    this.claseSeleccionadaId = claseId;
    this.actualizarInfoClaseSeleccionada();

    if (actualizarRuta) {
      this.router.navigate(['/horarios', claseId]);
    }
  }

  limpiarFiltroClase(): void {
    this.claseSeleccionadaId = 'todas';
    this.claseSeleccionadaInfo = null;
    this.router.navigate(['/horarios']);
  }

  private actualizarInfoClaseSeleccionada(): void {
    if (this.claseSeleccionadaId === 'todas') {
      this.claseSeleccionadaInfo = null;
      return;
    }
    const encontrada = this.clasesDisponibles.find(c => Number(c.id) === Number(this.claseSeleccionadaId));
    if (encontrada) {
      this.claseSeleccionadaInfo = encontrada;
    } else {
      this.claseSeleccionadaInfo = {
        id: Number(this.claseSeleccionadaId),
        nombre: `Clase #${this.claseSeleccionadaId}`,
        materia: 'Asignatura Asignada'
      };
    }
  }

  // Lista de todas las clases disponibles filtradas según el rol
  get clasesFiltradasParaSelector(): Array<{ id: number; nombre: string; materia: string }> {
    if (this.esModoAyudante) {
      return this.clasesDisponibles.filter(c => c.id === 1);
    }
    return this.clasesDisponibles;
  }

  // Lista de horarios según el filtro activo y el rol del usuario
  get horariosFiltrados(): HorarioItem[] {
    let list = this.horariosRegistrados;

    // Regla estricta: El ayudante de cátedra solo tiene permitido ver el horario
    // en el que ÉL debe dar clases a su curso asignado (nada más ni nada menos, solo donde ÉL está ocupado)
    if (this.esModoAyudante) {
      list = list.filter(c => c.esMiClase === true);
    }

    if (this.claseSeleccionadaId === 'todas') {
      return list;
    }
    return list.filter(c => Number(c.claseId) === Number(this.claseSeleccionadaId));
  }

  // Obtener horario en una celda filtrando según la selección
  getClaseEnCelda(dia: string, hora: string): HorarioItem | undefined {
    return this.horariosFiltrados.find(c => c.dia === dia && c.horaInicio === hora);
  }

  isHoraOcupada(dia: string, hora: string): boolean {
    return !!this.getClaseEnCelda(dia, hora);
  }

  // Alternar selección de una hora para crear clase
  toggleHora(dia: string, hora: string): void {
    // El ayudante no tiene permitido crear clases ni seleccionar franjas horarias
    if (this.esModoAyudante) return;
    if (!this.esDocenteOAdmin) return;
    if (this.isHoraOcupada(dia, hora)) return;

    const key = `${dia}|${hora}`;
    if (this.seleccionadas.has(key)) {
      this.seleccionadas.delete(key);
    } else {
      this.seleccionadas.add(key);
    }
  }

  crearClase(): void {
    if (this.esModoAyudante) return;
    if (this.seleccionadas.size === 0) {
      alert('Selecciona al menos una hora en la cuadrícula.');
      return;
    }

    const diasSeleccionados = new Set<string>();
    const horasSeleccionadasSet = new Set<string>();

    this.seleccionadas.forEach(key => {
      const [dia, hora] = key.split('|');
      diasSeleccionados.add(dia);
      horasSeleccionadasSet.add(hora);
    });

    const horasOrdenadas = Array.from(horasSeleccionadasSet)
      .sort((a, b) => this.horas.indexOf(a) - this.horas.indexOf(b));

    const horaInicio = horasOrdenadas[0];
    const horaFin = horasOrdenadas[horasOrdenadas.length - 1];

    this.router.navigate(['/admin/crear-clase'], {
      queryParams: {
        dias: Array.from(diasSeleccionados).join(','),
        horaInicio: horaInicio,
        horaFin: horaFin
      }
    });
  }

  // Obtener horarios de un día específico
  getHorariosPorDia(dia: string): HorarioItem[] {
    return this.horariosFiltrados
      .filter(h => h.dia === dia)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  // Duración en horas
  getHorasDuracion(c: HorarioItem): number {
    const inicio = parseInt(c.horaInicio.split(':')[0], 10);
    const fin = parseInt(c.horaFin.split(':')[0], 10);
    return Math.max(1, fin - inicio);
  }

  // Total de horas en la semana
  getTotalHorasSemanales(): number {
    return this.horariosFiltrados.reduce((total, c) => total + this.getHorasDuracion(c), 0);
  }

  // Próxima clase destacada
  getProximaClase(): HorarioItem | null {
    return this.horariosFiltrados[0] || null;
  }

  // Estilos visuales armónicos por materia
  getTemaMateria(materia: string) {
    const nombre = materia.toLowerCase();
    if (nombre.includes('cálculo') || nombre.includes('calculo')) {
      return {
        cardBg: 'bg-blue-50/90 border-blue-200 text-blue-950 hover:border-blue-300',
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        accentBar: 'bg-blue-600',
        iconColor: 'text-blue-600',
        timeBadge: 'bg-blue-100/70 text-blue-800'
      };
    }
    if (nombre.includes('mecánica') || nombre.includes('mecanica') || nombre.includes('física') || nombre.includes('fisica')) {
      return {
        cardBg: 'bg-emerald-50/90 border-emerald-200 text-emerald-950 hover:border-emerald-300',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        accentBar: 'bg-emerald-600',
        iconColor: 'text-emerald-600',
        timeBadge: 'bg-emerald-100/70 text-emerald-800'
      };
    }
    if (nombre.includes('redes') || nombre.includes('computación') || nombre.includes('software')) {
      return {
        cardBg: 'bg-purple-50/90 border-purple-200 text-purple-950 hover:border-purple-300',
        badge: 'bg-purple-100 text-purple-800 border-purple-200',
        accentBar: 'bg-purple-600',
        iconColor: 'text-purple-600',
        timeBadge: 'bg-purple-100/70 text-purple-800'
      };
    }
    return {
      cardBg: 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      accentBar: 'bg-accent',
      iconColor: 'text-accent',
      timeBadge: 'bg-slate-100 text-slate-700'
    };
  }
}
