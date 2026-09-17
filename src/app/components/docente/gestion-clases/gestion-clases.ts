import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getApiBase } from '../../../api';
import { ClaseService } from '../../../services/clase.service';
import {
  MateriaDto,
  MateriaService,
  RecursoDto,
  ActividadDto,
} from '../../../services/materia.service';
import { DocumentosDescargaService } from '../../../services/documentos-descarga.service';
import { DirectorioService } from '../../../services/directorio.service';
import {
  DocenteService,
  ActividadAyudantiaDto,
  MonitoreoAyudantiaDto,
  HorarioOcupadoAlumnoDto,
  EvaluacionDto,
  PreguntaCuestionarioDto,
  RegistrarResultadosDiagnosticosDto,
  ResumenEvaluacionDiagnosticaDto,
  CronogramaActividadDto,
  HistorialCronogramaDto,
  MateriaActivaDocenteDto,
  ClaseDocenteDto,
} from '../../../services/docente.service';

export interface ClaseCreada {
  // En RF-019 este id representa el Id real de ClaseSesion.
  id: number;
  materiaId: number;
  claseId?: number | null;
  catedraId?: number | null;
  nombreMateria: string;
  dias: string[];
  fecha?: string;
  horaInicio: string;
  horaFin: string;
  tipoClase: string;
  linkVirtual?: string;
  aplicacionVirtual?: string;
  edificioPresencial?: string;
  aulaPresencial?: string;
  pisoPresencial?: string;
  estudiantes: {
    id: number;
    nombre: string;
    presente: boolean;
    correo?: string;
    username?: string;
    asistenciaRegistrada?: boolean;
    asistenciaId?: number | null;
  }[];
  observaciones?: string;
}
export interface RespuestaCuestionarioVisual {
  preguntaId: number;
  respuesta: string;
}

export interface ResultadoDiagnosticoFormulario {
  estudianteId: number;
  nombreEstudiante: string;
  calificacion: number | null;
  observacion: string;
  estado: string;
  archivoEntregaUrl: string | null;
  fechaEntrega: string | null;
  respuestasCuestionario: string | null;
  respuestas: RespuestaCuestionarioVisual[];
}
export interface AyudanteCatedraInfo {
  id: number;
  ayudantiaId: number;
  catedraId: number;
  nombre: string;
  correo: string;
  estado: string;
  horasAsignadas: number;
  horasCompletadas: number;
  avatar: string;
}

@Component({
  selector: 'app-gestion-clases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestion-clases.html',
})
export class GestionClasesComponent implements OnInit, OnDestroy {
  private STORAGE_DOCENTE_CLASES = 'sigac_docente_clases_v2';

  // Control de pestañas
  tabActiva: 'catedras' | 'cronograma' | 'horarios' | 'silabo' | 'crear-clase' | 'recursos' = 'catedras';

  // Datos principales
  docenteIdLogueado: number = 1;
  nombreDocente: string = 'Dra. Evelyn Vance';
  materias: MateriaDto[] = [];
  private materiasActivasBackend: MateriaActivaDocenteDto[] = [];
  materiaSeleccionadaId: number = 101;

  // Clases programadas
  clasesCreadas: ClaseCreada[] = [];
  claseAsistenciaId: number | null = null;

  // Formulario para crear clase
  nuevaClase = {
    materiaId: 101,
    claseId: 1,
    docenteId: 1,
    diasSeleccionados: ['Lunes'] as string[],
    fecha: '',
    horaInicio: '08:00',
    horaFin: '10:00',
    tipoClase: 'Virtual' as 'Virtual' | 'Presencial',
    linkVirtual: 'https://meet.google.com/abc-defg-hij',
    aplicacionVirtual: 'Google Meet',
    edificioPresencial: 'Edificio de Ingeniería',
    aulaPresencial: 'Aula Magna 302',
    pisoPresencial: 'Piso 3',
    observaciones: '',
  };

  // Detección de conflicto de horarios
  conflictoDetectado: HorarioOcupadoAlumnoDto | null = null;
  horariosOcupadosAlumnos: HorarioOcupadoAlumnoDto[] = [];

  // Ayudantes de cátedra
  ayudantesCatedra: AyudanteCatedraInfo[] = [];

  ayudanteSeleccionado: AyudanteCatedraInfo | null = null;
  monitoreoAyudanteActual: MonitoreoAyudantiaDto | null = null;
  modalBitacorasAbierto: boolean = false;
  tabMonitoreo: 'informes' | 'bitacoras' = 'informes';
  informesAyudanteActual: any[] = [];

  // Sílabo / Planificación para el ayudante
  planificacionSilabo: ActividadAyudantiaDto[] = [];
  nuevaActividadSilabo = {
    semana: 4,
    tema: '',
    descripcion: '',
    directrices: '',
    fechaPlanificada: '',
    recursosSugeridos: '',
  };

  // Recursos Pedagógicos (Opciones del ayudante / docente)
  recursosMateria: RecursoDto[] = [];
  subTabRecursos: 'recursos' | 'actividades' | 'diagnostica' = 'recursos';
  nuevoRecurso = {
    titulo: '',
    tipo: 'PDF',
    esEsencial: true,
    url: 'https://repositorio.uteq.edu.ec/guias/calculo-avanzado.pdf',
    descripcion: '',
    temaNombre: 'Tema 1: Fundamentos y Derivadas Parciales',
    // Texto con enlaces adicionales (una por línea o separadas por comas)
    linksString: '',
  };

  // Actividades Pedagógicas
  actividadesMateria: ActividadDto[] = [];
  nuevaActividad = {
    titulo: '',
    tipo: 'Taller',
    fechaEntrega: '',
    descripcion: '',
    ponderacion: 10,
  };
  // Evaluación Diagnóstica - RF-004
  evaluacionesDiagnosticas: EvaluacionDto[] = [];

  nuevaEvaluacionDiagnostica = {
    nombre: '',
    instrucciones: '',
    tipoEvaluacion: 'Archivo' as 'Archivo' | 'Cuestionario',
    fechaInicio: '',
    fechaFin: '',
    archivoDocenteUrl: '',
  };

  preguntasNuevaEvaluacion: PreguntaCuestionarioDto[] = [];
  nuevaPreguntaCuestionario = '';

  evaluacionDiagnosticaSeleccionada: EvaluacionDto | null = null;
  resultadosDiagnosticosFormulario: ResultadoDiagnosticoFormulario[] = [];
  resultadoDiagnosticoSeleccionado: ResultadoDiagnosticoFormulario | null = null;
  resumenEvaluacionDiagnostica: ResumenEvaluacionDiagnosticaDto | null = null;

  mostrarModalCrearDiagnostica = false;
  mostrarModalRevisionDiagnostica = false;
  cargandoResultadosDiagnosticos = false;
  guardandoResultadosDiagnosticos = false;

  // Cronograma de Cátedra - RF-005
  cronogramaCatedra: CronogramaActividadDto[] = [];
  cargandoCronograma = false;
  guardandoCronograma = false;

  // Reprogramación en ventana emergente
  mostrarModalReprogramacionCronograma = false;
  actividadCronogramaEditando: CronogramaActividadDto | null = null;

  // Historial por actividad en ventana emergente
  mostrarModalHistorialCronograma = false;
  actividadHistorialCronograma: CronogramaActividadDto | null = null;
  historialActividadCronograma: HistorialCronogramaDto[] = [];
  cargandoHistorialCronograma = false;

  nuevaActividadCronograma = {
    descripcion: '',
    fechaPrevista: '',
  };

  reprogramacionCronograma = {
    descripcion: '',
    fechaPrevista: '',
    observacionCambio: '',
  };

  // Archivos adjuntos seleccionados
  archivoRecurso: { nombre: string; tamanoKb: number; dataUrl: string } | null = null;
  archivoActividad: { nombre: string; tamanoKb: number; dataUrl: string } | null = null;

  // Mensajes y estados
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  // Notificación de credenciales en pantalla
  credencialesNotificacion = {
    mostrar: false,
    mensaje: '',
    username: '',
    tempPassword: '',
  };
  copiadoCredenciales = false;

  // Modal para agregar estudiante a la clase
  mostrarModalAgregarEstudiante = false;
  nuevoEstudianteClase = {
    nombre: '',
    correo: '',
    cedula: '',
    matricula: '',
  };

  mostrarModalSolicitudAyudante = false;
  motivoSolicitud = '';
  ayudanteEmail = 'ayudante@uteq.edu.ec';

  private subs: Subscription[] = [];
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private claseService: ClaseService,
    private materiaService: MateriaService,
    private docenteService: DocenteService,
    private descargaService: DocumentosDescargaService,
    private directorioService: DirectorioService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const rawUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (rawUserId) {
      this.docenteIdLogueado = parseInt(rawUserId, 10);
    }
    const rawNombre = typeof window !== 'undefined' ? localStorage.getItem('userName') : null;
    if (rawNombre) {
      this.nombreDocente = rawNombre;
    }

    // Consumir la API para reflejar de inmediato cualquier materia asignada por el Administrador
    this.cargarClasesDocente();

    // Suscripción a Materias
    this.subs.push(
      this.materiaService.materias$.subscribe((list) => {
        this.materias = list;
        if (list.length > 0) {
          if (!this.materiaSeleccionadaId) {
            this.materiaSeleccionadaId = list[0].id;
          }
          this.nuevaClase.materiaId = this.materiaSeleccionadaId;
          this.actualizarRecursosYActividades();
        }
      }),
    );

    // Suscripción a Ocupaciones de Alumnos
    this.subs.push(
      this.docenteService.ocupaciones$.subscribe((ocupaciones) => {
        this.horariosOcupadosAlumnos = ocupaciones;
        this.revisarConflictoHorario();
      }),
    );

    // Query params para tab y preselección
    this.subs.push(
      this.route.queryParams.subscribe((params) => {
        if (params['tab']) {
          this.tabActiva = params['tab'] as any;
        }
        if (params['materiaId']) {
          this.materiaSeleccionadaId = Number(params['materiaId']);
          this.nuevaClase.materiaId = this.materiaSeleccionadaId;
        }
        if (params['dia']) {
          this.nuevaClase.diasSeleccionados = [params['dia']];
        }
        if (params['horaInicio']) {
          this.nuevaClase.horaInicio = params['horaInicio'];
        }
        if (params['horaFin']) {
          this.nuevaClase.horaFin = params['horaFin'];
        }
        this.revisarConflictoHorario();
      }),
    );

    // Cargar ayudante inicial para sílabo si existe
    if (this.ayudantesCatedra.length > 0) {
      this.seleccionarAyudanteParaSilabo(this.ayudantesCatedra[0]);
    }
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }

  setTab(tab: 'catedras' | 'cronograma' | 'horarios' | 'silabo' | 'crear-clase' | 'recursos') {
    this.tabActiva = tab;

    if (tab === 'cronograma') {
      this.cargarCronogramaCatedra();
    }

    if (tab === 'horarios' || tab === 'crear-clase') {
      this.revisarConflictoHorario();
      this.cargarSesionesMateriaActual();
    }

    if (tab === 'recursos') {
      this.actualizarRecursosYActividades();

      // Solo cargamos diagnósticas si esa subpestaña ya está activa.
      // Primero respetamos la materia elegida en el SELECT y después
      // resolvemos su cátedra real.
      if (this.subTabRecursos === 'diagnostica') {
        this.cargarEvaluacionesDiagnosticas(this.materiaSeleccionadaId);
      }
    }
  }

  abrirSubTabDiagnostica(): void {
    this.subTabRecursos = 'diagnostica';
    this.evaluacionDiagnosticaSeleccionada = null;
    this.resultadosDiagnosticosFormulario = [];
    this.resultadoDiagnosticoSeleccionado = null;
    this.resumenEvaluacionDiagnostica = null;

    // La fuente de verdad es la opción actualmente elegida en el SELECT.
    this.cargarEvaluacionesDiagnosticas(this.materiaSeleccionadaId);
  }

  cambiarMateriaSeleccionada(materiaId: number) {
    // Primero actualizamos exactamente lo seleccionado por el usuario.
    this.materiaSeleccionadaId = Number(materiaId);
    this.nuevaClase.materiaId = this.materiaSeleccionadaId;

    const activa = this.materiasActivasBackend.find(
      (m) => Number(m.materiaId) === Number(this.materiaSeleccionadaId),
    );
    const primeraClase = activa?.clases?.[0];
    if (primeraClase) {
      this.nuevaClase.claseId = Number(primeraClase.claseId);
    }
    if (activa) {
      this.nuevaClase.docenteId = Number(activa.docenteId);
    }

    this.actualizarRecursosYActividades();

    // Limpiamos los datos de la materia anterior antes de consultar la nueva.
    this.evaluacionesDiagnosticas = [];
    this.evaluacionDiagnosticaSeleccionada = null;
    this.resultadosDiagnosticosFormulario = [];
    this.resultadoDiagnosticoSeleccionado = null;
    this.resumenEvaluacionDiagnostica = null;

    this.cronogramaCatedra = [];
    this.actividadCronogramaEditando = null;
    this.actividadHistorialCronograma = null;
    this.historialActividadCronograma = [];
    this.mostrarModalReprogramacionCronograma = false;
    this.mostrarModalHistorialCronograma = false;

    if (this.tabActiva === 'cronograma') {
      this.cargarCronogramaCatedra();
    }

    // Si el usuario está mirando Diagnóstica, recién aquí consultamos
    // usando la materia que acaba de seleccionar.
    if (this.tabActiva === 'recursos' && this.subTabRecursos === 'diagnostica') {
      this.cargarEvaluacionesDiagnosticas(this.materiaSeleccionadaId);
    }

    // Actualizar los ayudantes de la cátedra real asociada a la materia seleccionada.
    this.cargarAyudantesCatedraActual();

    if (this.tabActiva === 'horarios' || this.tabActiva === 'crear-clase') {
      this.cargarSesionesMateriaActual();
    }

    this.revisarConflictoHorario();
  }

  get materiaSeleccionada(): MateriaDto | undefined {
    return (
      this.materias.find((m) => m.id === Number(this.materiaSeleccionadaId)) || this.materias[0]
    );
  }

  private obtenerCatedraIdPorMateria(materiaId: number | null | undefined): number | null {
    if (materiaId == null || Number.isNaN(Number(materiaId))) {
      return null;
    }

    // RF-016 es la fuente principal para resolver Materia -> Cátedra.
    const activa = this.materiasActivasBackend.find(
      (m) => Number(m.materiaId) === Number(materiaId),
    );

    if (activa && Number(activa.catedraId) > 0) {
      return Number(activa.catedraId);
    }

    // Compatibilidad para cátedras sin MateriaId asociada.
    const materia = this.materias.find((m) => Number(m.id) === Number(materiaId));
    if (materia?.catedraId != null && Number(materia.catedraId) > 0) {
      return Number(materia.catedraId);
    }

    const clase = this.clasesCreadas.find(
      (c) =>
        Number(c.materiaId) === Number(materiaId) &&
        c.catedraId != null &&
        Number(c.catedraId) > 0,
    );

    return clase?.catedraId != null ? Number(clase.catedraId) : null;
  }

  get catedraSeleccionadaId(): number | null {
    return this.obtenerCatedraIdPorMateria(this.materiaSeleccionadaId);
  }

  get ayudantesDeMateriaActual(): AyudanteCatedraInfo[] {
    const catedraId = this.catedraSeleccionadaId;
    if (!catedraId) {
      return [];
    }

    return this.ayudantesCatedra.filter((a) => Number(a.catedraId) === Number(catedraId));
  }

  private cargarAyudantesCatedraActual(): void {
    const catedraId = this.catedraSeleccionadaId;

    this.ayudanteSeleccionado = null;
    this.planificacionSilabo = [];

    if (!catedraId) {
      this.ayudantesCatedra = [];
      this.cdr.detectChanges();
      return;
    }

    this.docenteService.getAyudantesCatedra(catedraId).subscribe({
      next: (ayudantes) => {
        this.ayudantesCatedra = (Array.isArray(ayudantes) ? ayudantes : []).map((ayudante) => ({
          id: Number(ayudante.id || ayudante.estudianteId),
          ayudantiaId: Number(ayudante.ayudantiaId),
          catedraId: Number(ayudante.catedraId),
          nombre: ayudante.nombre || 'Ayudante de Cátedra',
          correo: ayudante.correo || '',
          estado: ayudante.estado || 'Asignada',
          horasAsignadas: 30,
          horasCompletadas: 0,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(ayudante.nombre || 'Ayudante')}&background=e0e7ff&color=4338ca`,
        }));

        const primero = this.ayudantesDeMateriaActual[0] || null;
        if (primero) {
          this.seleccionarAyudanteParaSilabo(primero);
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando ayudantes de la cátedra:', error);
        this.ayudantesCatedra = [];
        this.ayudanteSeleccionado = null;
        this.planificacionSilabo = [];
        this.cdr.detectChanges();
      },
    });
  }

  // ==========================================
  // CRONOGRAMA DE CÁTEDRA - RF-005
  // ==========================================

  get fechaMinimaCronograma(): string {
    const ahora = new Date();
    const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  cargarCronogramaCatedra(): void {
    const catedraId = this.catedraSeleccionadaId;

    if (!catedraId) {
      this.cronogramaCatedra = [];
      this.actividadCronogramaEditando = null;
      this.actividadHistorialCronograma = null;
      this.historialActividadCronograma = [];
      this.mostrarModalReprogramacionCronograma = false;
      this.mostrarModalHistorialCronograma = false;
      this.cargandoCronograma = false;
      this.cdr.detectChanges();
      return;
    }

    this.cargandoCronograma = true;
    this.errorMessage = '';

    this.docenteService.getCronogramaByCatedra(catedraId).subscribe({
      next: (cronograma) => {
        this.cronogramaCatedra = Array.isArray(cronograma) ? cronograma : [];
        this.cargandoCronograma = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando cronograma de cátedra:', error);
        this.cronogramaCatedra = [];
        this.cargandoCronograma = false;
        this.errorMessage =
          error?.error?.message || 'No se pudo cargar el cronograma de la cátedra.';
        this.cdr.detectChanges();
      },
    });

  }

  crearActividadCronograma(): void {
    const catedraId = this.catedraSeleccionadaId;
    const descripcion = this.nuevaActividadCronograma.descripcion.trim();
    const fechaTexto = this.nuevaActividadCronograma.fechaPrevista;

    if (!catedraId) {
      this.errorMessage =
        'No se pudo identificar la cátedra correspondiente a la materia seleccionada.';
      return;
    }

    if (!descripcion) {
      this.errorMessage = 'Ingresa la actividad que deseas agregar al cronograma.';
      return;
    }

    if (!fechaTexto) {
      this.errorMessage = 'Selecciona la fecha prevista de la actividad.';
      return;
    }

    const fecha = new Date(fechaTexto);
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    if (Number.isNaN(fecha.getTime()) || fecha < inicioHoy) {
      this.errorMessage = 'La fecha del cronograma no puede estar en el pasado.';
      return;
    }

    this.guardandoCronograma = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.docenteService
      .crearCronogramaActividad({
        catedraId,
        descripcion,
        fechaPrevista: fecha.toISOString(),
        fechaReal: null,
        observacionCambio: '',
      })
      .subscribe({
        next: (actividad) => {
          this.guardandoCronograma = false;
          this.cronogramaCatedra = [...this.cronogramaCatedra, actividad].sort(
            (a, b) =>
              new Date(a.fechaPrevista).getTime() - new Date(b.fechaPrevista).getTime(),
          );
          this.nuevaActividadCronograma = {
            descripcion: '',
            fechaPrevista: '',
          };
          this.successMessage = 'Actividad agregada al cronograma correctamente.';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 4000);
        },
        error: (error) => {
          this.guardandoCronograma = false;
          console.error('Error creando actividad del cronograma:', error);
          this.errorMessage =
            error?.error?.message || 'No se pudo agregar la actividad al cronograma.';
          this.cdr.detectChanges();
        },
      });
  }

  iniciarReprogramacionCronograma(actividad: CronogramaActividadDto): void {
    this.actividadCronogramaEditando = actividad;
    this.reprogramacionCronograma = {
      descripcion: actividad.descripcion,
      fechaPrevista: this.convertirFechaAInput(actividad.fechaPrevista),
      observacionCambio: '',
    };
    this.errorMessage = '';
    this.mostrarModalReprogramacionCronograma = true;
  }

  cancelarReprogramacionCronograma(): void {
    this.mostrarModalReprogramacionCronograma = false;
    this.actividadCronogramaEditando = null;
    this.reprogramacionCronograma = {
      descripcion: '',
      fechaPrevista: '',
      observacionCambio: '',
    };
  }

  guardarReprogramacionCronograma(): void {
    const catedraId = this.catedraSeleccionadaId;
    const actividad = this.actividadCronogramaEditando;

    if (!catedraId || !actividad) {
      return;
    }

    const descripcion = this.reprogramacionCronograma.descripcion.trim();
    const observacion = this.reprogramacionCronograma.observacionCambio.trim();
    const fechaTexto = this.reprogramacionCronograma.fechaPrevista;

    if (!descripcion) {
      this.errorMessage = 'La actividad no puede quedar vacía.';
      return;
    }

    if (!fechaTexto) {
      this.errorMessage = 'Selecciona la nueva fecha de la actividad.';
      return;
    }

    if (!observacion) {
      this.errorMessage = 'Debes indicar la observación o motivo del cambio.';
      return;
    }

    const fechaNueva = new Date(fechaTexto);
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    if (Number.isNaN(fechaNueva.getTime()) || fechaNueva < inicioHoy) {
      this.errorMessage = 'No se puede reprogramar una actividad para una fecha pasada.';
      return;
    }

    const payload: CronogramaActividadDto = {
      id: actividad.id,
      catedraId,
      descripcion,
      fechaPrevista: fechaNueva.toISOString(),
      fechaReal: actividad.fechaReal ?? null,
      observacionCambio: observacion,
    };

    this.guardandoCronograma = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.docenteService.reprogramarCronograma(catedraId, payload).subscribe({
      next: (respuesta) => {
        this.guardandoCronograma = false;

        this.cronogramaCatedra = this.cronogramaCatedra
          .map((item) =>
            item.id === actividad.id
              ? {
                ...item,
                descripcion: respuesta.actividad.descripcion,
                fechaPrevista: respuesta.actividad.fechaPrevista,
                fechaReal: respuesta.actividad.fechaReal,
                observacionCambio: '',
              }
              : item,
          )
          .sort(
            (a, b) =>
              new Date(a.fechaPrevista).getTime() - new Date(b.fechaPrevista).getTime(),
          );

        this.cancelarReprogramacionCronograma();
        this.successMessage =
          'Cronograma reprogramado correctamente. La actualización ya está disponible para los estudiantes.';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 4500);
      },
      error: (error) => {
        this.guardandoCronograma = false;
        console.error('Error reprogramando cronograma:', error);
        this.errorMessage =
          error?.error?.message || 'No se pudo reprogramar la actividad del cronograma.';
        this.cdr.detectChanges();
      },
    });
  }

  abrirHistorialActividadCronograma(actividad: CronogramaActividadDto): void {
    const catedraId = this.catedraSeleccionadaId;

    this.actividadHistorialCronograma = actividad;
    this.historialActividadCronograma = [];
    this.mostrarModalHistorialCronograma = true;
    this.cargandoHistorialCronograma = true;

    if (!catedraId) {
      this.cargandoHistorialCronograma = false;
      this.errorMessage = 'No se pudo identificar la cátedra de la actividad seleccionada.';
      return;
    }

    this.docenteService.obtenerHistorialCronograma(catedraId).subscribe({
      next: (historial) => {
        const lista = Array.isArray(historial) ? historial : [];
        this.historialActividadCronograma = lista
          .filter((cambio) => Number(cambio.actividadId) === Number(actividad.id))
          .sort(
            (a, b) =>
              new Date(b.fechaModificacion).getTime() -
              new Date(a.fechaModificacion).getTime(),
          );
        this.cargandoHistorialCronograma = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando historial de la actividad:', error);
        this.historialActividadCronograma = [];
        this.cargandoHistorialCronograma = false;
        this.errorMessage = 'No se pudo cargar el historial de esta actividad.';
        this.cdr.detectChanges();
      },
    });
  }

  cerrarHistorialActividadCronograma(): void {
    this.mostrarModalHistorialCronograma = false;
    this.actividadHistorialCronograma = null;
    this.historialActividadCronograma = [];
    this.cargandoHistorialCronograma = false;
  }

  private convertirFechaAInput(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) {
      return '';
    }

    const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  // ==========================================
  // GESTIÓN DE HORARIOS Y CONFLICTOS DE ALUMNOS
  // ==========================================

  revisarConflictoHorario() {
    const dia = this.nuevaClase.diasSeleccionados[0] || 'Lunes';
    const horaInicio = this.nuevaClase.horaInicio || '08:00';
    const horaFin = this.nuevaClase.horaFin || '10:00';

    this.conflictoDetectado = this.docenteService.verificarConflictoHorario(
      this.nuevaClase.claseId || 1,
      dia,
      horaInicio,
      horaFin,
    );
  }

  getOcupacionEnCelda(dia: string, horaInicio: string): HorarioOcupadoAlumnoDto | undefined {
    return this.horariosOcupadosAlumnos.find(
      (o) => o.dia.toLowerCase() === dia.toLowerCase() && o.horaInicio === horaInicio,
    );
  }

  getClaseDocenteEnCelda(dia: string, horaInicio: string): ClaseCreada | undefined {
    return this.clasesCreadas.find(
      (c) =>
        c.dias.some((d) => d.toLowerCase() === dia.toLowerCase()) && c.horaInicio === horaInicio,
    );
  }

  seleccionarSlotHorario(dia: string, horaInicio: string, horaFin: string) {
    // Si la celda está ocupada por alumnos, mostrar advertencia
    const conflicto = this.getOcupacionEnCelda(dia, horaInicio);
    if (conflicto) {
      alert(
        `⚠️ Los alumnos están ocupados los ${dia}s a las ${horaInicio} con '${conflicto.materiaOcupada}'. No se recomienda programar en este horario.`,
      );
      return;
    }

    this.nuevaClase.diasSeleccionados = [dia];
    this.nuevaClase.horaInicio = horaInicio;
    this.nuevaClase.horaFin = horaFin;
    this.revisarConflictoHorario();
    this.setTab('crear-clase');
  }

  // ==========================================
  // SÍLABO Y GUÍA DIDÁCTICA PARA EL AYUDANTE
  // ==========================================

  seleccionarAyudanteParaSilabo(ayudante: AyudanteCatedraInfo) {
    this.ayudanteSeleccionado = ayudante;
    this.docenteService.getPlanificacionAyudantia(ayudante.ayudantiaId).subscribe((plan) => {
      this.planificacionSilabo = plan;
    });
  }

  abrirMonitoreoBitacoras(ayudante: AyudanteCatedraInfo) {
    this.ayudanteSeleccionado = ayudante;
    this.tabMonitoreo = 'informes';
    this.cargarInformesDeAyudante(ayudante);
    this.docenteService.monitorearAyudantia(ayudante.ayudantiaId).subscribe((monitoreo) => {
      this.monitoreoAyudanteActual = monitoreo;
      this.modalBitacorasAbierto = true;
    });
  }

  cargarInformesDeAyudante(ayudante: AyudanteCatedraInfo) {
    let todosLosInformes: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sigac_informes_ayudantia_v1');
        if (stored) {
          todosLosInformes = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Error al cargar informes de ayudantía', e);
      }
    }

    if (!Array.isArray(todosLosInformes) || todosLosInformes.length === 0) {
      todosLosInformes = [
        {
          id: 1,
          numeroResolucion: 'RES-FAC-2026-084-AYUD',
          tipoInforme: 'Mensual',
          ayudantiaId: 101,
          catedraNombre: 'Cálculo Avanzado',
          periodo: 'Agosto 2026',
          horasTotales: 24,
          diasPorSemana: 3,
          modalidad: 'Presencial',
          temasImpartidos:
            'Ejercicios de integración múltiple, Teorema de Fubini y cambio de variables con Jacobiano.',
          anexos: [
            {
              id: 'anx-1',
              nombre: 'Hojas_Asistencia_Firmadas_Agosto.pdf',
              tamanoKb: 1420,
              tipo: 'documento_firmado',
              fechaCarga: '2026-08-31',
            },
          ],
          estado: 'Aprobado por Docente',
          fechaCreacion: '2026-08-31 16:20',
        },
        {
          id: 2,
          numeroResolucion: 'RES-FAC-2026-084-AYUD',
          tipoInforme: 'Mensual',
          ayudantiaId: 101,
          catedraNombre: 'Cálculo Avanzado',
          periodo: 'Septiembre 2026',
          horasTotales: 28,
          diasPorSemana: 3,
          modalidad: 'Virtual',
          temasImpartidos:
            'Campos vectoriales, rotacional, divergencia y resolución de guías de estudio para el examen intermedio.',
          anexos: [
            {
              id: 'anx-2',
              nombre: 'Captura_Meet_Sesion_09_02.png',
              tamanoKb: 840,
              tipo: 'captura_videollamada',
              fechaCarga: '2026-09-02',
            },
          ],
          estado: 'Enviado a Coordinación',
          fechaCreacion: '2026-09-02 18:00',
        },
      ];
    }

    // Filtrar los informes de este ayudante o de la cátedra activa
    this.informesAyudanteActual = todosLosInformes.filter(
      (inf) =>
        Number(inf.ayudantiaId) === Number(ayudante.ayudantiaId) ||
        Number(inf.ayudantiaId) === Number(ayudante.catedraId) ||
        Number(inf.ayudantiaId) === Number(ayudante.id) ||
        ayudante.nombre.toLowerCase().includes('alejandro'),
    );
  }

  aprobarInformeAyudante(inf: any) {
    inf.estado = 'Aprobado por Docente';
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sigac_informes_ayudantia_v1');
        let lista = stored ? JSON.parse(stored) : [];
        const idx = lista.findIndex((item: any) => item.id === inf.id);
        if (idx !== -1) {
          lista[idx].estado = 'Aprobado por Docente';
        } else {
          lista.unshift(inf);
        }
        localStorage.setItem('sigac_informes_ayudantia_v1', JSON.stringify(lista));
      } catch (e) {
        console.warn('Error al actualizar informe', e);
      }
    }
    this.successMessage = `¡Informe "${inf.numeroResolucion}" aprobado exitosamente por el docente responsable!`;
    setTimeout(() => {
      this.successMessage = '';
    }, 4500);
  }

  descargarInformeAyudante(inf: any) {
    const htmlContenido = this.descargaService.construirHtmlInformeAyudantia({
      titulo: `INFORME DE RENDICIÓN DE ACTIVIDADES - ${inf.numeroResolucion}`,
      codigoResolucion: inf.numeroResolucion,
      periodo: inf.periodo,
      materia: inf.catedraNombre || this.materiaSeleccionada?.nombre || 'Cálculo Avanzado',
      ayudante: this.ayudanteSeleccionado?.nombre || 'Alejandro García',
      docente: this.nombreDocente || 'Docente Responsable',
      modalidad: inf.modalidad,
      horas: inf.horasTotales,
      diasPorSemana: inf.diasPorSemana,
      temas: inf.temasImpartidos,
      anexos: inf.anexos,
      estado: inf.estado,
    });

    const nombreArchivo = `INFORME_AYUDANTIA_${inf.numeroResolucion.replace(/[\/\s]/g, '_')}_${inf.periodo.replace(/[\/\s]/g, '_')}.html`;
    this.descargaService.descargarArchivo(nombreArchivo, htmlContenido);
  }

  imprimirInformeAyudante(inf: any) {
    const htmlContenido = this.descargaService.construirHtmlInformeAyudantia({
      titulo: `INFORME DE RENDICIÓN DE ACTIVIDADES - ${inf.numeroResolucion}`,
      codigoResolucion: inf.numeroResolucion,
      periodo: inf.periodo,
      materia: inf.catedraNombre || this.materiaSeleccionada?.nombre || 'Cálculo Avanzado',
      ayudante: this.ayudanteSeleccionado?.nombre || 'Alejandro García',
      docente: this.nombreDocente || 'Docente Responsable',
      modalidad: inf.modalidad,
      horas: inf.horasTotales,
      diasPorSemana: inf.diasPorSemana,
      temas: inf.temasImpartidos,
      anexos: inf.anexos,
      estado: inf.estado,
    });

    this.descargaService.imprimirDocumentoOficial(
      htmlContenido,
      `Informe_Ayudantia_${inf.numeroResolucion}`,
    );
  }

  cerrarMonitoreoBitacoras() {
    this.modalBitacorasAbierto = false;
    this.monitoreoAyudanteActual = null;
  }

  agregarActividadAlSilabo() {
    if (!this.ayudanteSeleccionado) {
      alert('Por favor selecciona un ayudante de cátedra.');
      return;
    }

    if (!this.nuevaActividadSilabo.tema.trim()) {
      alert('Debes indicar el tema que el ayudante debe impartir.');
      return;
    }

    const payload: ActividadAyudantiaDto = {
      id: Date.now(),
      ayudantiaId: this.ayudanteSeleccionado.ayudantiaId,
      semana: this.nuevaActividadSilabo.semana,
      tema: this.nuevaActividadSilabo.tema.trim(),
      descripcion:
        this.nuevaActividadSilabo.descripcion.trim() ||
        `Guía de enseñanza para la semana ${this.nuevaActividadSilabo.semana}`,
      directrices:
        this.nuevaActividadSilabo.directrices.trim() ||
        'Resolver ejercicios y orientar a los alumnos en dudas teóricas.',
      fechaPlanificada:
        this.nuevaActividadSilabo.fechaPlanificada || new Date().toISOString().split('T')[0],
      recursosSugeridos:
        this.nuevaActividadSilabo.recursosSugeridos.trim() ||
        'Guía de ejercicios y presentaciones del curso',
      completada: false,
    };

    this.isLoading = true;
    this.docenteService
      .planificarActividadAyudantia(this.ayudanteSeleccionado.ayudantiaId, payload)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.planificacionSilabo.unshift(res);
          this.successMessage = `¡Directriz del sílabo asignada exitosamente al ayudante ${this.ayudanteSeleccionado?.nombre}!`;
          setTimeout(() => (this.successMessage = ''), 4000);

          // Reset
          this.nuevaActividadSilabo.tema = '';
          this.nuevaActividadSilabo.descripcion = '';
          this.nuevaActividadSilabo.directrices = '';
          this.nuevaActividadSilabo.recursosSugeridos = '';
          this.nuevaActividadSilabo.semana++;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  toggleCumplimientoSilabo(actividad: ActividadAyudantiaDto) {
    if (!this.ayudanteSeleccionado) return;
    this.docenteService
      .toggleActividadPlanificada(this.ayudanteSeleccionado.ayudantiaId, actividad.id)
      .subscribe(() => {
        actividad.completada = !actividad.completada;
      });
  }

  eliminarActividadSilabo(actividadId: number) {
    if (!this.ayudanteSeleccionado) return;
    if (confirm('¿Deseas eliminar este tema del sílabo del ayudante?')) {
      this.docenteService
        .eliminarActividadPlanificada(this.ayudanteSeleccionado.ayudantiaId, actividadId)
        .subscribe(() => {
          this.planificacionSilabo = this.planificacionSilabo.filter((a) => a.id !== actividadId);
        });
    }
  }

  // Navegación a Revisar y Calificar Actividades Formativas
  irARevisarActividades() {
    this.tabActiva = 'recursos';
    this.subTabRecursos = 'actividades';
  }

  abrirModalSolicitudAyudante() {
    this.motivoSolicitud = `Necesitamos apoyo académico para reforzar tutorías, guías prácticas y revisión de actividades en ${this.materiaSeleccionada?.nombre || 'la cátedra'}.`;
    this.ayudanteEmail = this.ayudanteEmail || 'ayudante@uteq.edu.ec';
    this.mostrarModalSolicitudAyudante = true;
  }

  cerrarModalSolicitudAyudante() {
    this.mostrarModalSolicitudAyudante = false;
    this.motivoSolicitud = '';
  }

  solicitarAyudante() {
    if (!this.materiaSeleccionada) {
      return;
    }

    const email = (this.ayudanteEmail || 'ayudante@uteq.edu.ec').trim();
    const payload = {
      catedraId: this.materiaSeleccionada.id,
      materiaId: this.materiaSeleccionada.id,
      nombreMateria: this.materiaSeleccionada.nombre,
      codigoMateria: this.materiaSeleccionada.codigo,
      docenteId: this.docenteIdLogueado,
      nombreDocente: this.nombreDocente,
      motivo:
        this.motivoSolicitud ||
        'Se requiere apoyo académico para tutorías y acompañamiento de estudiantes.',
      estado: 'Pendiente',
      fecha: new Date().toISOString().split('T')[0],
    };

    this.http
      .post(`${getApiBase()}/api/Docente/convocatorias`, payload)
      .pipe(
        catchError(() => {
          const pendientes = JSON.parse(
            localStorage.getItem('sigac_convocatorias_pendientes') || '[]',
          );
          pendientes.unshift({ ...payload, id: Date.now() });
          localStorage.setItem('sigac_convocatorias_pendientes', JSON.stringify(pendientes));
          return of({ success: true, payload });
        }),
      )
      .subscribe({
        next: () => {
          this.materiaService
            .asignarAyudanteMateria(this.materiaSeleccionada!.id, email)
            .subscribe({
              next: (res) => {
                this.successMessage =
                  res.mensaje ||
                  `Solicitud y asignación de ayudante enviada para ${this.materiaSeleccionada?.nombre}.`;
                this.cerrarModalSolicitudAyudante();
                setTimeout(() => (this.successMessage = ''), 3500);
              },
              error: () => {
                this.errorMessage = 'No se pudo completar la asignación del ayudante.';
                setTimeout(() => (this.errorMessage = ''), 3500);
              },
            });
        },
        error: () => {
          this.errorMessage = 'No se pudo enviar la solicitud de ayudante.';
          setTimeout(() => (this.errorMessage = ''), 3500);
        },
      });
  }

  // ==========================================
  // CREACIÓN Y PROGRAMACIÓN DE CLASES
  // ==========================================

  /**
   * RF-016: carga únicamente las materias/cátedras activas del docente autenticado.
   * La fuente de verdad para el selector superior es GET /api/Docente/materias-activas.
   * GET /api/Docente/clases se usa solo para completar estudiantes reales de cada clase.
   * No se crean materias, alumnos ni horarios ficticios cuando la API no responde.
   */
  cargarClasesDocente(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.docenteService.getMateriasActivas().subscribe({
      next: (materiasActivas) => {
        const activas = Array.isArray(materiasActivas) ? materiasActivas : [];
        this.materiasActivasBackend = activas;

        if (activas.length === 0) {
          this.materias = [];
          this.clasesCreadas = [];
          this.ayudantesCatedra = [];
          this.ayudanteSeleccionado = null;
          this.planificacionSilabo = [];
          this.materiaService.syncMaterias([]);
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        // La lista de clases aporta los estudiantes reales. Si esta segunda
        // consulta falla, RF-016 sigue mostrando las materias activas sin inventar datos.
        this.docenteService
          .getClasesDocente()
          .pipe(
            catchError((error) => {
              console.error('No se pudieron cargar los detalles de las clases:', error);
              return of([] as ClaseDocenteDto[]);
            }),
          )
          .subscribe({
            next: (clasesReales) => {
              this.procesarMateriasActivas(activas, clasesReales || []);
              this.isLoading = false;
              this.cargarAyudantesCatedraActual();

              if (this.tabActiva === 'recursos' && this.subTabRecursos === 'diagnostica') {
                this.cargarEvaluacionesDiagnosticas(this.materiaSeleccionadaId);
              }

              if (this.tabActiva === 'cronograma') {
                this.cargarCronogramaCatedra();
              }

              if (this.tabActiva === 'horarios' || this.tabActiva === 'crear-clase') {
                this.cargarSesionesMateriaActual();
              }

              this.cdr.detectChanges();
            },
          });
      },
      error: (error) => {
        console.error('Error cargando materias activas del docente:', error);
        this.materiasActivasBackend = [];
        this.materias = [];
        this.clasesCreadas = [];
        this.ayudantesCatedra = [];
        this.ayudanteSeleccionado = null;
        this.planificacionSilabo = [];
        this.materiaService.syncMaterias([]);
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message || 'No se pudieron cargar las materias activas del docente.';
        this.cdr.detectChanges();
      },
    });
  }

  private procesarMateriasActivas(
    activas: MateriaActivaDocenteDto[],
    clasesReales: ClaseDocenteDto[],
  ): void {
    const nuevasMaterias: MateriaDto[] = [];
    const nuevasClases: ClaseCreada[] = [];

    for (const activa of activas) {
      // En RF-016 la MateriaId puede ser null si la cátedra todavía no está
      // vinculada a una entidad Materia. Para poder mostrarla en el selector
      // usamos CatedraId únicamente como identificador visual en ese caso.
      const materiaId = Number(activa.materiaId ?? activa.catedraId);
      const clasesActivas = Array.isArray(activa.clases) ? activa.clases : [];
      const primeraClase = clasesActivas[0];

      const clasesDetalle = clasesReales.filter((clase) =>
        clasesActivas.some(
          (claseActiva) => Number(claseActiva.claseId) === Number(clase.claseId ?? clase.id),
        ),
      );

      const estudiantesUnicos = new Map<number, any>();
      for (const clase of clasesDetalle) {
        for (const estudiante of clase.estudiantes || []) {
          const estudianteId = Number(estudiante.estudianteId || estudiante.id);
          if (!estudianteId || estudiantesUnicos.has(estudianteId)) continue;

          estudiantesUnicos.set(estudianteId, {
            id: estudianteId,
            nombre:
              estudiante.nombreCompleto ||
              estudiante.nombre ||
              estudiante.username ||
              'Estudiante',
            correo: estudiante.correo || estudiante.email || '',
            cedula: estudiante.cedula || estudiante.ci || '',
            matricula: estudiante.username || '',
            nota:
              estudiante.promedioActual == null
                ? undefined
                : Number(estudiante.promedioActual),
            estado: estudiante.alertaRendimiento === true ? 'Riesgo' : 'Regular',
          });
        }
      }

      const materiaDto: MateriaDto = {
        id: materiaId,
        catedraId: Number(activa.catedraId),
        nombre: activa.nombre,
        codigo: activa.codigo,
        descripcion: activa.descripcion || '',
        docente: this.nombreDocente,
        docenteResponsableId: Number(activa.docenteId),
        docenteId: Number(activa.docenteId),
        docenteNombre: this.nombreDocente,
        semestre: activa.semestre,
        claseId: primeraClase ? Number(primeraClase.claseId) : undefined,
        claseNombre: primeraClase?.nombre || '',
        clases: clasesActivas,
        estudiantes: Array.from(estudiantesUnicos.values()),
      };

      nuevasMaterias.push(materiaDto);

      for (const claseActiva of clasesActivas) {
        const claseId = Number(claseActiva.claseId);
        const detalle = clasesReales.find(
          (clase) => Number(clase.claseId ?? clase.id) === claseId,
        );

        nuevasClases.push({
          id: claseId,
          claseId,
          materiaId,
          catedraId: Number(activa.catedraId),
          nombreMateria: activa.nombre,
          dias: [],
          horaInicio: '',
          horaFin: '',
          tipoClase: '',
          estudiantes: (detalle?.estudiantes || []).map((estudiante) => ({
            id: Number(estudiante.estudianteId || estudiante.id),
            nombre:
              estudiante.nombreCompleto ||
              estudiante.nombre ||
              estudiante.username ||
              'Estudiante',
            presente: false,
            correo: estudiante.correo || estudiante.email || '',
            username: estudiante.username || '',
          })),
        });
      }
    }

    this.materias = nuevasMaterias;
    this.clasesCreadas = nuevasClases;
    this.materiaService.syncMaterias(nuevasMaterias);

    const existeSeleccion = nuevasMaterias.some(
      (materia) => Number(materia.id) === Number(this.materiaSeleccionadaId),
    );

    if (!existeSeleccion && nuevasMaterias.length > 0) {
      this.materiaSeleccionadaId = Number(nuevasMaterias[0].id);
    }

    const activaSeleccionada = this.materiasActivasBackend.find(
      (m) => Number(m.materiaId ?? m.catedraId) === Number(this.materiaSeleccionadaId),
    );
    const primeraClaseSeleccionada = activaSeleccionada?.clases?.[0];

    this.nuevaClase.materiaId = this.materiaSeleccionadaId;
    this.nuevaClase.docenteId = Number(
      activaSeleccionada?.docenteId || this.docenteIdLogueado,
    );
    if (primeraClaseSeleccionada) {
      this.nuevaClase.claseId = Number(primeraClaseSeleccionada.claseId);
    }

    this.actualizarRecursosYActividades();
  }

  /**
   * RF-019: carga desde el backend únicamente las sesiones programadas
   * para la materia actualmente seleccionada.
   */
  cargarSesionesMateriaActual(): void {
    const materiaId = Number(this.materiaSeleccionadaId);
    if (!materiaId || Number.isNaN(materiaId)) {
      this.clasesCreadas = [];
      return;
    }

    this.claseService.getSesionesByMateria(materiaId).subscribe({
      next: (sesiones) => {
        const materia = this.materias.find((m) => Number(m.id) === materiaId);
        const catedraId = this.obtenerCatedraIdPorMateria(materiaId);

        this.clasesCreadas = (sesiones || []).map((sesion) => ({
          id: Number(sesion.id),
          claseId: sesion.claseId != null ? Number(sesion.claseId) : null,
          materiaId: Number(sesion.materiaId),
          catedraId,
          nombreMateria: materia?.nombre || 'Materia',
          dias: [this.obtenerDiaSemana(sesion.fecha)],
          fecha: sesion.fecha,
          horaInicio: sesion.horaInicio,
          horaFin: sesion.horaFin,
          tipoClase: sesion.tipoClase,
          linkVirtual: sesion.linkVirtual || '',
          aplicacionVirtual: sesion.aplicacionVirtual || '',
          edificioPresencial: sesion.edificioPresencial || '',
          aulaPresencial: sesion.aulaPresencial || '',
          pisoPresencial: sesion.pisoPresencial || '',
          observaciones: sesion.observaciones || '',
          estudiantes: [],
        }));

        // Se cargan los estudiantes reales y el estado de asistencia de cada sesión.
        for (const sesion of this.clasesCreadas) {
          this.cargarEstudiantesSesion(sesion.id);
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('No se pudieron cargar las sesiones reales:', error);
        this.clasesCreadas = [];
        this.errorMessage =
          error?.error?.message || 'No se pudieron cargar las sesiones programadas.';
        setTimeout(() => (this.errorMessage = ''), 3500);
        this.cdr.detectChanges();
      },
    });
  }

  private cargarEstudiantesSesion(claseSesionId: number): void {
    this.claseService.getEstudiantesDeSesion(claseSesionId).subscribe({
      next: (respuesta) => {
        const sesion = this.clasesCreadas.find(
          (c) => Number(c.id) === Number(claseSesionId),
        );
        if (!sesion) return;

        sesion.estudiantes = (respuesta?.estudiantes || []).map((estudiante) => ({
          id: Number(estudiante.estudianteId),
          nombre: estudiante.nombre || 'Estudiante',
          correo: estudiante.correo || '',
          presente: estudiante.presente === true,
          asistenciaRegistrada: estudiante.asistenciaRegistrada === true,
          asistenciaId:
            estudiante.asistenciaId == null ? null : Number(estudiante.asistenciaId),
        }));

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(
          `No se pudieron cargar los estudiantes de la sesión ${claseSesionId}:`,
          error,
        );
      },
    });
  }

  private obtenerDiaSemana(fecha: string): string {
    if (!fecha) return '';

    const fechaSolo = String(fecha).split('T')[0];
    const partes = fechaSolo.split('-').map(Number);
    if (partes.length !== 3 || partes.some((p) => Number.isNaN(p))) return '';

    const fechaLocal = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
    const dias = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    return dias[fechaLocal.getDay()] || '';
  }

  private guardarEnStorage() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_DOCENTE_CLASES, JSON.stringify(this.clasesCreadas));
      } catch (e) {
        console.warn('Error saving docente clases', e);
      }
    }
  }

  toggleDia(event: any) {
    const dia = event.target.value;
    if (event.target.checked) {
      if (!this.nuevaClase.diasSeleccionados.includes(dia)) {
        this.nuevaClase.diasSeleccionados.push(dia);
      }
    } else {
      this.nuevaClase.diasSeleccionados = this.nuevaClase.diasSeleccionados.filter(
        (d) => d !== dia,
      );
    }
    this.revisarConflictoHorario();
  }

  guardarClase() {
    const materiaId = Number(this.nuevaClase.materiaId);
    const claseId = Number(this.nuevaClase.claseId);
    const fechaSesion = String(this.nuevaClase.fecha || '').trim();
    const horaInicio = String(this.nuevaClase.horaInicio || '').trim();
    const horaFin = String(this.nuevaClase.horaFin || '').trim();

    if (!materiaId || Number.isNaN(materiaId)) {
      alert('Debes seleccionar una materia válida.');
      return;
    }

    if (!claseId || Number.isNaN(claseId)) {
      alert('No se encontró la clase asociada a esta materia.');
      return;
    }

    if (!fechaSesion) {
      alert('Debes seleccionar la fecha de la sesión.');
      return;
    }

    if (!horaInicio || !horaFin || horaFin <= horaInicio) {
      alert('La hora de finalización debe ser posterior a la hora de inicio.');
      return;
    }

    if (
      this.nuevaClase.tipoClase === 'Virtual' &&
      (!this.nuevaClase.aplicacionVirtual.trim() || !this.nuevaClase.linkVirtual.trim())
    ) {
      alert('Para una clase virtual debes indicar la plataforma y el enlace de acceso.');
      return;
    }

    if (
      this.nuevaClase.tipoClase === 'Presencial' &&
      (!this.nuevaClase.edificioPresencial.trim() ||
        !this.nuevaClase.aulaPresencial.trim() ||
        !this.nuevaClase.pisoPresencial.trim())
    ) {
      alert('Para una clase presencial debes indicar edificio, aula y piso.');
      return;
    }

    // Verificar si hay choque de horario con alumnos.
    this.revisarConflictoHorario();
    if (this.conflictoDetectado) {
      const confirmacion = confirm(
        `⚠️ ADVERTENCIA: Los estudiantes están ocupados en '${this.conflictoDetectado.materiaOcupada}' en este horario.\n¿Estás seguro de que deseas continuar?`,
      );
      if (!confirmacion) return;
    }

    const materiaObj = this.materiaService.getMateriaById(materiaId);
    const nombreMat = materiaObj?.nombre || 'Materia';

    this.claseService
      .createClaseSesion({
        materiaId,
        claseId,
        docenteId: Number(this.nuevaClase.docenteId || this.docenteIdLogueado),
        fecha: fechaSesion,
        horaInicio,
        horaFin,
        tipoClase: this.nuevaClase.tipoClase,
        linkVirtual:
          this.nuevaClase.tipoClase === 'Virtual' ? this.nuevaClase.linkVirtual.trim() : '',
        aplicacionVirtual:
          this.nuevaClase.tipoClase === 'Virtual'
            ? this.nuevaClase.aplicacionVirtual.trim()
            : '',
        edificioPresencial:
          this.nuevaClase.tipoClase === 'Presencial'
            ? this.nuevaClase.edificioPresencial.trim()
            : '',
        aulaPresencial:
          this.nuevaClase.tipoClase === 'Presencial'
            ? this.nuevaClase.aulaPresencial.trim()
            : '',
        pisoPresencial:
          this.nuevaClase.tipoClase === 'Presencial'
            ? this.nuevaClase.pisoPresencial.trim()
            : '',
        observaciones: this.nuevaClase.observaciones.trim(),
      })
      .subscribe({
        next: () => {
          this.successMessage = `¡Clase de ${nombreMat} programada exitosamente!`;
          setTimeout(() => (this.successMessage = ''), 4000);

          // La lista se vuelve a consultar desde el backend para usar el Id real de ClaseSesion.
          this.cargarSesionesMateriaActual();

          this.nuevaClase.fecha = '';
          this.nuevaClase.observaciones = '';
          this.revisarConflictoHorario();
        },
        error: (error) => {
          console.error('No se pudo programar la sesión:', error);
          this.errorMessage =
            error?.error?.message || 'No se pudo programar la sesión de clase.';
          setTimeout(() => (this.errorMessage = ''), 4000);
        },
      });
  }

  // ==========================================
  // ASISTENCIA
  // ==========================================

  busquedaEstudianteAsistencia: string = '';
  filtroEstadoAsistencia: 'todos' | 'presentes' | 'ausentes' = 'todos';

  abrirAsistencia(claseSesionId: number) {
    this.claseAsistenciaId = claseSesionId;
    this.busquedaEstudianteAsistencia = '';
    this.filtroEstadoAsistencia = 'todos';
    this.cargarEstudiantesSesion(claseSesionId);
  }

  cerrarAsistencia() {
    this.claseAsistenciaId = null;
  }

  getEstudiantesFiltradosAsistencia(clase: any): any[] {
    if (!clase || !clase.estudiantes) return [];
    let list = clase.estudiantes;
    if (this.filtroEstadoAsistencia === 'presentes') {
      list = list.filter((e: any) => e.presente);
    } else if (this.filtroEstadoAsistencia === 'ausentes') {
      list = list.filter((e: any) => !e.presente);
    }
    if (this.busquedaEstudianteAsistencia.trim()) {
      const q = this.busquedaEstudianteAsistencia.toLowerCase().trim();
      list = list.filter(
        (e: any) =>
          e.nombre?.toLowerCase().includes(q) || e.correo?.toLowerCase().includes(q),
      );
    }
    return list;
  }

  marcarTodosAsistencia(claseSesionId: number, presente: boolean) {
    const clase = this.clasesCreadas.find((c) => Number(c.id) === Number(claseSesionId));
    if (!clase || !clase.estudiantes) return;

    const pendientes = clase.estudiantes.filter((e) => !e.asistenciaRegistrada);
    if (pendientes.length === 0) {
      this.errorMessage = 'La asistencia de todos los estudiantes ya fue registrada.';
      setTimeout(() => (this.errorMessage = ''), 3000);
      return;
    }

    pendientes.forEach((estudiante) => {
      this.claseService
        .registrarAsistencia(claseSesionId, {
          estudianteId: estudiante.id,
          presente,
        })
        .subscribe({
          next: (registro) => {
            estudiante.presente = registro.presente;
            estudiante.asistenciaRegistrada = true;
            estudiante.asistenciaId = registro.id;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error registrando asistencia:', error);
            this.errorMessage =
              error?.error?.message || 'No se pudo registrar una de las asistencias.';
            setTimeout(() => (this.errorMessage = ''), 3500);
          },
        });
    });
  }

  invertirAsistencia(claseSesionId: number) {
    const clase = this.clasesCreadas.find((c) => Number(c.id) === Number(claseSesionId));
    if (!clase) return;

    if (clase.estudiantes.some((e) => e.asistenciaRegistrada)) {
      this.errorMessage =
        'No se puede invertir una asistencia ya registrada porque el backend evita registros duplicados.';
      setTimeout(() => (this.errorMessage = ''), 3500);
      return;
    }

    clase.estudiantes.forEach((e) => (e.presente = !e.presente));
  }

  toggleAsistencia(claseSesionId: number, estudianteId: number) {
    const clase = this.clasesCreadas.find(
      (c) => Number(c.id) === Number(claseSesionId),
    );
    if (!clase) return;

    const estudiante = clase.estudiantes.find(
      (e) => Number(e.id) === Number(estudianteId),
    );
    if (!estudiante) return;

    if (estudiante.asistenciaRegistrada) {
      this.errorMessage =
        'La asistencia de este estudiante ya fue registrada para esta sesión.';
      setTimeout(() => (this.errorMessage = ''), 3000);
      return;
    }

    const nuevoEstado = !estudiante.presente;

    this.claseService
      .registrarAsistencia(claseSesionId, {
        estudianteId,
        presente: nuevoEstado,
      })
      .subscribe({
        next: (registro) => {
          estudiante.presente = registro.presente;
          estudiante.asistenciaRegistrada = true;
          estudiante.asistenciaId = registro.id;
          this.successMessage = 'Asistencia registrada correctamente.';
          setTimeout(() => (this.successMessage = ''), 2500);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('No se pudo registrar la asistencia:', error);
          this.errorMessage =
            error?.error?.message || 'No se pudo registrar la asistencia.';
          setTimeout(() => (this.errorMessage = ''), 3500);
        },
      });
  }

  getClaseById(id: number): ClaseCreada | undefined {
    return this.clasesCreadas.find((c) => c.id === id);
  }

  contarPresentes(clase: any): number {
    if (!clase || !clase.estudiantes) return 0;
    return clase.estudiantes.filter((e: any) => e.presente).length;
  }

  contarTotal(clase: any): number {
    if (!clase || !clase.estudiantes) return 0;
    return clase.estudiantes.length;
  }

  calcularPorcentajeAsistencia(estudianteId: number, materiaId: number): string {
    const clasesDeMateria = this.clasesCreadas.filter((c) => c.materiaId === materiaId);
    if (clasesDeMateria.length === 0) return '0%';

    let presentes = 0;
    for (const clase of clasesDeMateria) {
      const estudiante = clase.estudiantes.find((e) => e.id === estudianteId);
      if (estudiante && estudiante.presente) {
        presentes++;
      }
    }
    return Math.round((presentes / clasesDeMateria.length) * 100) + '%';
  }

  /**
   * Elimina un estudiante de la clase conectándolo a DELETE /api/Clase/{claseId}/estudiantes/{estudianteId}
   */
  eliminarEstudiante(claseId: number, estudianteId: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!confirm('¿Estás seguro de que deseas eliminar este estudiante de la clase?')) {
      return;
    }

    const clase = this.clasesCreadas.find((c) => Number(c.id) === Number(claseId));
    const claseRealId = Number(clase?.claseId || claseId);
    if (clase && clase.estudiantes) {
      clase.estudiantes = clase.estudiantes.filter((e) => e.id !== estudianteId);
    }

    this.claseService.eliminarEstudiante(claseRealId, estudianteId).subscribe({
      next: () => {
        this.successMessage = 'Estudiante eliminado de la clase exitosamente.';
        setTimeout(() => (this.successMessage = ''), 4000);
      },
      error: () => {
        this.successMessage = 'Estudiante eliminado de la clase.';
        setTimeout(() => (this.successMessage = ''), 4000);
      },
    });
  }

  abrirAgregarEstudianteAClase() {
    this.mostrarModalAgregarEstudiante = true;
  }

  cerrarAgregarEstudianteAClase() {
    this.mostrarModalAgregarEstudiante = false;
    this.nuevoEstudianteClase = {
      nombre: '',
      correo: '',
      cedula: '',
      matricula: '',
    };
  }

  guardarEstudianteEnClase(claseId: number) {
    if (!this.nuevoEstudianteClase.nombre.trim() || !this.nuevoEstudianteClase.correo.trim()) {
      alert('Por favor ingresa el nombre y correo institucional del estudiante.');
      return;
    }

    const nombre = this.nuevoEstudianteClase.nombre.trim();
    const correo = this.nuevoEstudianteClase.correo.trim();
    const username = correo.includes('@')
      ? correo.split('@')[0]
      : nombre.toLowerCase().replace(/\s+/g, '.');
    const tempPassword = `Uteq${new Date().getFullYear()}*`;

    const nuevoId = Date.now();
    const clase = this.clasesCreadas.find((c) => Number(c.id) === Number(claseId));
    if (clase) {
      if (!clase.estudiantes) clase.estudiantes = [];
      clase.estudiantes.push({
        id: nuevoId,
        nombre,
        correo,
        presente: true,
        username,
      });
      this.guardarEnStorage();
    }

    // Agregar al Directorio General Institucional
    this.directorioService.agregarEstudiante({
      nombre,
      correo,
      username,
      cedula:
        this.nuevoEstudianteClase.cedula || `17${Math.floor(10000000 + Math.random() * 90000000)}`,
      matricula:
        this.nuevoEstudianteClase.matricula || `2024-EST-${Math.floor(100 + Math.random() * 900)}`,
      estado: 'Regular',
    });

    // Emitir la recarga de datos en el servicio del Directorio (cargarDirectorio())
    this.directorioService.cargarDirectorio().subscribe();

    // Notificación de Credenciales en Pantalla
    const notifMsg = `Estudiante registrado. Usuario: ${username} | Clave Temporal: ${tempPassword}`;
    this.credencialesNotificacion = {
      mostrar: true,
      mensaje: notifMsg,
      username,
      tempPassword,
    };
    this.successMessage = notifMsg;

    this.cerrarAgregarEstudianteAClase();
  }

  copiarCredenciales() {
    const texto = `Estudiante registrado. Usuario: ${this.credencialesNotificacion.username} | Clave Temporal: ${this.credencialesNotificacion.tempPassword}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(texto);
      this.copiadoCredenciales = true;
      setTimeout(() => (this.copiadoCredenciales = false), 3000);
    }
  }

  cerrarCredencialesNotificacion() {
    this.credencialesNotificacion.mostrar = false;
  }

  // ==========================================
  // RECURSOS Y ACTIVIDADES (OPCIONES DEL AYUDANTE)
  // ==========================================

  actualizarRecursosYActividades() {
    const materiaId = Number(this.materiaSeleccionadaId);

    if (!materiaId) {
      this.recursosMateria = [];
      this.actividadesMateria = [];
      return;
    }

    // RF-017: cargar siempre los recursos reales desde el backend.
    this.materiaService.getRecursosByMateria(materiaId).subscribe({
      next: (recursos) => {
        this.recursosMateria = Array.isArray(recursos) ? recursos : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar recursos de la materia:', err);
        this.recursosMateria = [];
        this.cdr.detectChanges();
      },
    });

    // RF-017: cargar siempre las actividades reales desde el backend.
    this.materiaService.getActividadesByMateria(materiaId).subscribe({
      next: (actividades) => {
        this.actividadesMateria = Array.isArray(actividades) ? actividades : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar actividades de la materia:', err);
        this.actividadesMateria = [];
        this.cdr.detectChanges();
      },
    });
  }

  onArchivoRecursoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.archivoRecurso = {
        nombre: file.name,
        tamanoKb: Math.round(file.size / 1024),
        dataUrl: reader.result as string,
      };
      if (!this.nuevoRecurso.titulo.trim()) {
        this.nuevoRecurso.titulo = file.name.replace(/\.[^/.]+$/, '');
      }
    };
    reader.readAsDataURL(file);

    // Intentar subir el archivo al backend y usar la URL devuelta
    try {
      this.materiaService.uploadRecurso(this.materiaSeleccionadaId, file).subscribe({
        next: (res) => {
          if (res?.url) {
            this.nuevoRecurso.url = res.url;
            this.mostrarMensajeExito(
              'Archivo subido correctamente. La URL fue añadida al recurso.',
            );
          }
          if (res?.key) {
            // opcional: guardar key localmente en archivoRecurso
            (this.archivoRecurso as any).storageKey = res.key;
          }
        },
        error: () => {
          // Silenciar error de upload (backend puede no estar disponible en dev)
        },
      });
    } catch (e) {
      // noop
    }
  }

  quitarArchivoRecurso(): void {
    this.archivoRecurso = null;
  }

  onArchivoActividadChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.archivoActividad = {
        nombre: file.name,
        tamanoKb: Math.round(file.size / 1024),
        dataUrl: reader.result as string,
      };
      if (!this.nuevaActividad.titulo.trim()) {
        this.nuevaActividad.titulo = file.name.replace(/\.[^/.]+$/, '');
      }
    };
    reader.readAsDataURL(file);
  }

  quitarArchivoActividad(): void {
    this.archivoActividad = null;
  }

  descargarRecursoDocumento(rec: RecursoDto): void {
    if (rec.archivoDataUrl) {
      this.descargaService.descargarArchivo(
        rec.nombreArchivo || `${rec.titulo}.pdf`,
        rec.archivoDataUrl,
      );
      return;
    }
    // Generar documento oficial descargable con los datos del recurso
    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${rec.titulo} - UTEQ</title>
<style>body{font-family:sans-serif;padding:30px;line-height:1.6;color:#1e293b;}</style>
</head>
<body>
  <div style="border-bottom:2px solid #047857;padding-bottom:10px;margin-bottom:20px;">
    <h2 style="color:#065f46;margin:0;">Universidad Técnica Estatal de Quevedo (UTEQ)</h2>
    <h4 style="color:#475569;margin:4px 0 0 0;">Material Académico de Cátedra · SIGAC</h4>
  </div>
  <h3 style="color:#0f172a;">${rec.titulo}</h3>
  <p><strong>Tipo:</strong> ${rec.tipo} | <strong>Fecha:</strong> ${rec.fechaCreacion || '2026'} | <strong>Publicado por:</strong> ${rec.creadoPor || 'Docente'}</p>
  <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:15px;border-radius:8px;margin:15px 0;">
    <p>${rec.descripcion || 'Sin descripción detallada.'}</p>
    <p><strong>Enlace oficial:</strong> <a href="${rec.url}">${rec.url}</a></p>
  </div>
  <p style="font-size:11px;color:#64748b;">Descargado desde el repositorio institucional SIGAC - UTEQ.</p>
</body>
</html>`;
    this.descargaService.descargarArchivo(`${rec.titulo.replace(/\s+/g, '_')}_UTEQ.html`, html);
  }

  descargarActividadDocumento(act: ActividadDto): void {
    if (act.archivoDataUrl) {
      this.descargaService.descargarArchivo(
        act.nombreArchivo || `${act.titulo}.pdf`,
        act.archivoDataUrl,
      );
      return;
    }
    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${act.titulo} - UTEQ</title>
<style>body{font-family:sans-serif;padding:30px;line-height:1.6;color:#1e293b;}</style>
</head>
<body>
  <div style="border-bottom:2px solid #047857;padding-bottom:10px;margin-bottom:20px;">
    <h2 style="color:#065f46;margin:0;">Universidad Técnica Estatal de Quevedo (UTEQ)</h2>
    <h4 style="color:#475569;margin:4px 0 0 0;">Guía de Actividad Pedagógica y Taller · SIGAC</h4>
  </div>
  <h3 style="color:#0f172a;">${act.titulo}</h3>
  <p><strong>Tipo:</strong> ${act.tipo} | <strong>Fecha Límite de Entrega:</strong> ${act.fechaEntrega}</p>
  <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:15px;border-radius:8px;margin:15px 0;">
    <h4>Instrucciones y Rúbrica:</h4>
    <p>${act.descripcion || 'Realizar la actividad y subir el entregable conforme a las directrices de la cátedra.'}</p>
  </div>
  <p style="font-size:11px;color:#64748b;">Documento de evaluación formativa emitido por la Carrera de Ingeniería de Software - UTEQ.</p>
</body>
</html>`;
    this.descargaService.descargarArchivo(
      `${act.titulo.replace(/\s+/g, '_')}_Guia_UTEQ.html`,
      html,
    );
  }

  crearRecursoPedagogico() {
    if (!this.nuevoRecurso.titulo.trim()) {
      alert('Ingresa el título del recurso pedagógico.');
      return;
    }

    this.isLoading = true;

    const rawLinks = (this.nuevoRecurso as any).linksString || '';
    const links = rawLinks
      .split(/\r?\n|,/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    this.materiaService
      .addRecurso(this.materiaSeleccionadaId, {
        titulo: this.nuevoRecurso.titulo.trim(),
        materiaId: this.materiaSeleccionadaId,
        url: this.nuevoRecurso.url.trim() || 'https://repositorio.uteq.edu.ec/material.pdf',
        tipo: this.nuevoRecurso.tipo,
        esEsencial: this.nuevoRecurso.esEsencial,
        descripcion: this.nuevoRecurso.descripcion.trim(),
        temaNombre: this.nuevoRecurso.temaNombre,
        nombreArchivo: this.archivoRecurso?.nombre,
        archivoDataUrl: this.archivoRecurso?.dataUrl,
        tamanoArchivoKb: this.archivoRecurso?.tamanoKb,
        links: links,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.actualizarRecursosYActividades();
          this.successMessage =
            '¡Recurso pedagógico publicado exitosamente con su archivo adjunto para los alumnos y el ayudante!';
          setTimeout(() => (this.successMessage = ''), 4000);
          this.nuevoRecurso.titulo = '';
          this.nuevoRecurso.descripcion = '';
          (this.nuevoRecurso as any).linksString = '';
          this.archivoRecurso = null;
        },
        error: () => {
          this.isLoading = false;
          this.actualizarRecursosYActividades();
        },
      });
  }

  crearActividadPedagogica() {
    if (!this.nuevaActividad.titulo.trim()) {
      alert('Ingresa el título de la actividad o taller.');
      return;
    }

    this.isLoading = true;
    this.materiaService
      .addActividad(this.materiaSeleccionadaId, {
        titulo: this.nuevaActividad.titulo.trim(),
        descripcion:
          this.nuevaActividad.descripcion.trim() || 'Actividad asignada por el docente titular.',
        fechaEntrega: this.nuevaActividad.fechaEntrega || '2026-09-30',
        tipo: this.nuevaActividad.tipo,
        materiaId: this.materiaSeleccionadaId,
        nombreArchivo: this.archivoActividad?.nombre,
        archivoDataUrl: this.archivoActividad?.dataUrl,
        tamanoArchivoKb: this.archivoActividad?.tamanoKb,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.actualizarRecursosYActividades();
          this.successMessage =
            '¡Actividad creada exitosamente con sus documentos adjuntos! Los alumnos ya pueden consultar la guía.';
          setTimeout(() => (this.successMessage = ''), 4000);
          this.nuevaActividad.titulo = '';
          this.nuevaActividad.descripcion = '';
          this.archivoActividad = null;
        },
        error: () => {
          this.isLoading = false;
          this.actualizarRecursosYActividades();
        },
      });
  }

  toggleRecursoEsencial(recursoId?: number) {
    if (!recursoId) return;
    this.materiaService.toggleRecursoEsencial(recursoId);
    this.actualizarRecursosYActividades();
  }

  eliminarRecurso(recursoId?: number) {
    if (!recursoId) return;
    if (confirm('¿Deseas eliminar este recurso?')) {
      this.materiaService.deleteRecurso(recursoId);
      this.actualizarRecursosYActividades();
    }
  }
  abrirModalCrearEvaluacionDiagnostica(): void {
    this.errorMessage = '';
    this.mostrarModalCrearDiagnostica = true;
  }

  cerrarModalCrearEvaluacionDiagnostica(): void {
    this.mostrarModalCrearDiagnostica = false;
    this.errorMessage = '';
  }

  cerrarModalRevisionDiagnostica(): void {
    this.mostrarModalRevisionDiagnostica = false;
    this.resultadoDiagnosticoSeleccionado = null;
    this.errorMessage = '';
  }

  seleccionarResultadoDiagnostico(resultado: ResultadoDiagnosticoFormulario): void {
    this.resultadoDiagnosticoSeleccionado = resultado;
    this.errorMessage = '';
  }

  agregarPreguntaDiagnostica(): void {
    const pregunta = this.nuevaPreguntaCuestionario.trim();

    if (!pregunta) {
      this.errorMessage = 'Escribe la pregunta antes de agregarla.';
      this.cdr.detectChanges();
      return;
    }

    const siguienteId =
      this.preguntasNuevaEvaluacion.length > 0
        ? Math.max(...this.preguntasNuevaEvaluacion.map((p) => Number(p.id) || 0)) + 1
        : 1;

    this.preguntasNuevaEvaluacion.push({
      id: siguienteId,
      pregunta,
      tipo: 'Texto',
    });

    this.nuevaPreguntaCuestionario = '';
    this.errorMessage = '';
  }

  eliminarPreguntaDiagnostica(indice: number): void {
    this.preguntasNuevaEvaluacion.splice(indice, 1);

    this.preguntasNuevaEvaluacion = this.preguntasNuevaEvaluacion.map((pregunta, index) => ({
      ...pregunta,
      id: index + 1,
    }));
  }

  cambiarTipoEvaluacionDiagnostica(tipo: 'Archivo' | 'Cuestionario'): void {
    this.nuevaEvaluacionDiagnostica.tipoEvaluacion = tipo;

    if (tipo === 'Archivo') {
      this.preguntasNuevaEvaluacion = [];
      this.nuevaPreguntaCuestionario = '';
    }
  }

  obtenerPreguntasCuestionario(
    evaluacion: EvaluacionDto | null = this.evaluacionDiagnosticaSeleccionada,
  ): PreguntaCuestionarioDto[] {
    if (!evaluacion?.preguntasCuestionario) {
      return [];
    }

    try {
      const preguntas = JSON.parse(evaluacion.preguntasCuestionario);

      return Array.isArray(preguntas)
        ? preguntas.map((pregunta: any, index: number) => ({
          id: Number(pregunta?.id) || index + 1,
          pregunta: String(pregunta?.pregunta || ''),
          tipo: String(pregunta?.tipo || 'Texto'),
        }))
        : [];
    } catch (error) {
      console.error('No se pudieron interpretar las preguntas del cuestionario:', error);
      return [];
    }
  }

  obtenerRespuestasCuestionario(
    resultado: ResultadoDiagnosticoFormulario,
  ): RespuestaCuestionarioVisual[] {
    if (resultado.respuestas.length > 0) {
      return resultado.respuestas;
    }

    if (!resultado.respuestasCuestionario) {
      return [];
    }

    return this.parsearRespuestasCuestionario(resultado.respuestasCuestionario);
  }

  obtenerTextoPregunta(preguntaId: number): string {
    const pregunta = this.obtenerPreguntasCuestionario().find(
      (item) => Number(item.id) === Number(preguntaId),
    );

    return pregunta?.pregunta || `Pregunta ${preguntaId}`;
  }

  abrirArchivoEntrega(resultado: ResultadoDiagnosticoFormulario): void {
    if (!resultado.archivoEntregaUrl || typeof window === 'undefined') {
      return;
    }

    window.open(this.construirUrlBackend(resultado.archivoEntregaUrl), '_blank', 'noopener,noreferrer');
  }

  abrirArchivoDocente(evaluacion: EvaluacionDto): void {
    if (!evaluacion.archivoDocenteUrl || typeof window === 'undefined') {
      return;
    }

    window.open(this.construirUrlBackend(evaluacion.archivoDocenteUrl), '_blank', 'noopener,noreferrer');
  }

  seleccionarEvaluacionDiagnostica(evaluacion: EvaluacionDto): void {
    if (!evaluacion.id) {
      return;
    }

    const catedraId = this.catedraSeleccionadaId;

    if (!catedraId) {
      this.errorMessage = 'No se pudo identificar la cátedra.';
      this.cdr.detectChanges();
      return;
    }

    this.evaluacionDiagnosticaSeleccionada = evaluacion;
    this.resultadosDiagnosticosFormulario = [];
    this.resultadoDiagnosticoSeleccionado = null;
    this.resumenEvaluacionDiagnostica = null;
    this.mostrarModalRevisionDiagnostica = true;
    this.cargandoResultadosDiagnosticos = true;
    this.errorMessage = '';

    this.docenteService.obtenerResultadosEvaluacionDiagnostica(catedraId, evaluacion.id).subscribe({
      next: (respuesta) => {
        this.cargandoResultadosDiagnosticos = false;

        if (respuesta?.evaluacion) {
          this.evaluacionDiagnosticaSeleccionada = {
            ...evaluacion,
            ...respuesta.evaluacion,
          };
        }

        const resultadosGuardados = Array.isArray(respuesta?.resultados)
          ? respuesta.resultados
          : [];

        this.resultadosDiagnosticosFormulario = resultadosGuardados
          .filter(
            (resultado) =>
              resultado.fechaEntrega != null ||
              !!resultado.archivoEntregaUrl ||
              !!resultado.respuestasCuestionario ||
              resultado.calificacion != null ||
              resultado.estado === 'Entregado' ||
              resultado.estado === 'Calificado',
          )
          .map((resultado) => ({
            estudianteId: Number(resultado.estudianteId),
            nombreEstudiante: resultado.nombreEstudiante || 'Estudiante',
            calificacion:
              resultado.calificacion === null || resultado.calificacion === undefined
                ? null
                : Number(resultado.calificacion),
            observacion: resultado.observacion || '',
            estado: resultado.estado || 'Pendiente',
            archivoEntregaUrl: resultado.archivoEntregaUrl ?? null,
            fechaEntrega: resultado.fechaEntrega ?? null,
            respuestasCuestionario: resultado.respuestasCuestionario ?? null,
            respuestas: this.parsearRespuestasCuestionario(resultado.respuestasCuestionario),
          }));

        this.resultadoDiagnosticoSeleccionado =
          this.resultadosDiagnosticosFormulario.length > 0
            ? this.resultadosDiagnosticosFormulario[0]
            : null;

        this.resumenEvaluacionDiagnostica = respuesta?.resumen || null;
        this.cdr.detectChanges();
      },

      error: (error) => {
        this.cargandoResultadosDiagnosticos = false;
        console.error('Error cargando resultados diagnósticos:', error);
        this.errorMessage =
          error?.error?.message || 'No se pudieron cargar los resultados diagnósticos.';
        this.cdr.detectChanges();
      },
    });
  }

  guardarResultadosDiagnosticos(): void {
    const catedraId = this.catedraSeleccionadaId;
    const evaluacionId = this.evaluacionDiagnosticaSeleccionada?.id;

    if (!catedraId || !evaluacionId) {
      this.errorMessage = 'Selecciona una evaluación diagnóstica.';
      this.cdr.detectChanges();
      return;
    }

    if (this.resultadosDiagnosticosFormulario.length === 0) {
      this.errorMessage = 'Aún no existen entregas para esta evaluación diagnóstica.';
      this.cdr.detectChanges();
      return;
    }

    const resultadosConCalificacion = this.resultadosDiagnosticosFormulario.filter(
      (resultado) =>
        resultado.calificacion !== null && resultado.calificacion !== undefined,
    );

    if (resultadosConCalificacion.length === 0) {
      this.errorMessage = 'Ingresa al menos una calificación antes de guardar.';
      this.cdr.detectChanges();
      return;
    }

    const notasInvalidas = resultadosConCalificacion.some(
      (resultado) =>
        Number(resultado.calificacion) < 0 || Number(resultado.calificacion) > 10,
    );

    if (notasInvalidas) {
      this.errorMessage = 'Las calificaciones diagnósticas deben estar entre 0 y 10.';
      this.cdr.detectChanges();
      return;
    }

    const payload: RegistrarResultadosDiagnosticosDto = {
      resultados: resultadosConCalificacion.map((resultado) => ({
        estudianteId: resultado.estudianteId,
        calificacion: Number(resultado.calificacion),
        observacion: resultado.observacion.trim(),
      })),
    };

    this.guardandoResultadosDiagnosticos = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.docenteService
      .guardarResultadosEvaluacionDiagnostica(catedraId, evaluacionId, payload)
      .subscribe({
        next: (respuesta) => {
          this.guardandoResultadosDiagnosticos = false;

          this.resultadosDiagnosticosFormulario = this.resultadosDiagnosticosFormulario.map(
            (resultado) =>
              resultado.calificacion !== null && resultado.calificacion !== undefined
                ? { ...resultado, estado: 'Calificado' }
                : resultado,
          );

          if (this.resultadoDiagnosticoSeleccionado) {
            const estudianteSeleccionadoId = this.resultadoDiagnosticoSeleccionado.estudianteId;
            this.resultadoDiagnosticoSeleccionado =
              this.resultadosDiagnosticosFormulario.find(
                (resultado) => resultado.estudianteId === estudianteSeleccionadoId,
              ) || null;
          }

          this.resumenEvaluacionDiagnostica = {
            estudiantesEvaluados: respuesta.estudiantesEvaluados,
            promedioDiagnostico: respuesta.promedioDiagnostico,
            calificacionMinima: respuesta.calificacionMinima,
            calificacionMaxima: respuesta.calificacionMaxima,
            afectaPromedioAcademico: respuesta.afectaPromedioAcademico,
          };

          this.successMessage =
            'Resultados diagnósticos guardados correctamente. No afectan el promedio académico.';

          this.cdr.detectChanges();

          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 4000);
        },

        error: (error) => {
          this.guardandoResultadosDiagnosticos = false;
          console.error('Error guardando resultados diagnósticos:', error);
          this.errorMessage =
            error?.error?.message || 'No se pudieron guardar los resultados diagnósticos.';
          this.cdr.detectChanges();
        },
      });
  }

  crearEvaluacionDiagnostica(): void {
    const catedraId = this.catedraSeleccionadaId;

    if (!catedraId) {
      this.errorMessage =
        'No se pudo identificar la cátedra correspondiente a la materia seleccionada.';
      this.cdr.detectChanges();
      return;
    }

    const nombre = this.nuevaEvaluacionDiagnostica.nombre.trim();

    if (!nombre) {
      this.errorMessage = 'Ingresa el nombre de la evaluación diagnóstica.';
      this.cdr.detectChanges();
      return;
    }

    if (
      !this.nuevaEvaluacionDiagnostica.fechaInicio ||
      !this.nuevaEvaluacionDiagnostica.fechaFin
    ) {
      this.errorMessage = 'Debes indicar la fecha de inicio y la fecha de finalización.';
      this.cdr.detectChanges();
      return;
    }

    const fechaInicio = new Date(this.nuevaEvaluacionDiagnostica.fechaInicio);
    const fechaFin = new Date(this.nuevaEvaluacionDiagnostica.fechaFin);

    if (
      Number.isNaN(fechaInicio.getTime()) ||
      Number.isNaN(fechaFin.getTime()) ||
      fechaFin <= fechaInicio
    ) {
      this.errorMessage = 'La fecha de finalización debe ser posterior a la fecha de inicio.';
      this.cdr.detectChanges();
      return;
    }

    const tipoEvaluacion = this.nuevaEvaluacionDiagnostica.tipoEvaluacion;

    if (tipoEvaluacion === 'Cuestionario' && this.preguntasNuevaEvaluacion.length === 0) {
      this.errorMessage = 'Agrega al menos una pregunta al cuestionario.';
      this.cdr.detectChanges();
      return;
    }

    const payload: EvaluacionDto = {
      nombre,
      catedraId,
      esDiagnostica: true,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      tipoEvaluacion,
      instrucciones: this.nuevaEvaluacionDiagnostica.instrucciones.trim(),
      archivoDocenteUrl: this.nuevaEvaluacionDiagnostica.archivoDocenteUrl.trim() || null,
      preguntasCuestionario:
        tipoEvaluacion === 'Cuestionario'
          ? JSON.stringify(this.preguntasNuevaEvaluacion)
          : null,
    };

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.docenteService.registrarEvaluacionDiagnostica(catedraId, payload).subscribe({
      next: (evaluacion) => {
        this.isLoading = false;
        this.evaluacionesDiagnosticas.unshift(evaluacion);

        this.successMessage =
          '¡Evaluación diagnóstica registrada correctamente! No afecta el promedio académico.';

        this.nuevaEvaluacionDiagnostica = {
          nombre: '',
          instrucciones: '',
          tipoEvaluacion: 'Archivo',
          fechaInicio: '',
          fechaFin: '',
          archivoDocenteUrl: '',
        };

        this.preguntasNuevaEvaluacion = [];
        this.nuevaPreguntaCuestionario = '';
        this.mostrarModalCrearDiagnostica = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 4000);
      },

      error: (error) => {
        this.isLoading = false;
        console.error('Error al registrar evaluación diagnóstica:', error);
        this.errorMessage =
          error?.error?.message || 'No se pudo registrar la evaluación diagnóstica.';
        this.cdr.detectChanges();
      },
    });
  }

  cargarEvaluacionesDiagnosticas(
    materiaId: number = this.materiaSeleccionadaId,
  ): void {
    // IMPORTANTE: primero tomamos la materia seleccionada en el SELECT
    // y luego buscamos el catedraId que le corresponde.
    const materiaIdSeleccionada = Number(materiaId);
    const catedraId = this.obtenerCatedraIdPorMateria(materiaIdSeleccionada);

    if (!catedraId) {
      this.evaluacionesDiagnosticas = [];
      this.evaluacionDiagnosticaSeleccionada = null;
      this.resultadosDiagnosticosFormulario = [];
      this.resultadoDiagnosticoSeleccionado = null;
      this.resumenEvaluacionDiagnostica = null;
      this.mostrarModalCrearDiagnostica = false;
      this.mostrarModalRevisionDiagnostica = false;
      return;
    }

    this.docenteService.obtenerEvaluacionesDiagnosticas(catedraId).subscribe({
      next: (evaluaciones) => {
        this.evaluacionesDiagnosticas = Array.isArray(evaluaciones) ? evaluaciones : [];
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Error cargando evaluaciones diagnósticas:', error);
        this.evaluacionesDiagnosticas = [];
        this.cdr.detectChanges();
      },
    });
  }

  private parsearRespuestasCuestionario(
    raw: string | null | undefined,
  ): RespuestaCuestionarioVisual[] {
    if (!raw) {
      return [];
    }

    try {
      const respuestas = JSON.parse(raw);

      return Array.isArray(respuestas)
        ? respuestas.map((respuesta: any, index: number) => ({
          preguntaId: Number(respuesta?.preguntaId) || index + 1,
          respuesta: String(respuesta?.respuesta || ''),
        }))
        : [];
    } catch (error) {
      console.error('No se pudieron interpretar las respuestas del cuestionario:', error);
      return [];
    }
  }

  private construirUrlBackend(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const base = getApiBase().replace(/\/$/, '');
    const ruta = url.startsWith('/') ? url : `/${url}`;

    return `${base}${ruta}`;
  }

  private mostrarMensajeExito(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => (this.successMessage = ''), 4000);
  }
}

