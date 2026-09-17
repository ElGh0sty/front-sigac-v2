import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  MateriaService,
  MateriaDto,
  RecursoDto,
  ActividadDto,
  RegistroAsistenciaDto,
} from '../../../services/materia.service';
import { DocumentosDescargaService } from '../../../services/documentos-descarga.service';
import {
  EstudianteService,
  EvaluacionDiagnosticaEstudianteDto,
  PreguntaCuestionarioDiagnosticoDto,
  RespuestaCuestionarioDiagnosticoDto,
  ActualizacionCronogramaEstudianteDto,
  CronogramaActividadEstudianteDto,
  MateriaInscritaEstudianteDto,
} from '../../../services/estudiante.service';

@Component({
  selector: 'app-materia-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './materia-detalle.html',
})
export class MateriaDetalleComponent implements OnInit, OnDestroy {
  materiaId: number = 0;
  indiceTemaActual: number = 0;
  tabActual: 'recursos' | 'actividades' | 'diagnostico' | 'cronograma' | 'asistencia' = 'recursos';

  rol: string = 'Estudiante';
  esAyudante: boolean = false;
  esDocente: boolean = false;
  esAdmin: boolean = false;
  canEdit: boolean = false;

  materia: MateriaDto = {
    id: 0,
    nombre: 'Cargando materia...',
    codigo: '...',
    descripcion: '',
    docente: 'Cargando docente...',
    creditos: 4,
    semana: 1,
    totalSemanas: 16,
    estudiantes: [],
  };

  temas: string[] = ['Tema 1: Fundamentos y Conceptos Iniciales'];
  recursosDeMateria: RecursoDto[] = [];
  actividadesDeMateria: ActividadDto[] = [];
  registrosAsistencia: RegistroAsistenciaDto[] = [];

  // =========================================================
  // RF-004 - EVALUACIÓN DIAGNÓSTICA DEL ESTUDIANTE
  // =========================================================
  evaluacionesDiagnosticas: EvaluacionDiagnosticaEstudianteDto[] = [];
  evaluacionDiagnosticaSeleccionada: EvaluacionDiagnosticaEstudianteDto | null = null;
  preguntasDiagnostico: PreguntaCuestionarioDiagnosticoDto[] = [];
  respuestasDiagnostico: Record<number, string> = {};
  archivoDiagnostico: File | null = null;

  cargandoDiagnosticos = false;
  guardandoDiagnostico = false;
  modalDiagnostico = false;
  errorDiagnostico = '';
  mensajeDiagnostico = '';

  // =========================================================
  // RF-005 - REPROGRAMACIÓN DEL CRONOGRAMA (ESTUDIANTE)
  // =========================================================
  cronogramaCatedra: CronogramaActividadEstudianteDto[] = [];
  actualizacionesCronograma: ActualizacionCronogramaEstudianteDto[] = [];
  actualizacionCronogramaSeleccionada: ActualizacionCronogramaEstudianteDto | null = null;
  cargandoCronograma = false;
  errorCronograma = '';
  catedraIdActual = 0;
  contenidoAcademicoId = 0;
  cargandoContenidoMateria = false;
  cargandoActualizacionesCronograma = false;
  errorActualizacionesCronograma = '';
  modalActualizacionCronograma = false;
  private actualizacionCronogramaSolicitadaId = 0;
  private actualizacionesCronogramaDisponibles: ActualizacionCronogramaEstudianteDto[] = [];
  private todasActualizacionesCronograma: ActualizacionCronogramaEstudianteDto[] = [];
  private diagnosticosDisponibles: EvaluacionDiagnosticaEstudianteDto[] = [];
  private materiasInscritasCache: MateriaInscritaEstudianteDto[] = [];
  private catedraContenidoCargada = 0;
  private consultaMateriasTerminada = false;
  private consultaInscripcionesTerminada = false;
  resolviendoMateria = false;

  showAddRecurso = false;
  showAddActividad = false;
  showAddClase = false;
  showAddTema = false;

  newTemaNombre = '';
  newClaseTema = '';

  nuevoRecurso = {
    nombre: '',
    tipo: 'PDF',
    esencial: false,
    url: 'https://ejemplo.edu/recurso.pdf',
    descripcion: '',
    temaNombre: '',
    linksString: '',
  };

  archivoRecurso: {
    nombre: string;
    tamanoKb: number;
    dataUrl: string;
    storageKey?: string;
  } | null = null;

  nuevaActividad = {
    nombre: '',
    tipo: 'Taller',
    fechaEntrega: '',
    descripcion: '',
  };

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private materiaService: MateriaService,
    private descargaService: DocumentosDescargaService,
    private estudianteService: EstudianteService,
  ) {}

  ngOnInit() {
    this.detectarRol();

    this.subs.push(
      this.route.queryParamMap.subscribe((params) => {
        this.actualizacionCronogramaSolicitadaId = Number(
          params.get('actualizacionCronograma') || 0,
        );
        this.abrirActualizacionSolicitadaSiCorresponde();
      }),
    );

    this.subs.push(
      this.materiaService.recursos$.subscribe((allRecursos) => {
        const idContenido = this.idContenidoMateria;

        this.recursosDeMateria = allRecursos.filter(
          (r) => Number(r.materiaId) === Number(idContenido),
        );
      }),
    );

    this.subs.push(
      this.materiaService.actividades$.subscribe((allActs) => {
        const idContenido = this.idContenidoMateria;

        this.actividadesDeMateria = allActs.filter(
          (a) => Number(a.materiaId) === Number(idContenido),
        );
      }),
    );

    this.subs.push(
      this.materiaService.asistencias$.subscribe((allAsist) => {
        const idContenido = this.idContenidoMateria;

        this.registrosAsistencia = allAsist.filter(
          (a) =>
            Number(a.materiaId) === Number(idContenido) ||
            Number(a.materiaId) === Number(this.materiaId),
        );
      }),
    );

    this.subs.push(
      this.materiaService.materias$.subscribe((materias) => {
        if (!this.materiaId) {
          return;
        }

        const lista = Array.isArray(materias) ? materias : [];

        const encontrada =
          lista.find((m) => Number(m.id) === Number(this.materiaId)) ||
          lista.find((m) => Number(m.catedraId || 0) === Number(this.materiaId)) ||
          (this.catedraIdActual
            ? lista.find((m) => Number(m.catedraId || 0) === Number(this.catedraIdActual))
            : undefined);

        if (encontrada) {
          this.aplicarMateriaReal(encontrada);

          const catedraId = Number(encontrada.catedraId || 0);

          if (catedraId > 0) {
            this.establecerCatedraYCargar(catedraId);
          } else {
            this.intentarResolverConMateriaDisponible();
          }
        }
      }),
    );

    this.subs.push(
      this.route.params.subscribe((params) => {
        this.materiaId = params['id'] ? Number(params['id']) : 0;
        this.prepararMateriaYCargarContenido();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }

  detectarRol() {
    if (typeof window !== 'undefined') {
      this.rol = localStorage.getItem('rol') || 'Estudiante';
      this.esAyudante = this.rol === 'Ayudante';
      this.esDocente = this.rol === 'Docente';
      this.esAdmin = this.rol === 'Administrador' || this.rol === 'Admin';
      this.canEdit = this.esAyudante || this.esDocente || this.esAdmin;
    }
  }

  get idContenidoMateria(): number {
    return this.contenidoAcademicoId || this.catedraIdActual || this.materiaId;
  }

  private crearMateriaTemporal(): MateriaDto {
    return {
      id: this.materiaId,
      nombre: 'Cargando materia...',
      codigo: '...',
      descripcion: '',
      docente: 'Cargando docente...',
      creditos: 4,
      semana: 1,
      totalSemanas: 16,
      estudiantes: [],
    };
  }

  private esMateriaTemporal(): boolean {
    return !this.materia || this.materia.nombre === 'Cargando materia...' || this.materia.id === 0;
  }

  private prepararMateriaYCargarContenido(): void {
    this.recursosDeMateria = [];
    this.actividadesDeMateria = [];
    this.evaluacionesDiagnosticas = [];
    this.cronogramaCatedra = [];
    this.actualizacionesCronograma = [];
    this.actualizacionesCronogramaDisponibles = [];
    this.todasActualizacionesCronograma = [];
    this.diagnosticosDisponibles = [];
    this.materiasInscritasCache = [];
    this.registrosAsistencia = [];

    this.catedraIdActual = 0;
    this.contenidoAcademicoId = 0;
    this.catedraContenidoCargada = 0;
    this.consultaMateriasTerminada = false;
    this.consultaInscripcionesTerminada = this.rol !== 'Estudiante';

    this.errorDiagnostico = '';
    this.errorCronograma = '';
    this.errorActualizacionesCronograma = '';

    this.resolviendoMateria = true;
    this.cargandoContenidoMateria = true;
    this.cargandoDiagnosticos = this.rol === 'Estudiante';
    this.cargandoCronograma = this.rol === 'Estudiante';
    this.cargandoActualizacionesCronograma = this.rol === 'Estudiante';

    this.materia = this.crearMateriaTemporal();

    const materiasCache = this.materiaService.getMateriasSnapshot();

    const materiaCache =
      this.materiaService.getMateriaById(this.materiaId) ||
      materiasCache.find((m) => Number(m.catedraId || 0) === Number(this.materiaId));

    if (materiaCache) {
      this.aplicarMateriaReal(materiaCache);

      const catedraCache = Number(materiaCache.catedraId || 0);

      if (catedraCache > 0) {
        this.establecerCatedraYCargar(catedraCache);
      }
    }

    if (this.rol === 'Estudiante') {
      /*
       * Estas consultas se lanzan al entrar a la materia.
       * No dependen de que el estudiante pulse una pestaña.
       */
      this.precargarDatosEstudiante();

      this.estudianteService.getMisMateriasInscritas().subscribe({
        next: (materiasInscritas) => {
          this.materiasInscritasCache = Array.isArray(materiasInscritas) ? materiasInscritas : [];

          this.consultaInscripcionesTerminada = true;

          const porRuta = this.materiasInscritasCache.find(
            (m) =>
              Number(m.catedraId || m.id) === Number(this.materiaId) ||
              Number(m.id) === Number(this.materiaId),
          );

          if (porRuta) {
            this.aplicarMateriaInscrita(porRuta);
            this.establecerCatedraYCargar(Number(porRuta.catedraId || porRuta.id));
          } else {
            this.intentarResolverConMateriaDisponible();
          }

          this.verificarFallbackResolucion();
        },
        error: () => {
          this.consultaInscripcionesTerminada = true;
          this.verificarFallbackResolucion();
        },
      });
    }

    /*
     * El catálogo de materias se actualiza en paralelo.
     * Así resolvemos correctamente MateriaId -> CatedraId sin bloquear
     * diagnósticos, notificaciones u otras secciones.
     */
    this.materiaService.refreshMaterias().subscribe({
      next: (materias) => {
        this.consultaMateriasTerminada = true;

        const lista = Array.isArray(materias) ? materias : [];

        const materiaReal =
          lista.find((m) => Number(m.id) === Number(this.materiaId)) ||
          lista.find((m) => Number(m.catedraId || 0) === Number(this.materiaId)) ||
          (this.catedraIdActual
            ? lista.find((m) => Number(m.catedraId || 0) === Number(this.catedraIdActual))
            : undefined);

        if (materiaReal) {
          this.aplicarMateriaReal(materiaReal);

          const catedraId = Number(materiaReal.catedraId || 0);

          if (catedraId > 0) {
            this.establecerCatedraYCargar(catedraId);
          } else {
            this.intentarResolverConMateriaDisponible();
          }
        }

        this.verificarFallbackResolucion();
      },
      error: () => {
        this.consultaMateriasTerminada = true;
        this.verificarFallbackResolucion();
      },
    });
  }

  private precargarDatosEstudiante(): void {
    this.estudianteService.getEvaluacionesDiagnosticas().subscribe({
      next: (diagnosticos) => {
        this.diagnosticosDisponibles = Array.isArray(diagnosticos) ? diagnosticos : [];

        this.evaluacionesDiagnosticas = this.filtrarDiagnosticosDeMateria(
          this.diagnosticosDisponibles,
        );

        this.cargandoDiagnosticos = false;
      },
      error: (err) => {
        this.diagnosticosDisponibles = [];
        this.evaluacionesDiagnosticas = [];
        this.cargandoDiagnosticos = false;
        this.errorDiagnostico =
          err?.error?.message ||
          'No se pudieron cargar las evaluaciones diagnósticas de esta materia.';
      },
    });

    this.estudianteService.getActualizacionesCronograma().subscribe({
      next: (actualizaciones) => {
        this.todasActualizacionesCronograma = Array.isArray(actualizaciones) ? actualizaciones : [];

        this.actualizarActualizacionesCronogramaFiltradas();
        this.cargandoActualizacionesCronograma = false;
      },
      error: (err) => {
        this.todasActualizacionesCronograma = [];
        this.actualizacionesCronograma = [];
        this.actualizacionesCronogramaDisponibles = [];
        this.cargandoActualizacionesCronograma = false;
        this.errorActualizacionesCronograma =
          err?.error?.message || 'No se pudieron cargar las actualizaciones del cronograma.';
      },
    });
  }

  private aplicarMateriaInscrita(inscrita: MateriaInscritaEstudianteDto): void {
    if (!inscrita) {
      return;
    }

    const catedraId = Number(inscrita.catedraId || inscrita.id);

    this.materia = {
      ...this.materia,
      id: this.materiaId || Number(inscrita.materiaId || inscrita.id),
      catedraId,
      nombre: inscrita.nombre || this.materia.nombre,
      codigo: inscrita.codigo || `CAT-${catedraId.toString().padStart(3, '0')}`,
      descripcion: inscrita.descripcion || this.materia.descripcion || '',
      docente:
        inscrita.docente || inscrita.nombreDocente || this.materia.docente || 'Docente por asignar',
      semestre: inscrita.semestre || this.materia.semestre,
      estudiantes: this.materia.estudiantes || [],
    };
  }

  private aplicarMateriaReal(materia: MateriaDto): void {
    if (!materia) {
      return;
    }

    this.materia = {
      ...this.materia,
      ...materia,
      docente:
        materia.docente || materia.docenteNombre || this.materia.docente || 'Docente por asignar',
      estudiantes: materia.estudiantes || this.materia.estudiantes || [],
    };
  }

  private intentarResolverConMateriaDisponible(): void {
    if (this.catedraIdActual > 0 || this.esMateriaTemporal()) {
      return;
    }

    const catedraDirecta = Number(this.materia?.catedraId || 0);

    if (catedraDirecta > 0) {
      this.establecerCatedraYCargar(catedraDirecta);
      return;
    }

    const nombreMateria = this.normalizarTextoCronograma(this.materia?.nombre || '');

    if (!nombreMateria) {
      return;
    }

    const porNombre = this.materiasInscritasCache.find(
      (m) => this.normalizarTextoCronograma(m.nombre || '') === nombreMateria,
    );

    if (porNombre) {
      this.establecerCatedraYCargar(Number(porNombre.catedraId || porNombre.id));
    }
  }

  private establecerCatedraYCargar(catedraId: number): void {
    const id = Number(catedraId);

    if (!id || id <= 0) {
      return;
    }

    this.catedraIdActual = id;
    this.contenidoAcademicoId = id;
    this.resolviendoMateria = false;

    this.registrosAsistencia = this.materiaService
      .getAsistenciasSnapshot()
      .filter((a) => Number(a.materiaId) === id || Number(a.materiaId) === Number(this.materiaId));

    if (this.diagnosticosDisponibles.length > 0) {
      this.evaluacionesDiagnosticas = this.filtrarDiagnosticosDeMateria(
        this.diagnosticosDisponibles,
      );
    }

    this.actualizarActualizacionesCronogramaFiltradas();

    if (this.catedraContenidoCargada !== id) {
      this.catedraContenidoCargada = id;
      this.cargarContenidoMateriaEnParalelo();
    }
  }

  private verificarFallbackResolucion(): void {
    if (this.catedraIdActual > 0) {
      return;
    }

    if (!this.consultaMateriasTerminada || !this.consultaInscripcionesTerminada) {
      return;
    }

    if (this.esMateriaTemporal()) {
      this.materia = {
        id: this.materiaId,
        catedraId: this.materiaId,
        nombre: `Materia #${this.materiaId}`,
        codigo: `MAT-${this.materiaId}`,
        descripcion: '',
        docente: 'Docente por asignar',
        creditos: 4,
        semana: 1,
        totalSemanas: 16,
        estudiantes: [],
      };
    }

    this.establecerCatedraYCargar(this.materiaId);
  }

  private actualizarActualizacionesCronogramaFiltradas(): void {
    const catedraId = Number(this.catedraIdActual || 0);

    if (!catedraId) {
      this.actualizacionesCronograma = [];
      this.actualizacionesCronogramaDisponibles = [];
      return;
    }

    this.actualizacionesCronogramaDisponibles = this.todasActualizacionesCronograma.filter(
      (actualizacion) => Number(actualizacion.catedraId) === Number(catedraId),
    );

    this.actualizacionesCronograma = [...this.actualizacionesCronogramaDisponibles];

    this.abrirActualizacionSolicitadaSiCorresponde();
  }

  private cargarContenidoMateriaEnParalelo(): void {
    const idContenido = Number(this.idContenidoMateria);

    if (!idContenido) {
      this.cargandoContenidoMateria = false;
      return;
    }

    this.cargandoContenidoMateria = true;

    let pendientes = 3;

    const finalizarPeticion = () => {
      pendientes--;

      if (pendientes <= 0) {
        this.cargandoContenidoMateria = false;
      }
    };

    const recursos$ =
      this.rol === 'Estudiante'
        ? this.materiaService.getRecursosConEstado(idContenido)
        : this.materiaService.getRecursosByMateria(idContenido);

    recursos$.subscribe({
      next: (recursos) => {
        this.recursosDeMateria = Array.isArray(recursos) ? recursos : [];
      },
      error: () => {
        this.recursosDeMateria = [];
        finalizarPeticion();
      },
      complete: finalizarPeticion,
    });

    this.materiaService.getActividadesByMateria(idContenido).subscribe({
      next: (actividades) => {
        this.actividadesDeMateria = Array.isArray(actividades) ? actividades : [];
      },
      error: () => {
        this.actividadesDeMateria = [];
        finalizarPeticion();
      },
      complete: finalizarPeticion,
    });

    this.materiaService.cargarTemasByMateria(idContenido).subscribe({
      next: (temas) => {
        this.temas = Array.isArray(temas) ? temas : [];

        if (this.indiceTemaActual >= this.temas.length) {
          this.indiceTemaActual = 0;
        }

        this.nuevoRecurso.temaNombre = this.temaActualNombre;
      },
      error: () => {
        this.temas = this.materiaService.getTemasByMateria(idContenido);
        this.nuevoRecurso.temaNombre = this.temaActualNombre;
        finalizarPeticion();
      },
      complete: finalizarPeticion,
    });

    if (this.rol === 'Estudiante') {
      this.cargarCronogramaCatedra();
    }
  }

  get temaActualNombre(): string {
    return this.temas[this.indiceTemaActual] || 'Tema Principal';
  }

  get recursosDelTemaActual(): RecursoDto[] {
    const temaActual = this.temaActualNombre;

    return this.recursosDeMateria.filter((r) => !r.temaNombre || r.temaNombre === temaActual);
  }

  irAlTemaAnterior() {
    if (this.indiceTemaActual > 0) {
      this.indiceTemaActual--;
      this.nuevoRecurso.temaNombre = this.temaActualNombre;
    }
  }

  irAlTemaSiguiente() {
    if (this.indiceTemaActual < this.temas.length - 1) {
      this.indiceTemaActual++;
      this.nuevoRecurso.temaNombre = this.temaActualNombre;
    }
  }

  seleccionarTema(index: number) {
    this.indiceTemaActual = index;

    this.nuevoRecurso.temaNombre = this.temaActualNombre;
  }

  agregarNuevoTema() {
    if (!this.newTemaNombre.trim()) {
      return;
    }

    this.temas = this.materiaService.addTemaToMateria(this.idContenidoMateria, this.newTemaNombre);

    this.indiceTemaActual = this.temas.length - 1;

    this.nuevoRecurso.temaNombre = this.temaActualNombre;

    this.newTemaNombre = '';
    this.showAddTema = false;
  }

  toggleVisto(id?: number) {
    if (!id) {
      return;
    }

    this.materiaService.marcarRecursoComoVisto(id).subscribe();
  }

  toggleEsencial(id?: number) {
    if (!id) {
      return;
    }

    this.materiaService.toggleRecursoEsencial(id);
  }

  eliminarRecurso(id?: number) {
    if (!id) {
      return;
    }

    if (confirm('Â¿EstÃ¡s seguro de eliminar este recurso educativo?')) {
      this.materiaService.deleteRecurso(id);
    }
  }

  agregarRecurso() {
    if (!this.nuevoRecurso.nombre.trim()) {
      return;
    }

    const rawLinks = (this.nuevoRecurso as any).linksString || '';

    const links = rawLinks
      .split(/\r?\n|,/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    this.materiaService
      .addRecurso(this.idContenidoMateria, {
        titulo: this.nuevoRecurso.nombre,

        descripcion: this.nuevoRecurso.descripcion || `Recurso de ${this.nuevoRecurso.tipo}`,

        url: this.nuevoRecurso.url || 'https://ejemplo.edu/recurso.pdf',

        tipo: this.nuevoRecurso.tipo,

        esEsencial: this.nuevoRecurso.esencial,

        materiaId: this.idContenidoMateria,

        temaNombre: this.nuevoRecurso.temaNombre || this.temaActualNombre,

        nombreArchivo: this.archivoRecurso?.nombre,

        archivoDataUrl: this.archivoRecurso?.dataUrl,

        tamanoArchivoKb: this.archivoRecurso?.tamanoKb,

        links,
      })
      .subscribe(() => {
        this.nuevoRecurso = {
          nombre: '',
          tipo: 'PDF',
          esencial: false,
          url: 'https://ejemplo.edu/recurso.pdf',
          descripcion: '',
          temaNombre: this.temaActualNombre,
          linksString: '',
        } as any;

        this.archivoRecurso = null;
        this.showAddRecurso = false;
        this.materiaService.getRecursosByMateria(this.idContenidoMateria).subscribe();
      });
  }

  onArchivoRecursoChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    const reader = new FileReader();

    reader.onload = () => {
      this.archivoRecurso = {
        nombre: file.name,
        tamanoKb: Math.round(file.size / 1024),
        dataUrl: reader.result as string,
      };

      if (!this.nuevoRecurso.nombre.trim()) {
        this.nuevoRecurso.nombre = file.name.replace(/\.[^/.]+$/, '');
      }
    };

    reader.readAsDataURL(file);

    try {
      this.materiaService.uploadRecurso(this.idContenidoMateria, file).subscribe({
        next: (res) => {
          if (res?.url) {
            this.nuevoRecurso.url = res.url;
          }

          if (res?.key && this.archivoRecurso) {
            (this.archivoRecurso as any).storageKey = res.key;
          }
        },
        error: () => {
          // Mantener archivo local.
        },
      });
    } catch {
      // No hacer nada.
    }
  }

  quitarArchivoRecurso(): void {
    this.archivoRecurso = null;
  }

  agregarActividad() {
    if (!this.nuevaActividad.nombre.trim() || !this.nuevaActividad.fechaEntrega) {
      return;
    }

    this.materiaService
      .addActividad(this.idContenidoMateria, {
        titulo: this.nuevaActividad.nombre,

        descripcion: this.nuevaActividad.descripcion || 'Sin descripciÃ³n',

        fechaEntrega: this.nuevaActividad.fechaEntrega,

        tipo: this.nuevaActividad.tipo,

        materiaId: this.idContenidoMateria,
      })
      .subscribe(() => {
        this.nuevaActividad = {
          nombre: '',
          tipo: 'Taller',
          fechaEntrega: '',
          descripcion: '',
        };

        this.showAddActividad = false;
        this.materiaService.getActividadesByMateria(this.idContenidoMateria).subscribe();
      });
  }

  marcarActividadEntregada(actividadId: number) {
    this.materiaService.updateActividadEstado(actividadId, 'entregada');
  }

  calificarActividad(actividadId?: number) {
    if (!actividadId) {
      return;
    }

    const rutaBase = this.esAyudante ? '/ayudante' : '/docente';

    this.router.navigate([`${rutaBase}/actividades`, actividadId, 'calificar']);
  }

  eliminarActividad(actividadId?: number) {
    if (!actividadId) {
      return;
    }

    if (confirm('Â¿Deseas eliminar esta actividad del curso?')) {
      this.materiaService.deleteActividad(actividadId);
    }
  }

  agregarClase() {
    if (!this.newClaseTema.trim()) {
      return;
    }

    this.materiaService.addRegistroAsistencia(
      this.materiaId,
      this.newClaseTema,
      this.materia.estudiantes,
    );

    this.newClaseTema = '';
    this.showAddClase = false;
  }

  // =========================================================
  // RF-005 - REPROGRAMACIÓN DEL CRONOGRAMA
  // =========================================================

  cargarCronogramaCatedra(): void {
    if (this.rol !== 'Estudiante') {
      this.cronogramaCatedra = [];
      this.cargandoCronograma = false;
      return;
    }

    const catedraId = Number(this.catedraIdActual || this.idContenidoMateria);

    if (!catedraId) {
      this.cronogramaCatedra = [];
      this.cargandoCronograma = false;
      this.errorCronograma = 'No se pudo identificar la cátedra de esta materia.';
      return;
    }

    this.cargandoCronograma = true;
    this.errorCronograma = '';

    this.estudianteService.getCronogramaCatedra(catedraId).subscribe({
      next: (cronograma) => {
        this.cronogramaCatedra = Array.isArray(cronograma) ? cronograma : [];
        this.cargandoCronograma = false;
      },
      error: (err) => {
        this.cronogramaCatedra = [];
        this.cargandoCronograma = false;
        this.errorCronograma =
          err?.error?.message || 'No se pudo cargar el cronograma de esta cátedra.';
      },
    });
  }

  getEstadoCronograma(item: CronogramaActividadEstudianteDto): 'Programada' | 'Realizada' {
    return item.fechaReal ? 'Realizada' : 'Programada';
  }

  getUltimoCambioCronograma(
    item: CronogramaActividadEstudianteDto,
  ): ActualizacionCronogramaEstudianteDto | null {
    return (
      this.actualizacionesCronogramaDisponibles.find(
        (cambio) => Number(cambio.cronogramaActividadId) === Number(item.id),
      ) || null
    );
  }

  tieneCambioCronograma(item: CronogramaActividadEstudianteDto): boolean {
    return this.getUltimoCambioCronograma(item) !== null;
  }

  abrirUltimoCambioCronograma(item: CronogramaActividadEstudianteDto): void {
    const cambio = this.getUltimoCambioCronograma(item);

    if (!cambio) {
      return;
    }

    this.actualizacionCronogramaSeleccionada = cambio;
    this.modalActualizacionCronograma = true;
  }

  formatearFechaCronograma(fecha?: string | null): string {
    if (!fecha) {
      return 'Sin fecha';
    }

    const parteFecha = fecha.split('T')[0];
    const partes = parteFecha.split('-');

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return fecha;
  }

  cargarActualizacionesCronograma(): void {
    if (this.rol !== 'Estudiante' || this.cargandoActualizacionesCronograma) {
      return;
    }

    this.cargandoActualizacionesCronograma = true;
    this.errorActualizacionesCronograma = '';

    this.estudianteService.getActualizacionesCronograma().subscribe({
      next: (actualizaciones) => {
        this.todasActualizacionesCronograma = Array.isArray(actualizaciones) ? actualizaciones : [];

        this.actualizarActualizacionesCronogramaFiltradas();
        this.cargandoActualizacionesCronograma = false;
      },
      error: (err) => {
        this.cargandoActualizacionesCronograma = false;
        this.actualizacionesCronograma = [];
        this.actualizacionesCronogramaDisponibles = [];
        this.errorActualizacionesCronograma =
          err?.error?.message || 'No se pudieron cargar las actualizaciones del cronograma.';
      },
    });
  }

  private resolverCatedraIdActual(materiasInscritas: MateriaInscritaEstudianteDto[]): number {
    const catedraDeMateria = Number(this.materia?.catedraId || 0);
    if (catedraDeMateria > 0) {
      return catedraDeMateria;
    }

    const porId = materiasInscritas.find(
      (m) => Number(m.catedraId || m.id) === Number(this.materiaId),
    );

    if (porId) {
      return Number(porId.catedraId || porId.id);
    }

    const nombreMateria = this.normalizarTextoCronograma(this.materia?.nombre || '');

    if (!nombreMateria) {
      return 0;
    }

    const porNombre = materiasInscritas.find(
      (m) => this.normalizarTextoCronograma(m.nombre || '') === nombreMateria,
    );

    return porNombre ? Number(porNombre.catedraId || porNombre.id) : 0;
  }

  private normalizarTextoCronograma(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private abrirActualizacionSolicitadaSiCorresponde(): void {
    if (!this.actualizacionCronogramaSolicitadaId) {
      return;
    }

    const actualizacion = this.actualizacionesCronogramaDisponibles.find(
      (item) => Number(item.id) === Number(this.actualizacionCronogramaSolicitadaId),
    );

    if (!actualizacion) {
      return;
    }

    this.actualizacionCronogramaSeleccionada = actualizacion;

    this.modalActualizacionCronograma = true;
  }

  abrirDetalleActualizacionCronograma(actualizacion?: ActualizacionCronogramaEstudianteDto): void {
    const seleccionada = actualizacion || this.actualizacionesCronogramaDisponibles[0];

    if (!seleccionada) {
      return;
    }

    this.actualizacionCronogramaSeleccionada = seleccionada;

    this.modalActualizacionCronograma = true;
  }

  cerrarDetalleActualizacionCronograma(): void {
    this.modalActualizacionCronograma = false;

    this.actualizacionCronogramaSeleccionada = null;

    if (this.actualizacionCronogramaSolicitadaId) {
      this.actualizacionCronogramaSolicitadaId = 0;

      this.router.navigate([], {
        relativeTo: this.route,

        queryParams: {
          actualizacionCronograma: null,
        },

        queryParamsHandling: 'merge',

        replaceUrl: true,
      });
    }
  }

  // =========================================================
  // RF-004 - EVALUACIÓN DIAGNÓSTICA DEL ESTUDIANTE
  // =========================================================

  cargarEvaluacionesDiagnosticas(): void {
    if (this.rol !== 'Estudiante') {
      this.evaluacionesDiagnosticas = [];

      this.cargandoDiagnosticos = false;

      return;
    }

    if (this.cargandoDiagnosticos) {
      return;
    }

    this.cargandoDiagnosticos = true;

    this.errorDiagnostico = '';

    this.mensajeDiagnostico = '';

    this.estudianteService.getEvaluacionesDiagnosticas().subscribe({
      next: (evaluaciones) => {
        this.diagnosticosDisponibles = Array.isArray(evaluaciones) ? evaluaciones : [];

        this.evaluacionesDiagnosticas = this.filtrarDiagnosticosDeMateria(
          this.diagnosticosDisponibles,
        );

        this.cargandoDiagnosticos = false;
      },

      error: (err) => {
        this.cargandoDiagnosticos = false;

        this.evaluacionesDiagnosticas = [];

        this.errorDiagnostico =
          err?.error?.message ||
          'No se pudieron cargar las evaluaciones diagnósticas de esta materia.';
      },
    });
  }

  private filtrarDiagnosticosDeMateria(
    evaluaciones: EvaluacionDiagnosticaEstudianteDto[],
  ): EvaluacionDiagnosticaEstudianteDto[] {
    const catedraIdMateria = Number((this.materia as any)?.catedraId) || 0;

    if (catedraIdMateria > 0) {
      const porCatedraId = evaluaciones.filter(
        (evaluacion) => Number(evaluacion.catedraId) === catedraIdMateria,
      );

      if (porCatedraId.length > 0) {
        return porCatedraId;
      }
    }

    const porIdRuta = evaluaciones.filter(
      (evaluacion) => Number(evaluacion.catedraId) === Number(this.materiaId),
    );

    if (porIdRuta.length > 0) {
      return porIdRuta;
    }

    const nombreMateria = this.normalizarTextoDiagnostico(this.materia?.nombre || '');

    if (!nombreMateria) {
      return [];
    }

    return evaluaciones.filter((evaluacion) => {
      const nombreCatedra = this.normalizarTextoDiagnostico(evaluacion.catedra || '');

      return nombreCatedra === nombreMateria;
    });
  }

  private normalizarTextoDiagnostico(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  abrirEvaluacionDiagnostica(evaluacion: EvaluacionDiagnosticaEstudianteDto): void {
    this.evaluacionDiagnosticaSeleccionada = {
      ...evaluacion,
    };

    this.archivoDiagnostico = null;

    this.errorDiagnostico = '';

    this.mensajeDiagnostico = '';

    this.preguntasDiagnostico = this.estudianteService.parsePreguntasCuestionario(
      evaluacion.preguntasCuestionario,
    );

    this.respuestasDiagnostico = {};

    const respuestasGuardadas = this.estudianteService.parseRespuestasCuestionario(
      evaluacion.respuestasCuestionario,
    );

    respuestasGuardadas.forEach((respuesta) => {
      if (respuesta.preguntaId) {
        this.respuestasDiagnostico[respuesta.preguntaId] = respuesta.respuesta;
      }
    });

    this.modalDiagnostico = true;
  }

  cerrarEvaluacionDiagnostica(): void {
    if (this.guardandoDiagnostico) {
      return;
    }

    this.modalDiagnostico = false;

    this.evaluacionDiagnosticaSeleccionada = null;

    this.preguntasDiagnostico = [];

    this.respuestasDiagnostico = {};

    this.archivoDiagnostico = null;

    this.errorDiagnostico = '';

    this.mensajeDiagnostico = '';
  }

  onArchivoDiagnosticoChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.archivoDiagnostico = null;

    this.errorDiagnostico = '';

    this.mensajeDiagnostico = '';

    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];

    const extensionesPermitidas = ['.pdf', '.doc', '.docx', '.zip', '.png', '.jpg', '.jpeg'];

    const nombre = archivo.name.toLowerCase();

    const extensionValida = extensionesPermitidas.some((ext) => nombre.endsWith(ext));

    if (!extensionValida) {
      this.errorDiagnostico = 'Formato no permitido. Usa PDF, Word, ZIP, PNG, JPG o JPEG.';

      input.value = '';

      return;
    }

    this.archivoDiagnostico = archivo;
  }

  quitarArchivoDiagnostico(): void {
    this.archivoDiagnostico = null;

    this.errorDiagnostico = '';
  }

  entregarArchivoDiagnostico(): void {
    const evaluacion = this.evaluacionDiagnosticaSeleccionada;

    if (!evaluacion) {
      return;
    }

    if (evaluacion.tipoEvaluacion !== 'Archivo') {
      this.errorDiagnostico = 'Esta evaluación diagnóstica no es de tipo Archivo.';

      return;
    }

    if (!evaluacion.puedeRealizar) {
      this.errorDiagnostico = 'La evaluación diagnóstica no está disponible para realizarse.';

      return;
    }

    if (!this.archivoDiagnostico) {
      this.errorDiagnostico = 'Selecciona un archivo antes de realizar la entrega.';

      return;
    }

    this.guardandoDiagnostico = true;

    this.errorDiagnostico = '';

    this.mensajeDiagnostico = '';

    this.estudianteService
      .entregarEvaluacionDiagnosticaArchivo(evaluacion.evaluacionId, this.archivoDiagnostico)
      .subscribe({
        next: (respuesta) => {
          this.guardandoDiagnostico = false;

          this.archivoDiagnostico = null;

          this.mensajeDiagnostico =
            respuesta?.message || 'Evaluación diagnóstica entregada correctamente.';

          this.actualizarDiagnosticoDespuesDeEntrega(evaluacion.evaluacionId);
        },

        error: (err) => {
          this.guardandoDiagnostico = false;

          this.errorDiagnostico =
            err?.error?.message || 'No se pudo entregar el archivo de la evaluación diagnóstica.';
        },
      });
  }

  entregarCuestionarioDiagnostico(): void {
    const evaluacion = this.evaluacionDiagnosticaSeleccionada;

    if (!evaluacion) {
      return;
    }

    if (evaluacion.tipoEvaluacion !== 'Cuestionario') {
      this.errorDiagnostico = 'Esta evaluación diagnóstica no es de tipo Cuestionario.';

      return;
    }

    if (!evaluacion.puedeRealizar) {
      this.errorDiagnostico = 'La evaluación diagnóstica no está disponible para realizarse.';

      return;
    }

    const respuestas: RespuestaCuestionarioDiagnosticoDto[] = this.preguntasDiagnostico
      .map((pregunta) => ({
        preguntaId: pregunta.id,

        respuesta: (this.respuestasDiagnostico[pregunta.id] || '').trim(),
      }))
      .filter((respuesta) => !!respuesta.respuesta);

    if (respuestas.length === 0) {
      this.errorDiagnostico = 'Debes responder al menos una pregunta antes de entregar.';

      return;
    }

    this.guardandoDiagnostico = true;

    this.errorDiagnostico = '';

    this.mensajeDiagnostico = '';

    this.estudianteService
      .entregarEvaluacionDiagnosticaCuestionario(evaluacion.evaluacionId, respuestas)
      .subscribe({
        next: (respuesta) => {
          this.guardandoDiagnostico = false;

          this.mensajeDiagnostico =
            respuesta?.message || 'Cuestionario diagnóstico entregado correctamente.';

          this.actualizarDiagnosticoDespuesDeEntrega(evaluacion.evaluacionId);
        },

        error: (err) => {
          this.guardandoDiagnostico = false;

          this.errorDiagnostico =
            err?.error?.message || 'No se pudo entregar el cuestionario diagnóstico.';
        },
      });
  }

  private actualizarDiagnosticoDespuesDeEntrega(evaluacionId: number): void {
    this.estudianteService.getEvaluacionesDiagnosticas().subscribe({
      next: (evaluaciones) => {
        const todas = Array.isArray(evaluaciones) ? evaluaciones : [];

        this.evaluacionesDiagnosticas = this.filtrarDiagnosticosDeMateria(todas);

        const actualizada = this.evaluacionesDiagnosticas.find(
          (evaluacion) => Number(evaluacion.evaluacionId) === Number(evaluacionId),
        );

        if (actualizada) {
          this.evaluacionDiagnosticaSeleccionada = {
            ...actualizada,
          };

          this.preguntasDiagnostico = this.estudianteService.parsePreguntasCuestionario(
            actualizada.preguntasCuestionario,
          );

          this.respuestasDiagnostico = {};

          this.estudianteService
            .parseRespuestasCuestionario(actualizada.respuestasCuestionario)
            .forEach((respuesta) => {
              if (respuesta.preguntaId) {
                this.respuestasDiagnostico[respuesta.preguntaId] = respuesta.respuesta;
              }
            });
        }
      },

      error: () => {
        // La entrega ya quedó guardada.
      },
    });
  }

  abrirArchivoDiagnostico(url?: string | null): void {
    const archivoUrl = this.estudianteService.resolverUrlArchivo(url);

    if (!archivoUrl || typeof window === 'undefined') {
      return;
    }

    window.open(archivoUrl, '_blank', 'noopener,noreferrer');
  }

  formatearFechaHoraDiagnostico(fecha?: string | null): string {
    if (!fecha) {
      return 'Sin fecha';
    }

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return fecha;
    }

    return date.toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  textoDisponibilidadDiagnostico(evaluacion: EvaluacionDiagnosticaEstudianteDto): string {
    switch (evaluacion.disponibilidad) {
      case 'Disponible':
        return 'Disponible';

      case 'NoIniciada':
        return 'Próximamente';

      case 'Cerrada':
        return 'Finalizada';

      case 'SinFechas':
        return 'Sin fechas';

      default:
        return evaluacion.disponibilidad || 'Sin estado';
    }
  }

  textoEstadoEntregaDiagnostico(evaluacion: EvaluacionDiagnosticaEstudianteDto): string {
    if (evaluacion.estadoEntrega === 'Calificado') {
      return 'Calificado';
    }

    if (evaluacion.estadoEntrega === 'Entregado') {
      return 'Entregado';
    }

    return 'Pendiente';
  }

  Math = Math;

  busquedaEstudianteAsistencia: string = '';

  filtroEstadoAsistencia: 'todos' | 'presentes' | 'ausentes' = 'todos';

  getEstudiantesFiltrados(asistentes: any[]): any[] {
    if (!asistentes) {
      return [];
    }

    let list = asistentes;

    if (this.filtroEstadoAsistencia === 'presentes') {
      list = list.filter((a) => a.presente);
    } else if (this.filtroEstadoAsistencia === 'ausentes') {
      list = list.filter((a) => !a.presente);
    }

    if (this.busquedaEstudianteAsistencia.trim()) {
      const q = this.busquedaEstudianteAsistencia.toLowerCase().trim();

      list = list.filter(
        (a) => a.nombre?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q),
      );
    }

    return list;
  }

  marcarTodosAsistencia(registroId: number, presente: boolean) {
    const reg = this.registrosAsistencia.find((r) => r.id === registroId);

    if (!reg || !reg.asistentes) {
      return;
    }

    reg.asistentes.forEach((a, idx) => {
      if (a.presente !== presente) {
        this.materiaService.toggleAsistencia(registroId, idx);
      }
    });
  }

  toggleAsistencia(registroId: number, estudianteIndex: number) {
    this.materiaService.toggleAsistencia(registroId, estudianteIndex);
  }

  contarPresentes(asistentes: any[]): number {
    if (!asistentes) {
      return 0;
    }

    return asistentes.filter((a) => a.presente).length;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return '';
    }

    const d = new Date(fecha);

    return isNaN(d.getTime())
      ? fecha
      : d.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  }

  descargarRecursoDocumento(r: RecursoDto): void {
    if (r.archivoDataUrl) {
      this.descargaService.descargarArchivo(r.nombreArchivo || `${r.titulo}.pdf`, r.archivoDataUrl);

      return;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${r.titulo} - UTEQ</title>
<style>body{font-family:sans-serif;padding:30px;line-height:1.6;color:#1e293b;}</style>
</head>
<body>
  <div style="border-bottom:2px solid #047857;padding-bottom:10px;margin-bottom:20px;">
    <h2 style="color:#065f46;margin:0;">Universidad TÃ©cnica Estatal de Quevedo (UTEQ)</h2>
    <h4 style="color:#475569;margin:4px 0 0 0;">Material de Aprendizaje y CÃ¡tedra Â· SIGAC</h4>
  </div>
  <h3 style="color:#0f172a;">${r.titulo}</h3>
  <p><strong>Tipo:</strong> ${r.tipo} | <strong>Docente / Tutor:</strong> ${r.creadoPor || 'CÃ¡tedra'}</p>
  <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:15px;border-radius:8px;margin:15px 0;">
    <p>${r.descripcion || 'Material de lectura y apoyo para el semestre acadÃ©mico.'}</p>
    <p><strong>Enlace del recurso:</strong> <a href="${r.url}">${r.url}</a></p>
  </div>
  <p style="font-size:11px;color:#64748b;">Descargado desde el aula virtual SIGAC - UTEQ.</p>
</body>
</html>`;

    this.descargaService.descargarArchivo(`${r.titulo.replace(/\s+/g, '_')}_UTEQ.html`, html);
  }

  descargarActividadDocumento(a: ActividadDto): void {
    if (a.archivoDataUrl) {
      this.descargaService.descargarArchivo(a.nombreArchivo || `${a.titulo}.pdf`, a.archivoDataUrl);

      return;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${a.titulo} - UTEQ</title>
<style>body{font-family:sans-serif;padding:30px;line-height:1.6;color:#1e293b;}</style>
</head>
<body>
  <div style="border-bottom:2px solid #047857;padding-bottom:10px;margin-bottom:20px;">
    <h2 style="color:#065f46;margin:0;">Universidad TÃ©cnica Estatal de Quevedo (UTEQ)</h2>
    <h4 style="color:#475569;margin:4px 0 0 0;">GuÃ­a y RÃºbrica de Actividad Evaluativa Â· SIGAC</h4>
  </div>
  <h3 style="color:#0f172a;">${a.titulo}</h3>
  <p><strong>Tipo:</strong> ${a.tipo} | <strong>Fecha de Entrega:</strong> ${a.fechaEntrega}</p>
  <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:15px;border-radius:8px;margin:15px 0;">
    <h4>Instrucciones para la entrega:</h4>
    <p>${a.descripcion || 'Completar el informe o taller y enviarlo a travÃ©s de la plataforma.'}</p>
  </div>
  <p style="font-size:11px;color:#64748b;">AsignaciÃ³n oficial registrada en SIGAC - UTEQ.</p>
</body>
</html>`;

    this.descargaService.descargarArchivo(`${a.titulo.replace(/\s+/g, '_')}_Guia_UTEQ.html`, html);
  }
}
