import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { combineLatest, Subscription } from 'rxjs';
import { MateriaDto, MateriaService } from '../../../services/materia.service';
import { ClaseDto, ClaseService } from '../../../services/clase.service';

export interface GrupoClaseMaterias {
  claseNombre: string;
  claseId?: number;
  semestre?: string;
  materias: MateriaDto[];
  totalEstudiantes: number;
  totalCreditos: number;
}

@Component({
  selector: 'app-materias-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './materias-admin.html'
})
export class MateriasAdminComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private materiaService = inject(MateriaService);
  private claseService = inject(ClaseService);

  materias: MateriaDto[] = [];
  materiasFiltradas: MateriaDto[] = [];
  clases: ClaseDto[] = [];

  // Píldora y selector de clase: 'Todas' predeterminado
  claseSeleccionada: any = 'Todas';
  terminoBusqueda = '';
  filtroSemestre = 'todos';
  modoVista: 'grid' | 'por_clase' = 'grid';

  private subDatos?: Subscription;

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.subDatos?.unsubscribe();
  }

  cargarDatos(): void {
    this.subDatos?.unsubscribe();
    this.subDatos = combineLatest([
      this.materiaService.getMaterias(),
      this.claseService.getClases()
    ]).subscribe({
      next: ([materias, clases]) => {
        this.materias = Array.isArray(materias) ? materias : [];
        this.clases = Array.isArray(clases) ? clases : [];
        this.actualizarRelacionClasesMaterias();
        this.aplicarFiltros();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar materias y clases:', err);
        this.materias = [];
        this.clases = [];
        this.aplicarFiltros();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  cargarMaterias(): void {
    this.cargarDatos();
  }

  cargarClases(): void {
    this.cargarDatos();
  }

  actualizarRelacionClasesMaterias(): void {
    if (this.materias.length > 0) {
      this.materias.forEach(m => {
        if (!m.clases) {
          m.clases = [];
        }

        // Si la materia tiene claseId, vincular claseNombre si aún no lo tiene
        if (m.claseId && !m.claseNombre) {
          const matchingClase = this.clases.find(c => Number(c.id) === Number(m.claseId));
          if (matchingClase) {
            m.claseNombre = matchingClase.nombre;
          }
        }

        // Asociar clases encontradas que apunten a esta materia o viceversa
        const clasesAsociadas = this.clases.filter(c =>
          (m.claseId && Number(c.id) === Number(m.claseId)) ||
          Number(c.materiaId) === Number(m.id) ||
          (Array.isArray(c.materiaIds) && c.materiaIds.some(id => Number(id) === Number(m.id)))
        );

        clasesAsociadas.forEach(c => {
          const yaExiste = (m.clases as any[]).some(mc => {
            const mcId = typeof mc === 'object' ? mc.id : null;
            return mcId && Number(mcId) === Number(c.id);
          });

          if (!yaExiste) {
            (m.clases as any[]).push({
              id: c.id,
              nombre: c.nombre,
              semestre: c.semestre,
              docenteNombre: c.docenteNombre
            });
          }
        });

        if (m.clases.length > 0 && !m.claseNombre) {
          const primera = m.clases[0];
          m.claseNombre = typeof primera === 'string' ? primera : primera.nombre;
        }
      });
    }
  }

  getClasesList(materia: MateriaDto): any[] {
    if (!materia.clases || !Array.isArray(materia.clases)) {
      return [];
    }
    return materia.clases;
  }

  getClaseNombre(c: any): string {
    if (!c) return 'Paralelo';
    if (typeof c === 'string') return c;
    return c.nombre || c.nombreClase || c.paralelo || 'Paralelo';
  }

  seleccionarClase(clase: any): void {
    this.claseSeleccionada = clase;
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.claseSeleccionada = 'Todas';
    this.terminoBusqueda = '';
    this.filtroSemestre = 'todos';
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let resultado = [...this.materias];

    // Si se seleccionó una clase específica (no 'Todas'):
    if (this.claseSeleccionada && this.claseSeleccionada !== 'Todas' && this.claseSeleccionada.id) {
      resultado = resultado.filter(m => {
        return (m.claseId && Number(m.claseId) === Number(this.claseSeleccionada.id)) ||
               Number(this.claseSeleccionada.materiaId) === Number(m.id) ||
               (m.clases && (m.clases as any[]).some(c => c.id && Number(c.id) === Number(this.claseSeleccionada.id))) ||
               (m.claseNombre && m.claseNombre.trim().toLowerCase() === this.claseSeleccionada.nombre.trim().toLowerCase());
      });
    }

    // Filtro por término de búsqueda en texto
    if (this.terminoBusqueda && this.terminoBusqueda.trim() !== '') {
      const q = this.terminoBusqueda.toLowerCase().trim();
      resultado = resultado.filter(m =>
        m.nombre?.toLowerCase().includes(q) ||
        m.codigo?.toLowerCase().includes(q) ||
        (m as any).docenteNombre?.toLowerCase().includes(q) ||
        m.docente?.toLowerCase().includes(q) ||
        (m.claseNombre && m.claseNombre.toLowerCase().includes(q)) ||
        (m.clases && (m.clases as any[]).some(c => this.getClaseNombre(c).toLowerCase().includes(q)))
      );
    }

    // Filtro adicional por semestre si aplica
    if (this.filtroSemestre && this.filtroSemestre !== 'todos') {
      resultado = resultado.filter(m => m.semestre === this.filtroSemestre);
    }

    this.materiasFiltradas = resultado;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  eliminarMateria(id: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (confirm('¿Estás seguro de eliminar esta materia del sistema?')) {
      this.materiaService.eliminarMateria(id).subscribe({
        next: () => {
          this.cargarDatos();
        },
        error: (err) => {
          console.error('Error al eliminar materia:', err);
          this.cargarDatos();
        }
      });
    }
  }

  get semestresDisponibles(): string[] {
    const semestres = new Set<string>();
    this.clases.forEach(c => { if (c.semestre) semestres.add(c.semestre); });
    this.materias.forEach(m => { if (m.semestre) semestres.add(m.semestre); });
    return Array.from(new Set(['2026-2', '2026-1', ...Array.from(semestres)]));
  }

  get materiasAgrupadasPorClase(): GrupoClaseMaterias[] {
    const mapGrupos = new Map<string, MateriaDto[]>();

    // Inicializar grupos conocidos con los nombres de clases existentes
    this.clases.forEach(c => {
      const nombre = c.nombre?.trim();
      if (nombre && !mapGrupos.has(nombre)) {
        mapGrupos.set(nombre, []);
      }
    });

    this.materiasFiltradas.forEach(m => {
      // Agrupar directamente según materia.claseNombre o materia.claseId
      let nombreClase = m.claseNombre?.trim();

      if (!nombreClase && m.claseId) {
        const matchingClase = this.clases.find(c => Number(c.id) === Number(m.claseId));
        if (matchingClase?.nombre) {
          nombreClase = matchingClase.nombre.trim();
        }
      }

      if (!nombreClase && m.clases && m.clases.length > 0) {
        const primera = m.clases[0];
        nombreClase = this.getClaseNombre(primera)?.trim();
      }

      if (!nombreClase) {
        nombreClase = 'Otras Materias / Sin Clase Asignada';
      }

      if (!mapGrupos.has(nombreClase)) {
        mapGrupos.set(nombreClase, []);
      }

      const lista = mapGrupos.get(nombreClase)!;
      if (!lista.some(existente => Number(existente.id) === Number(m.id))) {
        lista.push(m);
      }
    });

    const resultado: GrupoClaseMaterias[] = [];
    mapGrupos.forEach((mats, nombreClase) => {
      if (mats.length > 0 || (this.claseSeleccionada === 'Todas' && !this.terminoBusqueda.trim() && nombreClase !== 'Otras Materias / Sin Clase Asignada')) {
        const matchingClase = this.clases.find(c => c.nombre?.trim().toLowerCase() === nombreClase.trim().toLowerCase());
        const totalEstudiantes = mats.reduce((acc, curr) => acc + (curr.estudiantes?.length || 0), 0);
        const totalCreditos = mats.reduce((acc, curr) => acc + (curr.creditos || 4), 0);

        resultado.push({
          claseNombre: nombreClase,
          claseId: matchingClase?.id || mats.find(m => m.claseId)?.claseId,
          semestre: matchingClase?.semestre || mats[0]?.semestre || '2026-2',
          materias: mats,
          totalEstudiantes,
          totalCreditos
        });
      }
    });

    return resultado;
  }

  getBadgeColorClass(claseNombre?: string): { bg: string, text: string, border: string } {
    if (!claseNombre) {
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
    }
    const hash = claseNombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
    ];
    return colors[hash % colors.length];
  }
}
