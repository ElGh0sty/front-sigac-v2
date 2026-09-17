import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MateriaDto, MateriaService } from '../../../services/materia.service';
import { normalizarTexto } from '../../../utils/search.utils';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './materias.html'
})
export class MateriasComponent implements OnInit, OnDestroy {
  materias: MateriaDto[] = [];
  filtroTexto: string = '';
  filtroSemestre: string = 'todos';
  private sub?: Subscription;

  // Paleta armónica universitaria para distinguir asignaturas
  private colorThemes = [
    {
      bgAccent: 'from-blue-600 to-indigo-700',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      barColor: 'bg-blue-600',
      tagText: 'text-blue-700'
    },
    {
      bgAccent: 'from-emerald-600 to-teal-700',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-emerald-600',
      tagText: 'text-emerald-700'
    },
    {
      bgAccent: 'from-purple-600 to-indigo-800',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      barColor: 'bg-purple-600',
      tagText: 'text-purple-700'
    },
    {
      bgAccent: 'from-amber-600 to-orange-700',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      barColor: 'bg-amber-600',
      tagText: 'text-amber-700'
    },
    {
      bgAccent: 'from-cyan-600 to-blue-700',
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-100',
      badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      barColor: 'bg-cyan-600',
      tagText: 'text-cyan-700'
    }
  ];

  constructor(private materiaService: MateriaService) {}

  ngOnInit() {
    this.sub = this.materiaService.materias$.subscribe(list => {
      this.materias = list || [];
    });
    this.materiaService.refreshMaterias().subscribe({
      next: (list) => {
        this.materias = list || [];
      },
      error: () => {
        this.materias = this.materiaService.getMateriasSnapshot() || [];
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  get materiasFiltradas(): MateriaDto[] {
    const term = normalizarTexto(this.filtroTexto);
    return this.materias.filter(m => {
      const cumpleTexto = !term ||
        normalizarTexto(m.nombre).includes(term) ||
        normalizarTexto(m.codigo).includes(term) ||
        normalizarTexto(m.docente).includes(term) ||
        normalizarTexto(m.descripcion).includes(term) ||
        normalizarTexto(this.getAulaHorario(m)).includes(term);
      
      const cumpleSemestre = this.filtroSemestre === 'todos' ||
        (m.semestre && m.semestre === this.filtroSemestre);

      return cumpleTexto && cumpleSemestre;
    });
  }

  getColorTheme(index: number) {
    return this.colorThemes[index % this.colorThemes.length];
  }

  getInicialesDocente(nombre?: string): string {
    if (!nombre) return 'DC';
    const limpio = nombre.replace(/(Dr\.|Dra\.|Ing\.|Lic\.|Prof\.)/gi, '').trim();
    if (!limpio) return 'DC';
    const partes = limpio.split(/\s+/).filter(Boolean);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0].substring(0, Math.min(2, partes[0].length)).toUpperCase() || 'DC';
  }

  getPorcentajeAvance(m: MateriaDto): number {
    const semActual = m.semana || 8;
    const semTotal = m.totalSemanas || 16;
    return Math.min(100, Math.round((semActual / semTotal) * 100));
  }

  getAulaHorario(m: MateriaDto): string {
    const horariosPorCodigo: Record<string, string> = {
      'MAT-301': 'Aula Magna B-102 • Lun y Mié 07:00 - 09:00',
      'SIS-302': 'Laboratorio de Cómputo 3 • Mar y Jue 09:00 - 11:00',
      'SIS-501': 'Aula Tecnológica 204 • Mié y Vie 11:00 - 13:00',
      'BD-204': 'Laboratorio de Bases de Datos • Lun y Vie 14:00 - 16:00',
      'FIS-102': 'Pabellón de Ciencias F-101 • Mar y Jue 14:00 - 16:00'
    };
    return horariosPorCodigo[m.codigo] || 'Campus Matriz • Aula General 201';
  }

  getCantidadActividades(m: MateriaDto): number {
    const act = this.materiaService.getActividadesSnapshot(m.id);
    return act && act.length > 0 ? act.length : 3;
  }
}

