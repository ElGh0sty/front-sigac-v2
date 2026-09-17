import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { combineLatest, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { MateriaDto, MateriaService } from '../../../services/materia.service';
import { ClaseDto, ClaseService } from '../../../services/clase.service';
import { AdminDocenteService } from '../../../services/admin-docente.service';
import { AuthService } from '../../../services/auth.service';

export interface ClaseConMaterias extends ClaseDto {
  materiasList: MateriaDto[];
  totalEstudiantes: number;
}

@Component({
  selector: 'app-clases-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './clases-admin.html'
})
export class ClasesAdminComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private claseService = inject(ClaseService);
  private materiaService = inject(MateriaService);
  private adminDocenteService = inject(AdminDocenteService);
  private authService = inject(AuthService);

  clasesConMaterias: ClaseConMaterias[] = [];
  materias: MateriaDto[] = [];
  docentesMap: Map<number, string> = new Map();
  filtroTexto = '';
  filtroSemestre = 'todos';
  ayudanteEmailPorClase: Record<number, string> = {};
  asignandoAyudanteId: number | null = null;
  mensajeAsignacion: Record<number, string> = {};

  private sub?: Subscription;
  private subDocentes?: Subscription;

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.authService.hasAnyRole(roles);
  }

  ngOnInit() {
    this.cargarDocentes();
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.subDocentes?.unsubscribe();
  }

  cargarDocentes() {
    this.subDocentes?.unsubscribe();
    this.subDocentes = this.adminDocenteService.getDocentes().subscribe({
      next: (list) => {
        const safe = Array.isArray(list) ? list : ((list as any)?.$values || (list as any)?.data || []);
        safe.forEach((d: any) => {
          const id = Number(d?.id ?? d?.M_ID ?? d?.personaId ?? d?.docenteId ?? 0);
          const nombre = [d?.nombre ?? d?.NOMBRE, d?.apellido ?? d?.APELLIDO].filter(Boolean).join(' ').trim()
            || d?.username || d?.usuario || d?.nombreCompleto;
          if (id > 0 && nombre) {
            this.docentesMap.set(id, nombre);
          }
        });
        if (this.clasesConMaterias.length > 0) {
          this.clasesConMaterias = this.clasesConMaterias.map(c => ({
            ...c,
            docenteNombre: c.docenteNombre || (c.docenteId ? this.docentesMap.get(c.docenteId) : undefined) || 'Docente no asignado'
          }));
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  cargarDatos() {
    this.sub?.unsubscribe();
    this.sub = combineLatest([
      this.claseService.getClases(),
      this.materiaService.getMaterias()
    ]).subscribe({
      next: ([clases, materias]) => {
        const safeClases = Array.isArray(clases) ? clases : [];
        const safeMaterias = Array.isArray(materias) ? materias : [];
        this.materias = safeMaterias;
        this.procesarClases(safeClases, safeMaterias);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar clases y materias:', err);
        this.procesarClases([], []);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  private procesarClases(clases: ClaseDto[], materias: MateriaDto[]) {
    this.clasesConMaterias = clases.map(c => {
      // Encontrar materias vinculadas a esta clase
      const materiasList = materias.filter(m =>
        Number(m.claseId) === Number(c.id) ||
        (m.claseNombre && m.claseNombre.trim().toLowerCase() === c.nombre.trim().toLowerCase()) ||
        Number(c.materiaId) === Number(m.id) ||
        (Array.isArray(c.materiaIds) && c.materiaIds.includes(m.id)) ||
        (m.clases && (m.clases as any[]).some(mc => Number(mc.id) === Number(c.id) || mc.nombre === c.nombre))
      );

      // Determinar materia a la que pertenece (clase.materiaNombre)
      let resolvedMateriaNombre = c.materiaNombre;
      if (!resolvedMateriaNombre || resolvedMateriaNombre.trim() === '') {
        const mat = materias.find(m =>
          Number(m.id) === Number(c.materiaId) ||
          (Array.isArray(c.materiaIds) && c.materiaIds.includes(m.id)) ||
          Number(m.claseId) === Number(c.id)
        );
        resolvedMateriaNombre = mat?.nombre || (materiasList[0]?.nombre) || 'Sin materia asignada';
      }

      // Determinar docente responsable (clase.docenteNombre)
      let resolvedDocenteNombre = c.docenteNombre;
      if (!resolvedDocenteNombre || resolvedDocenteNombre.trim() === '') {
        if (c.docenteId && this.docentesMap.has(c.docenteId)) {
          resolvedDocenteNombre = this.docentesMap.get(c.docenteId);
        } else {
          const mat = materias.find(m => Number(m.id) === Number(c.materiaId) || Number(m.claseId) === Number(c.id));
          resolvedDocenteNombre = mat?.docente || (mat as any)?.docenteNombre || (materiasList[0]?.docente) || 'Docente no asignado';
        }
      }

      // Calcular estudiantes únicos
      const estudianteSet = new Set<number>(c.estudianteIds || []);
      materiasList.forEach(m => {
        m.estudiantes?.forEach(e => estudianteSet.add(e.id));
      });

      return {
        ...c,
        materiaNombre: resolvedMateriaNombre,
        docenteNombre: resolvedDocenteNombre,
        materiasList,
        totalEstudiantes: estudianteSet.size || (c.estudianteIds?.length ?? 0)
      };
    });
  }

  get clasesFiltradas(): ClaseConMaterias[] {
    return this.clasesConMaterias.filter(c => {
      const matchTexto = !this.filtroTexto.trim() ||
        c.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (c.materiaNombre && c.materiaNombre.toLowerCase().includes(this.filtroTexto.toLowerCase())) ||
        (c.docenteNombre && c.docenteNombre.toLowerCase().includes(this.filtroTexto.toLowerCase())) ||
        c.materiasList.some(m => m.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) || m.codigo.toLowerCase().includes(this.filtroTexto.toLowerCase())) ||
        (c.carrera && c.carrera.toLowerCase().includes(this.filtroTexto.toLowerCase()));

      const matchSemestre = this.filtroSemestre === 'todos' || c.semestre === this.filtroSemestre;

      return matchTexto && matchSemestre;
    });
  }

  get semestresDisponibles(): string[] {
    const list = this.clasesConMaterias.map(c => c.semestre).filter((s): s is string => !!s);
    return Array.from(new Set(['2026-2', '2026-1', ...list]));
  }

  /**
   * Conectado a DELETE /api/Clase/{id}
   */
  eliminarClase(id: number, event: Event) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Eliminar clase?',
      text: `Esta acción eliminará la clase #${id} de la base de datos (DELETE /api/Clase/${id}).`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.claseService.deleteClase(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Clase eliminada',
              text: 'La clase ha sido eliminada exitosamente.',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargarDatos();
          },
          error: (err) => {
            console.error('Error al eliminar clase:', err);
            const msg = err?.error?.message || err?.error?.title || err?.message || 'Error al eliminar la clase del backend.';
            Swal.fire({
              icon: 'error',
              title: 'No se pudo eliminar',
              text: msg,
              confirmButtonColor: '#4f46e5'
            });
          }
        });
      }
    });
  }

  asignarAyudante(claseId: number) {
    const email = (this.ayudanteEmailPorClase[claseId] || '').trim();
    if (!email) {
      alert('Ingresa un correo del ayudante para asignarlo a la clase.');
      return;
    }

    this.asignandoAyudanteId = claseId;

    const materiaObjetivo = this.materias.find(m => Number(m.claseId) === Number(claseId) || Number(m.id) === Number(claseId));
    const materiaId = materiaObjetivo ? materiaObjetivo.id : claseId;

    this.materiaService.asignarAyudanteMateria(materiaId, email).subscribe({
      next: (res) => {
        const registros = JSON.parse(localStorage.getItem('sigac_clase_ayudante_asignaciones') || '[]');
        registros.unshift({ claseId, materiaId, ayudanteEmail: email, timestamp: Date.now(), source: res.fallback ? 'local' : 'api' });
        localStorage.setItem('sigac_clase_ayudante_asignaciones', JSON.stringify(registros));
        this.mensajeAsignacion[claseId] = res.mensaje;
        this.ayudanteEmailPorClase[claseId] = '';
        this.asignandoAyudanteId = null;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajeAsignacion[claseId] = 'No se pudo completar la asignación del ayudante.';
        this.asignandoAyudanteId = null;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      complete: () => {
        this.asignandoAyudanteId = null;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }
}
