import { ApplicationRef, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, map, of, take, timeout } from 'rxjs';

import {
  CatedraResumenDto,
  ClaseDocenteDto,
  DocenteService,
  EstudianteClaseDocenteDto,
  ExpedienteDto,
  IndicadorCualitativoDto,
  MatricularEstudianteDto,
} from '../../../services/docente.service';
import { ClaseDto, ClaseService } from '../../../services/clase.service';
import { AuthService } from '../../../services/auth.service';

interface EstudianteMasivo {
  nombre: string;
  apellido: string;
  correo: string;
  cedula?: string;
}

@Component({
  selector: 'app-gestion-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-estudiantes.html',
})
export class GestionEstudiantesComponent implements OnInit {
  clases: ClaseDocenteDto[] = [];
  claseSeleccionadaId = 0;
  claseSeleccionada: ClaseDocenteDto | null = null;
  estudiantes: EstudianteClaseDocenteDto[] = [];
  private estudianteObjetivoId = 0;
  busqueda = '';

  filtroEstado: 'todos' | 'riesgo' | 'sin-alerta' = 'todos';

  orden: 'nombre-asc' | 'nombre-desc' | 'nota-desc' | 'nota-asc' = 'nombre-asc';

  tabActiva: 'nomina' | 'matriculacion' = 'nomina';

  subTabMatricula: 'individual' | 'masiva' = 'individual';

  nuevoEstudiante: MatricularEstudianteDto = {
    nombre: '',
    apellido: '',
    correo: '',
    cedula: '',
  };

  textoCargaMasiva = '';
  estudiantesParseados: EstudianteMasivo[] = [];

  modalExpediente = false;

  estudianteDetalle: EstudianteClaseDocenteDto | null = null;

  expedienteDetalle: ExpedienteDto | null = null;

  catedrasEstudiante: CatedraResumenDto[] = [];

  catedraIndicadorId = 0;

  indicadorSeleccionado = '';
  observacionIndicador = '';

  isLoading = false;
  cargandoExpediente = false;
  guardandoIndicador = false;

  successMessage = '';
  errorMessage = '';
  errorExpediente = '';

  constructor(
    private docenteService: DocenteService,
    private claseService: ClaseService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const queryClaseId = Number(params.get('claseId') || 0);
      const pathClaseId = Number(this.route.snapshot.paramMap.get('id') || 0);
      const claseId = queryClaseId || pathClaseId;

      const estudianteId = Number(params.get('abrirEstudiante') || 0);

      if (estudianteId) {
        this.estudianteObjetivoId = estudianteId;
      }

      if (this.clases.length === 0) {
        this.cargarClases(claseId || undefined);
        return;
      }

      if (claseId) {
        this.seleccionarClase(claseId);
      }
    });
  }

  // =========================================================
  // REFRESCAR VISTA
  // =========================================================

  private refrescarVista(): void {
    this.cdr.markForCheck();

    setTimeout(() => {
      this.cdr.markForCheck();
      this.appRef.tick();
    }, 0);
  }

  // =========================================================
  // ROL DE USUARIO
  // =========================================================

  private esAdministrador(): boolean {
    const rol = (this.authService.getRol() || this.authService.getRole() || '').toLowerCase();
    const roles = this.authService.getRoles().map(r => r.toLowerCase());
    return rol.includes('admin') || roles.some(r => r.includes('admin')) || this.router.url.includes('/admin/');
  }

  // =========================================================
  // CLASES
  // =========================================================

  cargarClases(mantenerClaseId?: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.refrescarVista();

    const queryClaseId = Number(this.route.snapshot.queryParamMap.get('claseId') || this.route.snapshot.paramMap.get('id') || 0);
    const idDeseadoInicial = Number(mantenerClaseId || queryClaseId || 0);

    const obsClases$ = this.esAdministrador()
      ? this.claseService.getClases().pipe(
          map((clasesAdmin: ClaseDto[]) => {
            return (clasesAdmin || []).map((c: any, index: number): ClaseDocenteDto => ({
              id: Number(c.id || c.claseId || index + 1),
              claseId: Number(c.id || c.claseId || index + 1),
              nombre: c.nombre || `Clase ${index + 1}`,
              materiaId: Number(c.materiaId || 0),
              materia: c.materiaNombre || c.nombre || 'Materia Asignada',
              nombreMateria: c.materiaNombre || c.nombre || 'Materia Asignada',
              codigoMateria: c.codigo || c.codigoMateria || `COD-${index + 1}`,
              docenteId: Number(c.docenteId || 0),
              docente: c.docenteNombre || 'Docente',
              docenteNombre: c.docenteNombre || 'Docente',
              docenteEmail: c.docenteEmail || '',
              estudiantesCount: Array.isArray(c.estudianteIds) ? c.estudianteIds.length : (Array.isArray(c.estudiantes) ? c.estudiantes.length : 0),
              estudianteIds: c.estudianteIds || [],
              estudiantes: Array.isArray(c.estudiantes) ? this.mapearEstudiantes(c.estudiantes) : []
            }));
          })
        )
      : this.docenteService.getClasesDocente();

    obsClases$
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: (data) => {
          this.clases = Array.isArray(data) ? data : [];
          this.isLoading = false;

          if (this.clases.length === 0) {
            this.claseSeleccionadaId = 0;
            this.claseSeleccionada = null;
            this.estudiantes = [];
            this.refrescarVista();
            return;
          }

          const primerId = Number(this.clases[0].claseId || this.clases[0].id);
          const targetId = idDeseadoInicial > 0 && this.clases.some(c => Number(c.claseId || c.id) === idDeseadoInicial)
            ? idDeseadoInicial
            : primerId;

          this.seleccionarClase(targetId);
          this.refrescarVista();
        },

        error: (err) => {
          console.error('ERROR CARGANDO CLASES:', err);

          this.isLoading = false;
          this.clases = [];
          this.claseSeleccionadaId = 0;
          this.claseSeleccionada = null;
          this.estudiantes = [];

          if (err?.name === 'TimeoutError') {
            this.errorMessage = 'El servidor tardó demasiado en responder.';
          } else {
            this.errorMessage = this.obtenerMensajeError(
              err,
              'No se pudieron cargar las clases asignadas.',
            );
          }

          this.refrescarVista();
        },
      });
  }

  seleccionarClase(claseId: number): void {
    this.claseSeleccionadaId = Number(claseId);

    const clase = this.clases.find(
      (item) => Number(item.claseId || item.id) === this.claseSeleccionadaId,
    );

    if (!clase) {
      this.claseSeleccionada = null;
      this.estudiantes = [];
      this.refrescarVista();
      return;
    }

    this.claseSeleccionada = clase;

    if (Array.isArray(clase.estudiantes) && clase.estudiantes.length > 0) {
      this.estudiantes = this.mapearEstudiantes(clase.estudiantes);
    } else {
      this.estudiantes = [];
    }

    this.refrescarVista();
    this.cargarEstudiantes(this.claseSeleccionadaId);
  }

  cargarEstudiantes(claseId?: number): void {
    const targetId = Number(claseId || this.claseSeleccionadaId);
    if (!targetId) {
      this.estudiantes = [];
      this.refrescarVista();
      return;
    }

    this.claseService.getEstudiantesFromClase(targetId).pipe(
      take(1),
      timeout(10000)
    ).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.$values || res?.data || []);
        if (raw && raw.length > 0) {
          this.estudiantes = this.mapearEstudiantes(raw);
          if (this.claseSeleccionada && Number(this.claseSeleccionada.claseId || this.claseSeleccionada.id) === targetId) {
            this.claseSeleccionada.estudiantes = this.estudiantes;
          }
        }
        this.refrescarVista();
        this.abrirEstudianteObjetivo();
      },
      error: () => {
        this.refrescarVista();
        this.abrirEstudianteObjetivo();
      }
    });
  }

  private mapearEstudiantes(lista: any[]): EstudianteClaseDocenteDto[] {
    return (lista || []).map((est: any, idx: number): EstudianteClaseDocenteDto => {
      const eId = Number(est.estudianteId || est.id || est.personaId || (idx + 1));
      const nombreCompleto = est.nombreCompleto || [est.nombre, est.apellido].filter(Boolean).join(' ').trim() || est.username || `Estudiante #${eId}`;
      const correo = est.correo || est.email || '';
      const cedula = est.cedula || est.ci || '';
      return {
        id: Number(est.id || eId),
        estudianteId: eId,
        username: est.username || (correo ? correo.split('@')[0] : `estudiante${eId}`),
        nombreCompleto: nombreCompleto,
        nombre: est.nombre || nombreCompleto,
        apellido: est.apellido || '',
        correo: correo,
        email: est.email || correo,
        cedula: cedula,
        ci: est.ci || cedula,
        catedraId: est.catedraId !== undefined && est.catedraId !== null ? Number(est.catedraId) : null,
        promedioActual: est.promedioActual !== undefined && est.promedioActual !== null ? Number(est.promedioActual) : (est.nota !== undefined ? Number(est.nota) : null),
        alertaRendimiento: est.alertaRendimiento !== undefined && est.alertaRendimiento !== null ? Boolean(est.alertaRendimiento) : false
      };
    });
  }

  actualizar(): void {
    this.cargarClases(this.claseSeleccionadaId);
  }

  // =========================================================
  // MÉTRICAS
  // =========================================================

  get totalEstudiantes(): number {
    return this.estudiantes.length;
  }

  get promedioGeneral(): number | null {
    const notas = this.estudiantes
      .map((est) => est.promedioActual)
      .filter((nota): nota is number => nota !== null && nota !== undefined);

    if (notas.length === 0) {
      return null;
    }

    const suma = notas.reduce((total, nota) => total + nota, 0);

    return Math.round((suma / notas.length) * 100) / 100;
  }

  get enRiesgoCount(): number {
    return this.estudiantes.filter((est) => est.alertaRendimiento === true).length;
  }

  // =========================================================
  // FILTROS
  // =========================================================

  get estudiantesFiltrados(): EstudianteClaseDocenteDto[] {
    let lista = [...this.estudiantes];

    const q = this.busqueda.trim().toLowerCase();

    if (q) {
      lista = lista.filter((est) => {
        const nombre = est.nombreCompleto || est.nombre || '';
        const username = est.username || '';
        const correo = est.correo || '';
        const cedula = est.cedula || '';

        return (
          nombre.toLowerCase().includes(q) ||
          username.toLowerCase().includes(q) ||
          correo.toLowerCase().includes(q) ||
          cedula.toLowerCase().includes(q)
        );
      });
    }

    if (this.filtroEstado === 'riesgo') {
      lista = lista.filter((est) => est.alertaRendimiento === true);
    }

    if (this.filtroEstado === 'sin-alerta') {
      lista = lista.filter((est) => est.alertaRendimiento !== true);
    }

    lista.sort((a, b) => {
      const nombreA = a.nombreCompleto || a.nombre || '';
      const nombreB = b.nombreCompleto || b.nombre || '';

      switch (this.orden) {
        case 'nombre-desc':
          return nombreB.localeCompare(nombreA);

        case 'nota-desc': {
          const notaA = a.promedioActual ?? Number.NEGATIVE_INFINITY;
          const notaB = b.promedioActual ?? Number.NEGATIVE_INFINITY;
          return notaB - notaA;
        }

        case 'nota-asc': {
          const notaA = a.promedioActual ?? Number.POSITIVE_INFINITY;
          const notaB = b.promedioActual ?? Number.POSITIVE_INFINITY;
          return notaA - notaB;
        }

        default:
          return nombreA.localeCompare(nombreB);
      }
    });

    return lista;
  }

  private abrirEstudianteObjetivo(): void {
    if (!this.estudianteObjetivoId) {
      return;
    }

    const estudiante = this.estudiantes.find(
      (est) => Number(est.estudianteId || est.id) === this.estudianteObjetivoId,
    );

    if (!estudiante) {
      return;
    }

    this.estudianteObjetivoId = 0;

    setTimeout(() => {
      this.abrirExpediente(estudiante);

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          abrirEstudiante: null,
          t: null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }, 0);
  }

  // =========================================================
  // EXPEDIENTE RF-002
  // =========================================================

  abrirExpediente(estudiante: EstudianteClaseDocenteDto): void {
    this.estudianteDetalle = estudiante;
    this.expedienteDetalle = null;
    this.catedrasEstudiante = [];
    this.catedraIndicadorId = Number(estudiante.catedraId || 0);
    this.indicadorSeleccionado = '';
    this.observacionIndicador = '';
    this.errorExpediente = '';
    this.cargandoExpediente = true;
    this.modalExpediente = true;

    this.refrescarVista();
    this.cargarExpediente();
    this.cargarCatedrasDelEstudiante();
  }

  cerrarExpediente(): void {
    this.modalExpediente = false;
    this.estudianteDetalle = null;
    this.expedienteDetalle = null;
    this.catedrasEstudiante = [];
    this.catedraIndicadorId = 0;
    this.indicadorSeleccionado = '';
    this.observacionIndicador = '';
    this.errorExpediente = '';
    this.cargandoExpediente = false;

    this.refrescarVista();
  }

  cargarExpediente(): void {
    if (!this.estudianteDetalle) {
      return;
    }

    const estudianteId = Number(this.estudianteDetalle.estudianteId || this.estudianteDetalle.id);

    if (!estudianteId) {
      this.cargandoExpediente = false;
      this.errorExpediente = 'No se pudo identificar al estudiante.';
      this.refrescarVista();
      return;
    }

    this.cargandoExpediente = true;
    this.errorExpediente = '';

    this.refrescarVista();

    this.docenteService
      .getExpedienteEstudiante(estudianteId)
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: (data) => {
          this.expedienteDetalle = data;
          this.cargandoExpediente = false;
          this.refrescarVista();
        },

        error: (err) => {
          console.error('ERROR EXPEDIENTE:', err);

          this.cargandoExpediente = false;
          this.expedienteDetalle = null;

          if (err?.name === 'TimeoutError') {
            this.errorExpediente = 'El servidor tardó demasiado en cargar el expediente.';
          } else {
            this.errorExpediente = this.obtenerMensajeError(
              err,
              'No se pudieron cargar las clases asignadas.',
            );
          }

          this.refrescarVista();
        },
      });
  }

  // =========================================================
  // CÁTEDRAS DEL ESTUDIANTE
  // =========================================================

  cargarCatedrasDelEstudiante(): void {
    if (!this.estudianteDetalle) {
      return;
    }

    const estudianteId = Number(this.estudianteDetalle.estudianteId || this.estudianteDetalle.id);

    if (!estudianteId) {
      return;
    }

    this.docenteService
      .getCatedrasEstudiante(estudianteId)
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: (data) => {
          this.catedrasEstudiante = Array.isArray(data) ? data : [];

          const existeActual = this.catedrasEstudiante.some(
            (catedra) => Number(catedra.id) === Number(this.catedraIndicadorId),
          );

          if (!existeActual) {
            this.catedraIndicadorId =
              this.catedrasEstudiante.length === 1 ? Number(this.catedrasEstudiante[0].id) : 0;
          }

          this.refrescarVista();
        },

        error: (err) => {
          console.error('ERROR CÁTEDRAS ESTUDIANTE:', err);

          this.catedrasEstudiante = [];

          this.errorExpediente = this.obtenerMensajeError(
            err,
            'No se pudieron cargar las cátedras del estudiante.',
          );

          this.refrescarVista();
        },
      });
  }

  // =========================================================
  // INDICADORES RF-003
  // =========================================================

  get indicadoresMostrados(): IndicadorCualitativoDto[] {
    const indicadores = this.expedienteDetalle?.indicadores || [];

    if (!this.catedraIndicadorId) {
      return indicadores;
    }

    return indicadores.filter(
      (indicador) => Number(indicador.catedraId) === Number(this.catedraIndicadorId),
    );
  }

  registrarIndicador(): void {
    if (!this.estudianteDetalle) {
      return;
    }

    if (!this.catedraIndicadorId) {
      this.errorExpediente = 'Selecciona una cátedra.';
      this.refrescarVista();
      return;
    }

    if (!this.indicadorSeleccionado) {
      this.errorExpediente = 'Selecciona el tipo de indicador.';
      this.refrescarVista();
      return;
    }

    if (!this.observacionIndicador.trim()) {
      this.errorExpediente = 'Escribe una observación.';
      this.refrescarVista();
      return;
    }

    const estudianteId = Number(this.estudianteDetalle.estudianteId || this.estudianteDetalle.id);

    if (!estudianteId) {
      this.errorExpediente = 'No se pudo identificar al estudiante.';
      this.refrescarVista();
      return;
    }

    this.guardandoIndicador = true;
    this.errorExpediente = '';

    this.refrescarVista();

    this.docenteService
      .crearIndicadorCualitativo(this.catedraIndicadorId, estudianteId, {
        indicador: this.indicadorSeleccionado,
        observacion: this.observacionIndicador.trim(),
      })
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: () => {
          this.guardandoIndicador = false;
          this.indicadorSeleccionado = '';
          this.observacionIndicador = '';
          this.mostrarExito('Indicador cualitativo registrado correctamente.');
          this.refrescarVista();
          this.cargarExpediente();
        },

        error: (err) => {
          console.error('ERROR REGISTRANDO INDICADOR:', err);
          this.guardandoIndicador = false;
          this.errorExpediente = this.obtenerMensajeError(
            err,
            'No se pudo registrar el indicador cualitativo.',
          );
          this.refrescarVista();
        },
      });
  }

  // =========================================================
  // MATRÍCULA INDIVIDUAL
  // =========================================================

  matricularEstudianteIndividual(): void {
    if (!this.claseSeleccionadaId) {
      this.errorMessage = 'Selecciona una clase.';
      this.refrescarVista();
      return;
    }

    if (
      !this.nuevoEstudiante.nombre.trim() ||
      !this.nuevoEstudiante.apellido.trim() ||
      !this.nuevoEstudiante.correo.trim()
    ) {
      this.errorMessage = 'Nombre, apellido y correo son obligatorios.';
      this.refrescarVista();
      return;
    }

    const body: MatricularEstudianteDto = {
      nombre: this.nuevoEstudiante.nombre.trim(),
      apellido: this.nuevoEstudiante.apellido.trim(),
      correo: this.nuevoEstudiante.correo.trim(),
    };

    if (this.nuevoEstudiante.cedula?.trim()) {
      body.cedula = this.nuevoEstudiante.cedula.trim();
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.refrescarVista();

    this.docenteService
      .matricularEstudianteClase(this.claseSeleccionadaId, body)
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.nuevoEstudiante = {
            nombre: '',
            apellido: '',
            correo: '',
            cedula: '',
          };
          this.tabActiva = 'nomina';
          this.mostrarExito('Estudiante matriculado correctamente.');
          this.refrescarVista();
          this.cargarEstudiantes(this.claseSeleccionadaId);
          this.cargarClases(this.claseSeleccionadaId);
        },

        error: (err) => {
          console.error('ERROR MATRICULANDO:', err);
          this.isLoading = false;
          this.errorMessage = this.obtenerMensajeError(err, 'No se pudo matricular al estudiante.');
          this.refrescarVista();
        },
      });
  }

  // =========================================================
  // CARGA MASIVA
  // =========================================================

  procesarTextoMasivo(): void {
    this.estudiantesParseados = [];
    this.errorMessage = '';

    const lineas = this.textoCargaMasiva
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean);

    for (const linea of lineas) {
      const partes = linea.split(/[,;\t]/).map((valor) => valor.trim());

      if (partes.length < 2 || !partes[1].includes('@')) {
        this.errorMessage = 'Cada línea debe tener como mínimo: Nombre completo, correo.';
        continue;
      }

      const datosNombre = this.separarNombre(partes[0]);

      this.estudiantesParseados.push({
        nombre: datosNombre.nombre,
        apellido: datosNombre.apellido,
        correo: partes[1],
        cedula: partes[2] || undefined,
      });
    }

    this.refrescarVista();
  }

  confirmarCargaMasiva(): void {
    if (!this.claseSeleccionadaId || this.estudiantesParseados.length === 0) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.refrescarVista();

    const peticiones = this.estudiantesParseados.map((estudiante) =>
      this.docenteService.matricularEstudianteClase(this.claseSeleccionadaId, estudiante).pipe(
        map(() => ({
          ok: true,
          estudiante,
          error: null,
        })),

        catchError((error) =>
          of({
            ok: false,
            estudiante,
            error,
          }),
        ),
      ),
    );

    forkJoin(peticiones)
      .pipe(timeout(30000))
      .subscribe({
        next: (resultados) => {
          this.isLoading = false;

          const correctos = resultados.filter((item) => item.ok);
          const fallidos = resultados.filter((item) => !item.ok);

          if (correctos.length > 0) {
            this.mostrarExito(`${correctos.length} estudiante(s) matriculado(s) correctamente.`);
          }

          if (fallidos.length > 0) {
            this.errorMessage = `${fallidos.length} estudiante(s) no pudieron matricularse.`;
            this.estudiantesParseados = fallidos.map((item) => item.estudiante);
          } else {
            this.textoCargaMasiva = '';
            this.estudiantesParseados = [];
            this.tabActiva = 'nomina';
          }

          this.refrescarVista();
          this.cargarEstudiantes(this.claseSeleccionadaId);
          this.cargarClases(this.claseSeleccionadaId);
        },

        error: (err) => {
          console.error('ERROR CARGA MASIVA:', err);
          this.isLoading = false;
          this.errorMessage =
            err?.name === 'TimeoutError'
              ? 'El servidor tardó demasiado en procesar la carga.'
              : 'No se pudo realizar la carga masiva.';
          this.refrescarVista();
        },
      });
  }

  // =========================================================
  // ELIMINAR
  // =========================================================

  eliminarEstudiante(estudiante: EstudianteClaseDocenteDto): void {
    if (!this.claseSeleccionadaId) {
      return;
    }

    const estudianteId = Number(estudiante.estudianteId || estudiante.id);

    if (!estudianteId) {
      return;
    }

    const nombre = estudiante.nombreCompleto || estudiante.nombre || 'este estudiante';

    if (!window.confirm(`¿Deseas eliminar a ${nombre} de esta clase?`)) {
      return;
    }

    this.isLoading = true;

    this.refrescarVista();

    this.docenteService
      .eliminarEstudianteClase(this.claseSeleccionadaId, estudianteId)
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.mostrarExito('Estudiante eliminado correctamente.');
          this.refrescarVista();
          this.cargarEstudiantes(this.claseSeleccionadaId);
          this.cargarClases(this.claseSeleccionadaId);
        },

        error: (err) => {
          this.isLoading = false;
          this.errorMessage = this.obtenerMensajeError(err, 'No se pudo eliminar al estudiante.');
          this.refrescarVista();
        },
      });
  }

  // =========================================================
  // CSV
  // =========================================================

  exportarCSV(): void {
    if (this.estudiantes.length === 0) {
      this.errorMessage = 'No hay estudiantes para exportar.';
      this.refrescarVista();
      return;
    }

    const filas = this.estudiantes.map((estudiante) => [
      estudiante.estudianteId || estudiante.id,
      `"${(estudiante.nombreCompleto || estudiante.nombre || '').replace(/"/g, '""')}"`,
      `"${(estudiante.correo || '').replace(/"/g, '""')}"`,
      `"${(estudiante.cedula || '').replace(/"/g, '""')}"`,
      estudiante.promedioActual ?? '',
      estudiante.alertaRendimiento === true ? 'En riesgo' : 'Sin alerta',
    ]);

    const contenido = [
      'ID,Nombre,Correo,Cedula,PromedioActual,AlertaRendimiento',
      ...filas.map((fila) => fila.join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + contenido], {
      type: 'text/csv;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nomina_${this.claseSeleccionada?.codigoMateria || 'CLASE'}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  getIniciales(nombre: string): string {
    if (!nombre) {
      return 'ES';
    }

    const partes = nombre.trim().split(/\s+/);

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  private separarNombre(nombreCompleto: string): {
    nombre: string;
    apellido: string;
  } {
    const partes = nombreCompleto.trim().split(/\s+/);

    if (partes.length === 1) {
      return {
        nombre: partes[0],
        apellido: '',
      };
    }

    return {
      nombre: partes.slice(0, -1).join(' '),
      apellido: partes[partes.length - 1],
    };
  }

  private obtenerMensajeError(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    return error?.error?.message || error?.error?.title || fallback;
  }

  private mostrarExito(mensaje: string): void {
    this.successMessage = mensaje;
    this.errorMessage = '';

    this.refrescarVista();

    setTimeout(() => {
      if (this.successMessage === mensaje) {
        this.successMessage = '';
        this.refrescarVista();
      }
    }, 4000);
  }
}
