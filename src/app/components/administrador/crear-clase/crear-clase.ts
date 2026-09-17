import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { ClaseService } from '../../../services/clase.service';
import { MateriaDto, MateriaService } from '../../../services/materia.service';
import { AdminDocenteService } from '../../../services/admin-docente.service';

@Component({
  selector: 'app-crear-clase',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crear-clase.html'
})
export class CrearClaseComponent implements OnInit, OnDestroy {
  materias: MateriaDto[] = [];
  docentes: { id: number; nombre: string; correo?: string }[] = [];
  private subMaterias?: Subscription;
  private subDocentes?: Subscription;

  nuevaClase = {
    nombre: '',
    materiaId: 0,
    docenteId: 0,
    semestre: '2026-2',
    carrera: 'Ingeniería de Software',
    descripcion: ''
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private router: Router,
    private location: Location,
    private claseService: ClaseService,
    private materiaService: MateriaService,
    private adminDocenteService: AdminDocenteService
  ) {}

  goBack(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/clases']);
    }
  }

  ngOnInit() {
    this.subDocentes = this.adminDocenteService.getDocentes().subscribe(list => {
      const safeList = Array.isArray(list) ? list : ((list as any)?.$values || (list as any)?.data || []);
      this.docentes = safeList.map((d: any) => ({
        id: Number(d.id ?? d.M_ID ?? d.docenteId ?? d.personaId ?? 0),
        nombre: `${d.nombre || ''} ${d.apellido || ''}`.trim() || d.username || 'Docente',
        correo: d.correo || d.email || ''
      })).filter((d: any) => d.id > 0);

      const docenteOficial = this.docentes.find(d => (d.correo || '').toLowerCase() === 'docente@uteq.edu.ec');
      if (docenteOficial) {
        this.nuevaClase.docenteId = docenteOficial.id;
      } else if (this.docentes.length > 0 && !this.nuevaClase.docenteId) {
        this.nuevaClase.docenteId = this.docentes[0].id;
      }
    });

    // Cargar materias oficiales desde GET /api/Materia
    this.subMaterias = this.materiaService.getMaterias().subscribe({
      next: (list) => {
        this.materias = Array.isArray(list) ? list : [];
        if (this.materias.length > 0 && !this.nuevaClase.materiaId) {
          this.nuevaClase.materiaId = this.materias[0].id;
        }
      },
      error: (err) => {
        console.error('Error al cargar materias:', err);
        this.materias = [];
      }
    });
  }

  ngOnDestroy() {
    this.subMaterias?.unsubscribe();
    this.subDocentes?.unsubscribe();
  }

  private mostrarAlerta(icon: 'success' | 'error' | 'warning' | 'info', title: string, text: string) {
    Swal.fire({
      icon,
      title,
      text,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#4f46e5',
      timer: icon === 'success' ? 1800 : undefined,
      timerProgressBar: icon === 'success'
    });
  }

  private extraerErrorHttp(err: any): string {
    const serverMessage = err?.error?.message || err?.error?.error || err?.error?.title || err?.error?.mensaje;
    if (serverMessage) {
      return String(serverMessage);
    }

    if (err?.status === 401) {
      return 'La sesión ha expirado o el token no es válido. Inicia sesión nuevamente.';
    }
    if (err?.status === 403) {
      return 'No tienes permisos para crear clases en este sistema.';
    }
    if (err?.status === 404) {
      return 'El endpoint de creación de clases no está disponible en el backend.';
    }
    if (err?.status === 0) {
      return 'No se pudo conectar con el backend. Verifica que el servidor esté corriendo.';
    }

    return 'Hubo un error inesperado al crear la clase. Intenta nuevamente.';
  }

  guardarClase() {
    if (!this.nuevaClase.nombre.trim()) {
      this.errorMessage = 'Por favor ingresa el nombre de la clase o paralelo.';
      return;
    }

    const materiaId = Number(this.nuevaClase.materiaId);
    if (!materiaId || materiaId <= 0) {
      this.errorMessage = 'Por favor selecciona la materia a la que pertenecerá esta clase.';
      return;
    }

    const docenteId = Number(this.nuevaClase.docenteId);
    if (!docenteId || docenteId <= 0) {
      this.errorMessage = 'Por favor selecciona un docente para esta clase.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = {
      nombre: this.nuevaClase.nombre.trim(),
      materiaId: materiaId,
      docenteId: docenteId,
      semestre: this.nuevaClase.semestre || '2026-2',
      carrera: this.nuevaClase.carrera || 'Ingeniería de Software',
      descripcion: this.nuevaClase.descripcion?.trim() || ''
    };

    this.claseService.createClase(payload).subscribe({
      next: (creada) => {
        this.isLoading = false;
        this.successMessage = `¡Clase "${creada.nombre}" creada y registrada exitosamente!`;
        this.mostrarAlerta('success', 'Clase creada', `Se registró la clase "${creada.nombre}" correctamente.`);

        setTimeout(() => {
          this.router.navigate(['/admin/clases']);
        }, 1200);
      },
      error: (err) => {
        this.isLoading = false;
        const detalle = this.extraerErrorHttp(err);
        this.errorMessage = detalle;
        this.mostrarAlerta('error', 'No se pudo crear la clase', detalle);
      }
    });
  }
}
