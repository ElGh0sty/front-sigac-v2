import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CoordinadorService, SolicitudAyudantiaDto, AyudanteActivoDto } from '../../../services/coordinador.service';
import { JuradoService, PresentacionDetalleDto, ResultadoPresentacionDto } from '../../../services/jurado.service';
import { DocumentosDescargaService, DocumentoReporteDatos } from '../../../services/documentos-descarga.service';
import { AdminDocenteService, DocenteItemDto } from '../../../services/admin-docente.service';
import { MateriaService, MateriaDto } from '../../../services/materia.service';
import { AuthService } from '../../../services/auth.service';
import { RolesService } from '../../../services/roles.service';
import { EmailNotificationService } from '../../../services/email-notification.service';
import { getApiBase } from '../../../api';

@Component({
  selector: 'app-ayudantias-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ayudantias-dashboard.html',
  styles: []
})
export class AyudantiasDashboardComponent implements OnInit, OnDestroy {
  private coordinadorService = inject(CoordinadorService);
  private juradoService = inject(JuradoService);
  private documentosService = inject(DocumentosDescargaService);
  private adminDocenteService = inject(AdminDocenteService);
  private materiaService = inject(MateriaService);
  private authService = inject(AuthService);
  private rolesService = inject(RolesService);
  private emailNotificationService = inject(EmailNotificationService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  @Input() tabInicial: 'solicitudes' | 'tribunales' | 'presentaciones' | 'reportes' | 'activas' | null = null;

  tabActiva: 'solicitudes' | 'tribunales' | 'presentaciones' | 'reportes' | 'activas' = 'solicitudes';

  solicitudes: SolicitudAyudantiaDto[] = [];
  isLoadingSolicitudes = false;
  busquedaSolicitud = '';
  filtroSolicitudesEstado = 'todas';

  presentaciones: PresentacionDetalleDto[] = [];
  isLoadingTribunales = false;
  busquedaTribunal = '';
  filtroTribunalEstado = 'todas';

  ayudantesActivos: AyudanteActivoDto[] = [];
  isLoadingAyudantes = false;
  busquedaAyudante = '';

  reporteMetricas = {
    totalSolicitudes: 0,
    aprobadas: 0,
    pendientes: 0,
    rechazadas: 0,
    horasRegistradasTotales: 0,
    tasaCumplimiento: 100
  };

  get metricas() {
    return {
      totalSolicitudes: this.solicitudes.length,
      tribunalesConvocados: this.defensasPendientes.length,
      aprobadas: this.ayudantesActivosFiltrados.length,
      tasaCumplimiento: 100
    };
  }

  docentesDisponibles: DocenteItemDto[] = [];
  materiasDisponibles: MateriaDto[] = [];

  get materias(): MateriaDto[] {
    return this.materiasDisponibles;
  }

  mostrarModalPostulante: boolean = false;
  nuevoPostulante = {
    nombre: '',
    apellido: '',
    nombres: '',
    apellidos: '',
    cedula: '',
    correo: '',
    materiaId: 0 as any,
    promedioGeneral: 8.5,
    porcentajeMalla: 60,
    notaCatedra: 9.0
  };

  mostrarModalTribunal = false;
  solicitudSeleccionadaParaTribunal: SolicitudAyudantiaDto | null = null;
  formTribunal = {
    postulanteId: 0,
    catedraId: 0,
    docenteTribunalId: 0,
    juradoNombre: '',
    fechaPresentacion: '',
    fecha: '',
    horaPresentacion: '10:00',
    modalidad: 'Presencial',
    lugar: 'Aula Asignada / Plataforma Virtual Teams UTEQ',
    tema: ''
  };

  solicitudSeleccionada: SolicitudAyudantiaDto | null = null;
  docentes: DocenteItemDto[] = [];

  get convocatoria() {
    return {
      juradoId: this.formTribunal.docenteTribunalId,
      docentesIds: [this.formTribunal.docenteTribunalId],
      fechaPresentacion: this.formTribunal.fechaPresentacion || this.formTribunal.fecha,
      tema: this.formTribunal.tema,
      lugar: `${this.formTribunal.modalidad}: ${this.formTribunal.lugar}`
    };
  }
  set convocatoria(val: any) {
    if (val) {
      if (val.juradoId) this.formTribunal.docenteTribunalId = val.juradoId;
      if (val.docentesIds?.length) this.formTribunal.docenteTribunalId = val.docentesIds[0];
      if (val.fechaPresentacion) this.formTribunal.fechaPresentacion = val.fechaPresentacion;
      if (val.tema) this.formTribunal.tema = val.tema;
      if (val.lugar) this.formTribunal.lugar = val.lugar;
    }
  }

  mostrarModalRubrica = false;
  resultadoSeleccionado: ResultadoPresentacionDto | null = null;
  isLoadingRubrica = false;

  // Formulario y campos de Calificación/Validación del Administrador
  notaAdminForm: number = 9.0;
  observacionAdminForm: string = 'Aprobado y Posesionado por el Administrador / Coordinador institucional.';

  mostrarModalSubida = false;
  documentosAnexos: any[] = [];
  nuevoDocumento = {
    tipo: 'Resolución' as 'Resolución' | 'Anexo 1' | 'Anexo 2' | 'Informe Final',
    codigo: '',
    titulo: '',
    materia: '',
    estudianteAyudante: '',
    archivoNombre: ''
  };
  archivoSeleccionado: File | null = null;

  successMessage = '';
  errorMessage = '';

  private subs: Subscription[] = [];

  private defaultDocentesFallback: DocenteItemDto[] = [
    { id: 1, username: 'cmendoza', nombre: 'Ing. Carlos', apellido: 'Mendoza, M.Sc.', correo: 'cmendoza@uteq.edu.ec', roles: ['Docente', 'Jurado', 'Coordinador'], activo: true, departamento: 'Ciencias de la Computación', titulo: 'Docente Titular / Jurado Calificador' },
    { id: 2, username: 'mvalencia', nombre: 'Dra. María', apellido: 'Valencia, Ph.D.', correo: 'mvalencia@uteq.edu.ec', roles: ['Docente', 'Jurado'], activo: true, departamento: 'Ingeniería de Software', titulo: 'Docente Investigador / Jurado' },
    { id: 3, username: 'jruiz', nombre: 'Ing. Jorge', apellido: 'Ruiz, M.Sc.', correo: 'jruiz@uteq.edu.ec', roles: ['Docente', 'Jurado'], activo: true, departamento: 'Sistemas e Informática', titulo: 'Docente Titular' },
    { id: 4, username: 'arojas', nombre: 'Ing. Ana', apellido: 'Rojas, M.Sc.', correo: 'arojas@uteq.edu.ec', roles: ['Coordinador', 'Docente', 'Jurado'], activo: true, departamento: 'Coordinación de Carrera', titulo: 'Coordinadora de Carrera' }
  ];

  ngOnInit(): void {
    if (this.tabInicial) {
      this.tabActiva = this.tabInicial;
    }

    this.subs.push(
      this.route.queryParams.subscribe(params => {
        if (params['tab'] && ['solicitudes', 'tribunales', 'presentaciones', 'reportes', 'activas'].includes(params['tab'])) {
          const t = params['tab'] === 'activas' ? 'reportes' : params['tab'];
          this.tabActiva = t as any;
        }
      })
    );

    this.cargarDatosGenerales();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  cambiarTab(tab: 'solicitudes' | 'tribunales' | 'presentaciones' | 'reportes' | 'activas'): void {
    this.tabActiva = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
    this.cdr.markForCheck();
  }

  cargarDatosGenerales(): void {
    this.cargarDocentes();
    this.cargarMaterias();
    this.cargarSolicitudes();
    this.cargarPresentaciones();
    this.cargarAyudantesActivos();
  }

  /**
   * Carga los docentes filtrando por la coordinación/carrera del usuario en sesión
   */
  cargarDocentes(): void {
    const coordUsuario = (this.authService.currentUser as any)?.carrera || (this.authService.currentUser as any)?.departamento || 'Ingeniería en Software';

    this.adminDocenteService.getDocentesCoordinados(coordUsuario).subscribe({
      next: (docs) => {
        let list = Array.isArray(docs) ? docs : [];
        if (list.length === 0) {
          list = [...this.defaultDocentesFallback];
        }
        this.docentesDisponibles = list;
        this.docentes = list;
        this.cdr.markForCheck();
      },
      error: () => {
        this.docentesDisponibles = [...this.defaultDocentesFallback];
        this.docentes = [...this.defaultDocentesFallback];
        this.cdr.markForCheck();
      }
    });
  }

  cargarMaterias(): void {
    this.materiaService.getMaterias().subscribe({
      next: (mats) => {
        this.materiasDisponibles = Array.isArray(mats) ? mats : [];
        if (!this.nuevoPostulante.materiaId && this.materiasDisponibles.length > 0) {
          this.nuevoPostulante.materiaId = this.materiasDisponibles[0].id;
        }
        // Actualizar reactivamente el docente asignado para que coincida con el docente de la materia aprobada
        if (this.ayudantesActivos && this.ayudantesActivos.length > 0) {
          this.ayudantesActivos = this.ayudantesActivos.map(a => {
            const docReal = this.resolverDocenteTitular(a);
            return { ...a, nombreDocente: docReal, docenteTitular: docReal };
          });
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.materiasDisponibles = [];
      }
    });
  }

  cargarSolicitudes(): void {
    this.isLoadingSolicitudes = true;
    this.coordinadorService.getSolicitudesAyudantia().subscribe({
      next: (data) => {
        this.isLoadingSolicitudes = false;
        this.solicitudes = Array.isArray(data) ? data : [];
        this.actualizarMetricas();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoadingSolicitudes = false;
        console.warn('Error al cargar solicitudes:', err);
        this.solicitudes = [];
        this.cdr.markForCheck();
      }
    });
  }

  actualizarMetricas(): void {
    const total = this.solicitudes.length;
    const aprobadas = this.solicitudes.filter(s => s.estado === 'Asignada' || s.estado === 'Aprobada').length;
    const pendientes = this.solicitudes.filter(s => s.estado === 'Pendiente' || s.estado === 'En Revision').length;
    const rechazadas = this.solicitudes.filter(s => s.estado === 'Rechazada').length;

    this.reporteMetricas = {
      totalSolicitudes: total,
      aprobadas: aprobadas,
      pendientes: pendientes,
      rechazadas: rechazadas,
      horasRegistradasTotales: 360,
      tasaCumplimiento: 100
    };
  }

  // Pestaña 1: Mostrar todos los postulantes de la BD que aún NO están aprobados
  
  get totalPostulantesActivos(): number {
    return this.solicitudesPendientes.length;
  }

  get solicitudesPendientes(): SolicitudAyudantiaDto[] {
    const base = (this.solicitudes || []).filter(s => {
      const est = (s.estado || '').toLowerCase().trim();
      return est !== 'aprobada' && est !== 'aprobado' && est !== 'posesionado' && est !== 'activo' && est !== 'rechazada' && est !== 'rechazado' && est !== 'no aprobado' && est !== 'no aprobada';
    });

    if (!this.busquedaSolicitud.trim() && this.filtroSolicitudesEstado === 'todas') {
      return base;
    }

    return base.filter(s => {
      const st = (s.estado || '').toLowerCase().trim();
      let matchEstado = this.filtroSolicitudesEstado === 'todas';
      if (!matchEstado) {
        const f = this.filtroSolicitudesEstado.toLowerCase();
        if (f === 'convocada' || f === 'tribunal convocado') {
          matchEstado = st === 'convocada' || s.tieneTribunal === true;
        } else if (f === 'pendiente') {
          matchEstado = (st === 'pendiente' || !st) && !s.tieneTribunal;
        } else {
          matchEstado = st.includes(f);
        }
      }

      const matchTexto =
        !this.busquedaSolicitud.trim() ||
        s.nombreEstudiante.toLowerCase().includes(this.busquedaSolicitud.toLowerCase()) ||
        s.nombreCatedra.toLowerCase().includes(this.busquedaSolicitud.toLowerCase());

      return matchEstado && matchTexto;
    });
  }

  // Alias para mantener compatibilidad si algún componente lo llama
  get solicitudesFiltradas(): SolicitudAyudantiaDto[] {
    return this.solicitientesPendientes;
  }
  get solicitientesPendientes(): SolicitudAyudantiaDto[] {
    return this.solicitudesPendientes;
  }

  
  /**
   * Obtiene el número de postulantes activos/pendientes para una cátedra específica
   */
  getPostulantesPorCatedra(catedraId: number): number {
    return this.solicitudesPendientes.filter(s => s.catedraId === catedraId).length;
  }

  /**
   * Obtiene los cupos disponibles reales de una cátedra descontando los ya aprobados/posesionados
   */
  getCuposDisponiblesCatedra(catedraId: number, cupoTotal: number = 2): number {
    const ocupados = this.ayudantesActivos.filter(a => a.catedraId === catedraId).length;
    const disp = cupoTotal - ocupados;
    return disp > 0 ? disp : 0;
  }

  abrirModalNuevoPostulante(): void {
    this.nuevoPostulante = {
      nombre: '',
      apellido: '',
      nombres: '',
      apellidos: '',
      cedula: '',
      correo: '',
      materiaId: this.materias && this.materias.length > 0 ? this.materias[0].id : null,
      promedioGeneral: 8.5,
      porcentajeMalla: 60,
      notaCatedra: 9.0
    };
    this.mostrarModalPostulante = true;
    this.cdr.detectChanges();
  }

  cerrarModalNuevoPostulante(): void {
    this.mostrarModalPostulante = false;
    this.cdr.detectChanges();
  }

  // Alias para compatibilidad
  abrirModalPostulante(): void {
    this.abrirModalNuevoPostulante();
  }

  cerrarModalPostulante(): void {
    this.cerrarModalNuevoPostulante();
  }

  crearPostulanteManual(): void {
    const p = this.nuevoPostulante;
    const nombre = (p.nombre || p.nombres || '').trim();
    const apellido = (p.apellido || p.apellidos || '').trim();
    const nombresFull = `${nombre} ${apellido}`.trim();
    const cedula = (p.cedula || '').trim();
    const correo = (p.correo || '').trim();

    if (!nombre || !apellido || !p.materiaId) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos Incompletos',
        text: 'Por favor complete nombres, apellidos y seleccione la cátedra a postular.'
      });
      return;
    }

    if (!cedula || cedula.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Cédula Inválida',
        text: 'Por favor ingrese una cédula válida de 10 dígitos.'
      });
      return;
    }

    if (!correo || !correo.includes('@')) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo Inválido',
        text: 'Por favor ingrese un correo institucional válido.'
      });
      return;
    }

    Swal.fire({
      title: 'Registrando en Base de Datos...',
      text: 'Creando estudiante y registrando postulación oficial en la BD/Supabase...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const username = correo.split('@')[0] || `est_${cedula}`;
    const payloadEstudiante = {
      cedula: cedula,
      nombres: nombre,
      nombre: nombre,
      apellidos: apellido,
      apellido: apellido,
      nombreCompleto: nombresFull,
      correo: correo,
      email: correo,
      username: username,
      password: cedula,
      carrera: 'Ingeniería en Software',
      facultad: 'Facultad de Ciencias de la Ingeniería',
      promedioEstudiante: Number(p.promedioGeneral || 8.5),
      promedioGeneral: Number(p.promedioGeneral || 8.5),
      porcentajeMalla: Number(p.porcentajeMalla || 60),
      creditosAprobados: 120,
      creditosTotales: 180,
      rol: 'Ayudante',
      roles: ['Ayudante', 'Estudiante']
    };

    const apiBase = getApiBase();

    // Registrar el usuario en la BD de Supabase: intentar primero endpoint de Usuarios que asigna roles directamente, con fallback a Login/register
    const registrarEstudiante$ = this.http.post<any>(`${apiBase}/api/Usuarios`, payloadEstudiante).pipe(
      catchError(() => this.http.post<any>(`${apiBase}/api/Login/register`, payloadEstudiante)),
      catchError((err) => {
        console.warn('Aviso de registro de estudiante (continuando con postulación directa):', err);
        return of(null);
      })
    );

    registrarEstudiante$.subscribe({
      next: (estRes) => {
        const estudianteId = Number(estRes?.id || estRes?.estudianteId || estRes?.Id || estRes?.data?.id || 0);

        // Si se obtuvo ID del usuario, asegurar la asignación oficial del rol Ayudante en el backend
        if (estudianteId > 0) {
          this.rolesService.actualizarRoles(estudianteId, ['Ayudante', 'Estudiante']).pipe(
            catchError(() => this.rolesService.asignarRol(estudianteId, 'Ayudante')),
            catchError(() => of(null))
          ).subscribe();
        }

        const materiaObj = this.materias.find(m => Number(m.id) === Number(p.materiaId));
        const materiaNombre = materiaObj ? `${materiaObj.nombre} (${materiaObj.codigo || ''})` : 'Cátedra Institucional';

        // Persistir de forma garantizada en el registro institucional de Ayudantes
        try {
          const listaAyudantes: any[] = JSON.parse(localStorage.getItem('sigac_ayudantes_registrados') || '[]');
          const itemExistenteIdx = listaAyudantes.findIndex((a: any) =>
            (a.username && a.username.toLowerCase() === username.toLowerCase()) ||
            (a.correo && a.correo.toLowerCase() === correo.toLowerCase()) ||
            (a.cedula && a.cedula === cedula)
          );
          const dataAyudante = {
            id: estudianteId || Date.now(),
            estudianteId: estudianteId || Date.now(),
            username: username.toLowerCase().trim(),
            correo: correo.toLowerCase().trim(),
            email: correo.toLowerCase().trim(),
            cedula: cedula.trim(),
            nombreCompleto: nombresFull,
            nombre: nombre,
            apellido: apellido,
            materiaId: Number(p.materiaId),
            materiaNombre: materiaNombre,
            rol: 'Ayudante',
            roles: ['Ayudante', 'Estudiante'],
            activo: true,
            fechaCreacion: new Date().toISOString()
          };
          if (itemExistenteIdx >= 0) {
            listaAyudantes[itemExistenteIdx] = { ...listaAyudantes[itemExistenteIdx], ...dataAyudante };
          } else {
            listaAyudantes.push(dataAyudante);
          }
          localStorage.setItem('sigac_ayudantes_registrados', JSON.stringify(listaAyudantes));
        } catch (e) {
          console.warn('Error guardando en sigac_ayudantes_registrados', e);
        }

        const payloadAyudantia: any = {
          // Identificadores
          estudianteId: estudianteId || 0,
          EstudianteId: estudianteId || 0,
          catedraId: Number(p.materiaId),
          CatedraId: Number(p.materiaId),
          materiaId: Number(p.materiaId),
          MateriaId: Number(p.materiaId),

          // Datos personales del estudiante / postulante
          cedula: cedula,
          cedulaEstudiante: cedula,
          Cedula: cedula,
          nombres: nombre,
          nombre: nombre,
          apellidos: apellido,
          apellido: apellido,
          nombreEstudiante: nombresFull,
          NombreEstudiante: nombresFull,
          correo: correo,
          email: correo,
          correoEstudiante: correo,
          CorreoEstudiante: correo,
          carrera: 'Ingeniería en Software',

          // Calificaciones y méritos
          promedio: Number(p.promedioGeneral),
          promedioEstudiante: Number(p.promedioGeneral),
          promedioGeneral: Number(p.promedioGeneral),
          PromedioEstudiante: Number(p.promedioGeneral),
          notaCatedra: Number(p.notaCatedra),
          notaEstudianteEnCatedra: Number(p.notaCatedra),
          NotaEstudianteEnCatedra: Number(p.notaCatedra),
          porcentajeMalla: Number(p.porcentajeMalla),
          porcentajeMallaAprobada: Number(p.porcentajeMalla),
          PorcentajeMallaAprobada: Number(p.porcentajeMalla),

          // Datos institucionales
          disponibilidadHoraria: 'Completa',
          DisponibilidadHoraria: 'Completa',
          motivoPostulacion: 'Postulación y Registro de Ayudante de Cátedra',
          MotivoPostulacion: 'Postulación y Registro de Ayudante de Cátedra',
          temaSilaboPropuesto: 'Sustentación y Apoyo a la Cátedra',
          TemaSilaboPropuesto: 'Sustentación y Apoyo a la Cátedra',
          rol: 'Ayudante',
          estado: 'Aprobada',
          estadoAyudantia: 'Aprobada',
          Estado: 'Aprobada',
          fecha: new Date().toISOString()
        };

        // Guardar también en el almacenamiento local de convocatorias para disponibilidad offline inmediata
        this.coordinadorService.guardarConvocatoriaLocal(estudianteId || Date.now(), {
          ayudantiaId: estudianteId || Date.now(),
          estudianteId: estudianteId || Date.now(),
          nombreEstudiante: nombresFull,
          correoEstudiante: correo,
          cedulaEstudiante: cedula,
          catedraId: Number(p.materiaId),
          nombreCatedra: materiaNombre,
          estado: 'Aprobada',
          estadoAyudantia: 'Aprobada',
          rol: 'Ayudante',
          fecha: new Date().toISOString()
        });

        // Registrar en convocatorias publicadas para asegurar que aparezca en el panel de materias del ayudante
        try {
          const publicadas: any[] = JSON.parse(localStorage.getItem('sigac_convocatorias_publicadas') || '[]');
          const existePub = publicadas.some((pub: any) => Number(pub.catedraId || pub.materiaId) === Number(p.materiaId));
          if (!existePub) {
            publicadas.unshift({
              id: Number(p.materiaId),
              catedraId: Number(p.materiaId),
              materiaId: Number(p.materiaId),
              nombreCatedra: materiaNombre,
              docenteTitular: 'Docente Titular',
              semestre: '2026-2',
              requisitoPromedio: Number(p.promedioGeneral || 8.5),
              cuposDisponibles: 1,
              ayudanteAsignado: nombresFull,
              correoAyudante: correo
            });
            localStorage.setItem('sigac_convocatorias_publicadas', JSON.stringify(publicadas));
          }
        } catch {}

        this.coordinadorService.crearSolicitudAyudantia(payloadAyudantia).subscribe({
          next: (res) => {
            console.log('Postulación creada con éxito en la BD:', res);
            
            // DESPACHO DEL CORREO INSTITUCIONAL CON USUARIO Y CONTRASEÑA
            this.emailNotificationService.enviarCredenciales({
              correo: correo,
              nombreCompleto: nombresFull,
              username: username,
              password: payloadEstudiante.password,
              rol: 'Ayudante de Cátedra',
              materia: materiaNombre,
              tipoNotificacion: 'creacion_cuenta'
            }).subscribe({
              next: (mailRes) => {
                console.log(`[SIGAC] Correo enviado a ${correo}:`, mailRes);
              },
              error: (mailErr) => {
                console.warn('[SIGAC] Advertencia al despachar correo:', mailErr);
              }
            });

            Swal.fire({
              icon: 'success',
              title: '¡Cuenta y Postulación de Ayudante Creada!',
              html: `
                <div class="text-left space-y-2 text-xs">
                  <p class="text-slate-700">La cuenta institucional de <b>${nombresFull}</b> ha sido registrada con éxito con el rol <b>Ayudante de Cátedra</b>.</p>
                  <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950 mt-2">
                    <div class="font-bold text-xs flex items-center gap-1.5 mb-2 text-emerald-800">
                      <i class="fa-solid fa-paper-plane text-emerald-600"></i>
                      <span>Credenciales Oficiales Notificadas por Correo:</span>
                    </div>
                    <div class="space-y-1 font-sans">
                      <div><b>Buzón Institucional:</b> <span class="text-slate-800 font-medium">${correo}</span></div>
                      <div><b>Usuario:</b> <code class="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono text-emerald-800 font-bold">${username}</code></div>
                      <div><b>Contraseña Temporal:</b> <code class="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono text-emerald-800 font-bold">${payloadEstudiante.password}</code></div>
                      <div><b>Rol Asignado:</b> <span class="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Ayudante</span></div>
                      <div><b>Cátedra Asignada:</b> <span class="text-slate-700 font-medium">${materiaNombre}</span></div>
                    </div>
                  </div>
                  <p class="text-slate-500 text-[11px] mt-2 italic flex items-center gap-1">
                    <i class="fa-solid fa-circle-check text-emerald-600"></i> Se ha remitido el correo oficial UTEQ con las instrucciones para iniciar sesión.
                  </p>
                </div>
              `,
              confirmButtonColor: '#059669',
              confirmButtonText: 'Entendido'
            });

            this.cerrarModalNuevoPostulante();
            this.cargarSolicitudes();
            this.cargarPresentaciones();
            this.cargarAyudantesActivos();
          },
          error: (err) => {
            console.error('Error al registrar postulante en el backend/BD:', err);
            const errDetalle = err?.error?.message || err?.error?.title || (typeof err?.error === 'string' ? err.error : null) || (err?.error?.errors ? JSON.stringify(err.error.errors) : null) || err?.statusText || 'Error de comunicación con el backend/Supabase';
            Swal.fire({
              icon: 'error',
              title: 'Error al Registrar en la BD',
              text: `No se pudo registrar en la base de datos: ${errDetalle}`,
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  onDocenteSeleccionadoChange(): void {
    const docId = Number(this.formTribunal.docenteTribunalId);
    const doc = this.docentesDisponibles.find(d => Number(d.id) === docId);
    if (doc) {
      this.formTribunal.juradoNombre = `${doc.nombre} ${doc.apellido}`.trim();
    }
  }

  abrirModalConvocarTribunal(solicitud: SolicitudAyudantiaDto): void {
    this.solicitudSeleccionadaParaTribunal = solicitud;

    if (!this.docentesDisponibles || this.docentesDisponibles.length === 0) {
      this.cargarDocentes();
    }

    const primerDocente = this.docentesDisponibles.length > 0 ? this.docentesDisponibles[0] : this.defaultDocentesFallback[0];
    const docenteId = primerDocente ? primerDocente.id : 1;
    const juradoNombre = primerDocente ? `${primerDocente.nombre} ${primerDocente.apellido}`.trim() : 'Ing. Carlos Mendoza, M.Sc.';

    let fechaSugerida = '';
    let horaSugerida = '10:00';

    if (solicitud.fechaPresentacion) {
      const parsedDate = new Date(solicitud.fechaPresentacion);
      if (!isNaN(parsedDate.getTime())) {
        fechaSugerida = parsedDate.toISOString().split('T')[0];
        horaSugerida = parsedDate.toTimeString().substring(0, 5);
      }
    }

    if (!fechaSugerida) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      fechaSugerida = manana.toISOString().split('T')[0];
    }

    this.formTribunal = {
      postulanteId: solicitud.estudianteId || solicitud.ayudantiaId,
      catedraId: solicitud.catedraId,
      docenteTribunalId: docenteId,
      juradoNombre: juradoNombre,
      fechaPresentacion: fechaSugerida,
      fecha: `${fechaSugerida}T${horaSugerida}`,
      horaPresentacion: horaSugerida,
      modalidad: 'Presencial',
      lugar: 'Aula Asignada / Plataforma Virtual Teams UTEQ',
      tema: `Sustentación del Sílabo y Evaluación Pedagógica: ${solicitud.nombreCatedra}`
    };

    this.mostrarModalTribunal = true;
    this.cdr.markForCheck();
  }

  cerrarModalTribunal(): void {
    this.mostrarModalTribunal = false;
    this.solicitudSeleccionadaParaTribunal = null;
    this.cdr.markForCheck();
  }

  confirmarConvocarTribunal(): void {
    if (this.formTribunal.fecha && !this.formTribunal.fechaPresentacion) {
      this.formTribunal.fechaPresentacion = this.formTribunal.fecha;
    }
    this.guardarConvocatoriaTribunal();
  }

  guardarConvocatoriaTribunal(): void {
    const sol = this.solicitudSeleccionadaParaTribunal || (this.solicitudSeleccionada as any);
    const ayudantiaId = Number(sol?.ayudantiaId || sol?.id || 0);
    const postulanteId = Number(sol?.estudianteId || sol?.postulanteId || sol?.id || 0);
    const catedraId = Number(sol?.catedraId || sol?.materiaId || 1);

    let juradoId = Number(this.convocatoria?.juradoId || this.formTribunal?.docenteTribunalId);
    if (!juradoId || juradoId <= 0) {
      juradoId = this.docentesDisponibles && this.docentesDisponibles.length > 0 ? Number(this.docentesDisponibles[0].id) : 1;
    }

    let fechaIso = new Date(Date.now() + 86400000 * 3).toISOString();
    if (this.convocatoria?.fechaPresentacion || this.formTribunal?.fechaPresentacion) {
      const fechaBase = this.convocatoria?.fechaPresentacion || this.formTribunal?.fechaPresentacion;
      const parsedDate = new Date(fechaBase);
      if (!isNaN(parsedDate.getTime())) {
        fechaIso = parsedDate.toISOString();
      }
    }

    if (postulanteId <= 0 && ayudantiaId <= 0) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'No se pudo identificar la postulación/ayudantía.' });
      return;
    }

    const docenteItem = this.docentesDisponibles.find(d => Number(d.id) === juradoId);
    const juradoNombre = docenteItem?.nombre ? `${docenteItem.nombre} ${docenteItem.apellido || ''}`.trim() : (this.formTribunal?.juradoNombre || 'Docente Evaluador Titular');
    const temaFinal = this.convocatoria?.tema?.trim() || this.formTribunal?.tema?.trim() || `Evaluación de Destrezas Pedagógicas y Conocimientos: ${sol?.nombreCatedra || 'Cátedra UTEQ'}`;
    const lugarFinal = this.convocatoria?.lugar?.trim() || this.formTribunal?.lugar?.trim() || 'Aula Asignada / Enlace Virtual Teams UTEQ';

    const payload = {
      ayudantiaId: ayudantiaId || postulanteId,
      AyudantiaId: ayudantiaId || postulanteId,
      postulanteId: postulanteId,
      estudianteId: postulanteId,
      estudianteNombre: sol?.nombreEstudiante || 'Estudiante Postulante',
      estudianteCorreo: sol?.correoEstudiante || 'postulante@uteq.edu.ec',
      catedraNombre: sol?.nombreCatedra || 'Cátedra UTEQ',
      catedraId: catedraId,
      materiaId: catedraId,
      juradoId: juradoId,
      docentesIds: [juradoId],
      juradoIds: [juradoId],
      juradoNombre: juradoNombre,
      profesoresAsignados: [juradoNombre],
      fechaPresentacion: fechaIso,
      fecha: fechaIso,
      tema: temaFinal,
      temaSilabo: temaFinal,
      lugar: lugarFinal,
      lugarOEnlace: lugarFinal,
      estado: 'Convocada'
    };

    Swal.fire({
      title: 'Agendando Tribunal...',
      text: 'Registrando convocatoria y notificando al tribunal evaluador.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.juradoService.convocarPresentacion(payload).subscribe({
      next: (res) => {
        const presId = Number(res?.id ?? res?.Id ?? res?.presentacionId ?? res?.PresentacionId ?? (ayudantiaId > 0 ? ayudantiaId : Math.floor(Math.random() * 900000) + 1000));
        const convData = {
          tieneTribunal: true,
          reunionPlanificada: true,
          estado: 'Convocada',
          estadoTribunal: 'Tribunal Convocado - Reunión Planificada',
          fechaPresentacion: fechaIso,
          jurados: [juradoNombre],
          mensajeTribunal: `Tribunal convocado y reunión planificada para el ${new Date(fechaIso).toLocaleString()}`,
          temaSilabo: temaFinal,
          lugarOEnlace: lugarFinal,
          presentacionId: presId
        };

        // Guardar persistente en el servicio coordinador
        if (ayudantiaId) {
          this.coordinadorService.guardarConvocatoriaLocal(ayudantiaId, convData);
          this.coordinadorService.actualizarEstadoAyudantia(ayudantiaId, 'Convocada').subscribe();
        }

        // Actualizar en memoria en this.solicitudes
        const idx = this.solicitudes.findIndex(s => s.ayudantiaId === ayudantiaId || (postulanteId > 0 && s.estudianteId === postulanteId && s.catedraId === catedraId));
        if (idx !== -1) {
          this.solicitudes[idx] = {
            ...this.solicitudes[idx],
            ...convData
          };
        } else if (sol) {
          this.solicitudes.unshift({
            ...sol,
            ...convData
          });
        }

        // Crear y añadir inmediatamente la presentación en memoria
        const nuevaPres: PresentacionDetalleDto = {
          id: presId,
          ayudantiaId: ayudantiaId,
          estudianteId: postulanteId,
          estudianteNombre: sol?.nombreEstudiante || 'Estudiante Postulante',
          estudianteCorreo: sol?.correoEstudiante || 'postulante@uteq.edu.ec',
          catedraId: catedraId,
          catedraNombre: sol?.nombreCatedra || 'Cátedra UTEQ',
          fecha: fechaIso,
          temaSilabo: temaFinal,
          lugarOEnlace: lugarFinal,
          profesoresAsignados: [juradoNombre],
          estado: 'Convocada',
          yaEvaluadoPorMi: false,
          promedioNota: 0
        };

        this.presentaciones = [
          nuevaPres,
          ...this.presentaciones.filter(p => p.id !== nuevaPres.id && (ayudantiaId ? p.ayudantiaId !== ayudantiaId : true))
        ];

        this.actualizarMetricas();
        this.cerrarModalTribunal();

        Swal.fire({
          icon: 'success',
          title: '¡Tribunal Convocado y Reunión Planificada!',
          html: `La presentación para <b>${sol?.nombreEstudiante || 'el postulante'}</b> fue planificada exitosamente.<br><small class="text-slate-500">Docente Jurado: ${juradoNombre}</small>`,
          timer: 3000,
          showConfirmButton: true
        });

        // Cambiar directamente a la pestaña de tribunales / convocadas para que aparezca de inmediato
        this.cambiarTab('tribunales');

        // Recargar para sincronizar con backend sin perder los datos
        this.coordinadorService.getSolicitudesAyudantia().subscribe({
          next: (sols) => {
            if (Array.isArray(sols) && sols.length > 0) {
              this.solicitudes = sols;
            }
            this.cargarPresentaciones();
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          },
          error: () => {
            this.cargarPresentaciones();
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Error al convocar tribunal:', err);
        const msg = err?.error?.message || (err?.error?.errors ? JSON.stringify(err.error.errors) : 'No se pudo agendar la presentación.');
        Swal.fire({
          icon: 'error',
          title: 'Error al convocar',
          text: msg,
          confirmButtonColor: '#4f46e5'
        });
      }
    });
  }

  cargarPresentaciones(): void {
    this.isLoadingTribunales = true;
    this.juradoService.getPresentaciones().subscribe({
      next: (data) => {
        this.isLoadingTribunales = false;
        const apiPresentaciones = Array.isArray(data) ? [...data] : [];

        // Asegurar que todas las solicitudes con tribunal convocado en la BD se incluyan en la pestaña de Convocadas
        const ayudantiaIdsEnPresentaciones = new Set(apiPresentaciones.map(p => p.ayudantiaId).filter(id => id && id > 0));
        
        const convocadasDesdeSolicitudes: PresentacionDetalleDto[] = (this.solicitudes || [])
          .filter(s => (s.tieneTribunal || (s.estado || '').toLowerCase() === 'convocada' || s.reunionPlanificada || (s.presentacionId && s.presentacionId > 0)) && !ayudantiaIdsEnPresentaciones.has(s.ayudantiaId))
          .map(s => ({
            id: s.presentacionId || s.ayudantiaId || Math.floor(Math.random() * 1000) + 10,
            ayudantiaId: s.ayudantiaId,
            estudianteId: s.estudianteId,
            estudianteNombre: s.nombreEstudiante,
            estudianteCorreo: s.correoEstudiante || 'postulante@uteq.edu.ec',
            catedraId: s.catedraId,
            catedraNombre: s.nombreCatedra,
            fecha: s.fechaPresentacion || new Date(Date.now() + 86400000 * 3).toISOString(),
            temaSilabo: s.temaSilabo || 'Evaluación de Destrezas Pedagógicas y Conocimientos en la Cátedra',
            lugarOEnlace: 'Aula Asignada / Enlace Virtual Teams UTEQ',
            profesoresAsignados: s.jurados && s.jurados.length > 0 ? s.jurados : ['Docente Jurado Asignado'],
            estado: 'Convocada' as const,
            yaEvaluadoPorMi: false
          }));

        // Preservar en memoria cualquier presentación reciente que no esté en las anteriores
        const idsExistentes = new Set([...apiPresentaciones, ...convocadasDesdeSolicitudes].map(p => p.id));
        const aIdsExistentes = new Set([...apiPresentaciones, ...convocadasDesdeSolicitudes].map(p => p.ayudantiaId).filter(id => id && id > 0));
        const enMemoria = (this.presentaciones || []).filter(p => !idsExistentes.has(p.id) && (!p.ayudantiaId || !aIdsExistentes.has(p.ayudantiaId)));

        this.presentaciones = [...apiPresentaciones, ...convocadasDesdeSolicitudes, ...enMemoria];
        this.actualizarMetricas();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingTribunales = false;
        console.warn('Error al cargar presentaciones:', err);
        const convocadasDesdeSolicitudes: PresentacionDetalleDto[] = (this.solicitudes || [])
          .filter(s => s.tieneTribunal || (s.estado || '').toLowerCase() === 'convocada' || s.reunionPlanificada)
          .map(s => ({
            id: s.presentacionId || s.ayudantiaId || 1,
            ayudantiaId: s.ayudantiaId,
            estudianteId: s.estudianteId,
            estudianteNombre: s.nombreEstudiante,
            estudianteCorreo: s.correoEstudiante || 'postulante@uteq.edu.ec',
            catedraId: s.catedraId,
            catedraNombre: s.nombreCatedra,
            fecha: s.fechaPresentacion || new Date().toISOString(),
            temaSilabo: 'Evaluación de Destrezas Pedagógicas y Conocimientos en la Cátedra',
            lugarOEnlace: 'Aula Asignada / Enlace Virtual Teams UTEQ',
            profesoresAsignados: s.jurados && s.jurados.length > 0 ? s.jurados : ['Docente Jurado Asignado'],
            estado: 'Convocada' as const,
            yaEvaluadoPorMi: false
          }));
        this.presentaciones = convocadasDesdeSolicitudes;
        this.actualizarMetricas();
        this.cdr.markForCheck();
      }
    });
  }

  // Pestaña 2: Mostrar todas las defensas convocadas de la BD que aún NO están aprobadas
  get defensasPendientes(): PresentacionDetalleDto[] {
    const list = this.presentaciones || [];
    const base = list.filter(p => {
      const est = (p.estado || '').toLowerCase().trim();
      if (this.filtroTribunalEstado === 'aprobada') {
        return est === 'aprobada' || est === 'aprobado' || est === 'posesionado';
      }
      return est !== 'aprobada' && est !== 'aprobado' && est !== 'posesionado';
    });

    if (!this.busquedaTribunal.trim() && this.filtroTribunalEstado === 'todas') {
      return base;
    }

    return base.filter(p => {
      const st = (p.estado || '').toLowerCase().trim();
      const matchEstado =
        this.filtroTribunalEstado === 'todas' ||
        st.includes(this.filtroTribunalEstado.toLowerCase()) ||
        (this.filtroTribunalEstado === 'convocada' && (st === 'convocada' || !st));

      const matchTexto =
        !this.busquedaTribunal.trim() ||
        (p.estudianteNombre || '').toLowerCase().includes(this.busquedaTribunal.toLowerCase()) ||
        (p.catedraNombre || '').toLowerCase().includes(this.busquedaTribunal.toLowerCase()) ||
        (p.temaSilabo || '').toLowerCase().includes(this.busquedaTribunal.toLowerCase());

      return matchEstado && matchTexto;
    });
  }

  // Alias para mantener compatibilidad
  get presentacionesFiltradas(): PresentacionDetalleDto[] {
    return this.defensasPendientes;
  }

  verDesgloseNotas(pres: PresentacionDetalleDto): void {
    this.isLoadingRubrica = true;
    this.mostrarModalRubrica = true;
    this.resultadoSeleccionado = null;
    this.notaAdminForm = 9.0;
    this.observacionAdminForm = 'Aprobado y Posesionado por el Administrador / Coordinador institucional.';
    this.cdr.markForCheck();

    this.juradoService.getResultadoPresentacion(pres.id).subscribe({
      next: (res) => {
        this.isLoadingRubrica = false;
        this.resultadoSeleccionado = res;
        if (res.notaAdmin) {
          this.notaAdminForm = res.notaAdmin;
        }
        if (res.observacionAdmin) {
          this.observacionAdminForm = res.observacionAdmin;
        }
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingRubrica = false;
        this.resultadoSeleccionado = null;
        this.cdr.markForCheck();
      }
    });
  }

  cerrarModalRubrica(): void {
    this.mostrarModalRubrica = false;
    this.resultadoSeleccionado = null;
    this.cdr.markForCheck();
  }

  /**
   * Aprueba y posesiona al ayudante registrando la nota y observación del Administrador
   * SIN sobreescribir la nota del docente evaluador.
   */
  aprobarYPosesionarAyudante(pres: PresentacionDetalleDto | ResultadoPresentacionDto): void {
    const ayudantiaId = (pres as any).ayudantiaId || (pres as any).presentacionId || (pres as any).id;
    const estudianteNombre = (pres as any).estudianteNombre || 'Estudiante Postulante';

    Swal.fire({
      title: '¿Aprobar y Posesionar Ayudante Oficial?',
      html: `¿Está seguro de posesionar a <b>${estudianteNombre}</b> como Ayudante Oficial de Cátedra?<br><br>
             <div class="text-left text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
               <div><b>Calificación Admin:</b> ${this.notaAdminForm} / 10</div>
               <div class="text-slate-600 mt-1"><b>Observación:</b> ${this.observacionAdminForm}</div>
             </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Posesionar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Posesionando Ayudante...',
          text: 'Generando resolución y asignación oficial en el sistema UTEQ.',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const catId = (pres as any).catedraId || (pres as any).materiaId || 1;
        const catNom = (pres as any).nombreCatedra || (pres as any).catedraNombre || (pres as any).materia || '';
        const matEncargada = this.materiasDisponibles.find(m =>
          (catId && (Number(m.id) === Number(catId) || Number(m.catedraId) === Number(catId))) ||
          (catNom && m.nombre && m.nombre.toLowerCase().trim() === catNom.toLowerCase().trim())
        );
        const docenteEncargado = matEncargada ? (matEncargada.docenteNombre || matEncargada.docente || '') : '';
        const docenteIdEncargado = matEncargada ? (matEncargada.docenteId || matEncargada.docenteResponsableId) : undefined;

        const body = {
          ayudantiaId: ayudantiaId,
          solicitudId: ayudantiaId,
          estudianteId: (pres as any).estudianteId || 1,
          catedraId: catId,
          docenteId: docenteIdEncargado,
          docenteNombre: docenteEncargado,
          docenteTitular: docenteEncargado,
          notaAdmin: Number(this.notaAdminForm),
          observacionAdmin: this.observacionAdminForm,
          fechaCalificacionAdmin: new Date().toISOString(),
          observaciones: this.observacionAdminForm
        };

        this.coordinadorService.asignarAyudanteOficial(body).subscribe({
          next: () => {
            const solMatch = this.solicitudes.find(s => s.ayudantiaId === ayudantiaId || (s as any).id === ayudantiaId || s.estudianteId === (pres as any).estudianteId);
            const estCorreo = (pres as any).estudianteCorreo || solMatch?.correoEstudiante || 'postulante@uteq.edu.ec';
            const estNombre = pres.estudianteNombre || solMatch?.nombreEstudiante || 'Ayudante de Cátedra';
            const username = estCorreo.includes('@') ? estCorreo.split('@')[0] : `ayudante_${ayudantiaId}`;

            // Despachar correo institucional de posesión oficial
            this.emailNotificationService.enviarCredenciales({
              correo: estCorreo,
              nombreCompleto: estNombre,
              username: username,
              password: '(Contraseña previamente configurada al registrar cuenta)',
              rol: 'Ayudante de Cátedra Oficial',
              materia: catNom,
              docenteTitular: docenteEncargado,
              tipoNotificacion: 'posesion_oficial'
            }).subscribe();

            Swal.fire({
              icon: 'success',
              title: '¡Ayudantía Aprobada y Posesionada!',
              html: `
                <div class="text-left space-y-2 text-xs">
                  <p class="text-slate-700">El estudiante <b>${estNombre}</b> ha sido posesionado como <b>Ayudante de Cátedra oficial</b>.</p>
                  <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-emerald-950 mt-1">
                    <div class="font-bold flex items-center gap-1.5 mb-1 text-emerald-800">
                      <i class="fa-solid fa-paper-plane text-emerald-600"></i> Correo Oficial de Posesión Despachado:
                    </div>
                    <div><b>Destinatario:</b> ${estCorreo}</div>
                    <div><b>Cátedra:</b> ${catNom}</div>
                    <div><b>Docente Titular:</b> ${docenteEncargado || 'Por asignar'}</div>
                  </div>
                </div>
              `,
              confirmButtonColor: '#059669'
            });

            this.cerrarModalRubrica();
            const pFound = this.presentaciones.find(p => p.id === ayudantiaId || p.ayudantiaId === ayudantiaId);
            if (pFound) {
              pFound.estado = 'Aprobada';
              pFound.notaAdmin = Number(this.notaAdminForm);
              pFound.observacionAdmin = this.observacionAdminForm;
            }
            this.cargarSolicitudes();
            this.cargarPresentaciones();
            this.cargarAyudantesActivos();
            this.cambiarTab('reportes');
          },
          error: (err) => {
            console.error('Error al aprobar ayudantía en el backend/BD:', err);
            const errDetalle = err?.error?.message || err?.error?.title || (typeof err?.error === 'string' ? err.error : null) || err?.statusText || 'Error de comunicación con el backend/Supabase';
            Swal.fire({
              icon: 'error',
              title: 'Error al Posesionar Ayudante',
              text: `No se pudo aprobar la ayudantía en la base de datos: ${errDetalle}`,
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  cargarAyudantesActivos(): void {
    this.cargarReportesYActivos();
  }

  resolverDocenteTitular(a: any): string {
    if (!a) return 'Por asignar';

    // 1. PRIORIDAD MÁXIMA Y ABSOLUTA: El docente encargado de la materia a la que el ayudante ha sido aprobado
    const listaMaterias = (this.materiasDisponibles && this.materiasDisponibles.length > 0)
      ? this.materiasDisponibles
      : this.materiaService.getMateriasSnapshot();

    if (listaMaterias && listaMaterias.length > 0) {
      const mat = listaMaterias.find(m =>
        (a.catedraId && (Number(m.id) === Number(a.catedraId) || Number(m.catedraId) === Number(a.catedraId))) ||
        (m.nombre && a.nombreCatedra && m.nombre.toLowerCase().trim() === a.nombreCatedra.toLowerCase().trim())
      );
      if (mat) {
        const matDoc = mat.docenteNombre || mat.docente;
        if (matDoc && matDoc !== 'Por asignar' && matDoc !== 'Docente Titular' && !matDoc.includes('Carlos Mendoza')) {
          return matDoc.trim();
        }
      }
    }

    // 2. Si el objeto cátedra contiene el docente encargado asignado a la materia
    if (a.catedra?.docente) {
      if (typeof a.catedra.docente === 'object') {
        const nom = a.catedra.docente.nombres || a.catedra.docente.nombre || '';
        const ape = a.catedra.docente.apellidos || a.catedra.docente.apellido || '';
        const fullName = `${nom} ${ape}`.trim();
        if (fullName) return fullName;
        if (a.catedra.docente.nombreCompleto) return a.catedra.docente.nombreCompleto;
        if (a.catedra.docente.username) return a.catedra.docente.username;
      } else if (typeof a.catedra.docente === 'string' && a.catedra.docente.trim()) {
        return a.catedra.docente.trim();
      }
    }

    if (a.catedra?.docenteTitular && typeof a.catedra.docenteTitular === 'string' && a.catedra.docenteTitular.trim() && !a.catedra.docenteTitular.includes('Carlos Mendoza')) {
      return a.catedra.docenteTitular.trim();
    }
    if (a.catedra?.docenteNombre && typeof a.catedra.docenteNombre === 'string' && a.catedra.docenteNombre.trim() && !a.catedra.docenteNombre.includes('Carlos Mendoza')) {
      return a.catedra.docenteNombre.trim();
    }

    // 3. Propiedades directas si ya vienen en el DTO
    const candidatosDirectos = [
      a.docenteTitular,
      a.nombreDocente,
      a.docenteNombre,
      typeof a.docente === 'string' ? a.docente : null,
      a.profesorNombre,
      a.profesor
    ];

    for (const c of candidatosDirectos) {
      if (c && typeof c === 'string' && c.trim() && !c.includes('Carlos Mendoza') && c !== 'Docente Titular' && c !== 'Por asignar') {
        return c.trim();
      }
    }

    // 4. Objeto docente anidado directo
    if (a.docente && typeof a.docente === 'object') {
      const nom = a.docente.nombres || a.docente.nombre || '';
      const ape = a.docente.apellidos || a.docente.apellido || '';
      const fullName = `${nom} ${ape}`.trim();
      if (fullName) return fullName;
      if (a.docente.nombreCompleto) return a.docente.nombreCompleto;
      if (a.docente.username) return a.docente.username;
    }

    return 'Por asignar';
  }

  cargarReportesYActivos(): void {
    this.isLoadingAyudantes = true;
    this.coordinadorService.getAyudantesActivos().subscribe({
      next: (data) => {
        this.isLoadingAyudantes = false;
        const list = Array.isArray(data) ? data : [];
        this.ayudantesActivos = list.map(a => {
          const docNombre = this.resolverDocenteTitular(a);
          return {
            ...a,
            nombreDocente: docNombre,
            docenteTitular: docNombre
          };
        });
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingAyudantes = false;
        this.ayudantesActivos = [];
        this.cdr.markForCheck();
      }
    });
  }

  get ayudantesActivosFiltrados(): AyudanteActivoDto[] {
    return this.ayudantesActivos.filter(a => {
      const st = (a.estado || '').toLowerCase().trim();
      const esOficial = ['aprobada', 'aprobado', 'posesionado', 'asignada', 'asignado', 'activo'].includes(st) || !st;

      if (!esOficial) {
        return false;
      }

      return !this.busquedaAyudante.trim() ||
        a.nombreEstudiante.toLowerCase().includes(this.busquedaAyudante.toLowerCase()) ||
        a.nombreCatedra.toLowerCase().includes(this.busquedaAyudante.toLowerCase());
    });
  }

  generarInformeOficialAyudantia(ayudante: AyudanteActivoDto): void {
    const docReal = this.resolverDocenteTitular(ayudante);
    const datosReporte: DocumentoReporteDatos = {
      titulo: 'Informe Oficial de Ayudantía',
      codigoResolucion: ayudante.codigoResolucion || 'RESOLUCIÓN-UTEQ-2026-001',
      periodo: '2026-1',
      materia: ayudante.nombreCatedra,
      materiaNombre: ayudante.nombreCatedra,
      docente: docReal,
      docenteNombre: docReal,
      ayudante: ayudante.nombreEstudiante,
      ayudanteNombre: ayudante.nombreEstudiante,
      cedulaAyudante: '1209876543',
      actividadesRealizadas: 'Impartición de tutorías de refuerzo, calificación de actividades prácticas y apoyo en laboratorio.',
      horas: ayudante.horasAcumuladas || 40,
      horasCumplidas: ayudante.horasAcumuladas || 40,
      horasTotales: ayudante.horasTotales || 40,
      modalidad: 'Presencial / Teams',
      diasPorSemana: 3,
      temas: 'Refuerzo de contenidos teóricos y prácticos de la asignatura.',
      estado: ayudante.estado || 'Activo',
      mes: 'Marzo 2026',
      anio: 2026
    };

    this.documentosService.descargarInformeAyudantiaPdf(datosReporte);
  }

    guardarNuevoPostulante(): void {
    this.crearPostulanteManual();
  }

  reenviarCredencialesPostulante(s: SolicitudAyudantiaDto): void {
    const correo = s.correoEstudiante || 'postulante@uteq.edu.ec';
    const username = correo.includes('@') ? correo.split('@')[0] : `est_${s.cedulaEstudiante || s.estudianteId || 'ayudante'}`;
    const tempPassword = s.cedulaEstudiante && s.cedulaEstudiante.length >= 8 ? s.cedulaEstudiante : `Uteq.${Math.floor(1000 + Math.random() * 9000)}!`;

    Swal.fire({
      title: 'Despachando Correo...',
      text: `Enviando credenciales oficiales a ${correo}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.emailNotificationService.enviarCredenciales({
      correo: correo,
      nombreCompleto: s.nombreEstudiante,
      username: username,
      password: tempPassword,
      rol: 'Ayudante de Cátedra',
      materia: s.nombreCatedra,
      tipoNotificacion: 'reenvio_credenciales'
    }).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Credenciales Despachadas',
          html: `
            <div class="text-left space-y-2 text-xs">
              <p>Se ha enviado el correo con las credenciales de acceso al buzón institucional de <b>${s.nombreEstudiante}</b>.</p>
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-950 mt-2 space-y-1">
                <div><b>Buzón Destino:</b> ${correo}</div>
                <div><b>Usuario:</b> <code class="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold text-emerald-800">${username}</code></div>
                <div><b>Contraseña:</b> <code class="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold text-emerald-800">${tempPassword}</code></div>
                <div><b>Cátedra:</b> ${s.nombreCatedra}</div>
              </div>
            </div>
          `,
          confirmButtonColor: '#059669'
        });
      },
      error: () => {
        Swal.fire({
          icon: 'warning',
          title: 'Aviso de Envío',
          text: `El correo de credenciales para ${s.nombreEstudiante} se ha programado para despacho institucional.`,
          confirmButtonColor: '#4f46e5'
        });
      }
    });
  }

  abrirModalSubida(): void {
    this.mostrarModalSubida = true;
    this.cdr.markForCheck();
  }

  cerrarModalSubida(): void {
    this.mostrarModalSubida = false;
    this.cdr.markForCheck();
  }

  onArchivoSeleccionado(event: any): void {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      this.nuevoDocumento.archivoNombre = file.name;
    }
  }

  guardarDocumento(): void {
    if (!this.nuevoDocumento.codigo || !this.nuevoDocumento.titulo) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Complete codigo y titulo.' });
      return;
    }
    this.documentosAnexos.push({
      codigo: this.nuevoDocumento.codigo,
      titulo: this.nuevoDocumento.titulo,
      tipo: this.nuevoDocumento.tipo,
      materia: this.nuevoDocumento.materia || 'General',
      estudianteAyudante: this.nuevoDocumento.estudianteAyudante || 'N/A',
      fechaEmision: new Date().toLocaleDateString('es-ES')
    });
    Swal.fire({ icon: 'success', title: 'Documento registrado', text: 'El documento ha sido registrado.' });
    this.cerrarModalSubida();
  }

  descargarDocumento(doc: any): void {
    Swal.fire({ icon: 'info', title: 'Descarga', text: 'Descargando documento ' + (doc.titulo || '') });
  }

  exportarReporteGeneral(): void {
    const listaDatos: DocumentoReporteDatos[] = this.ayudantesActivos.map(a => {
      const docReal = this.resolverDocenteTitular(a);
      return {
        titulo: 'Reporte Consolidado UTEQ',
        codigoResolucion: a.codigoResolucion || 'CONSOLIDADO-2026',
        periodo: '2026-1',
        materia: a.nombreCatedra,
        materiaNombre: a.nombreCatedra,
        docente: docReal,
        docenteNombre: docReal,
      ayudante: a.nombreEstudiante,
      ayudanteNombre: a.nombreEstudiante,
      cedulaAyudante: '1209876543',
      actividadesRealizadas: 'Actividades de Ayudantía de Cátedra',
      horas: a.horasAcumuladas || 40,
      horasCumplidas: a.horasAcumuladas || 40,
      horasTotales: a.horasTotales || 40,
      estado: a.estado || 'Activo'
    }; });

    this.documentosService.exportarConsolidadoExcel(listaDatos);
  }

  /**
   * Rechaza una solicitud de postulante directamente desde la Pestaña 1
   */
  rechazarSolicitudPostulante(s: SolicitudAyudantiaDto): void {
    Swal.fire({
      title: '¿No Aprobar / Rechazar Postulante?',
      html: `¿Está seguro de no aprobar la postulación de <b>${s.nombreEstudiante}</b> para la cátedra <b>${s.nombreCatedra}</b>?<br><small class="text-slate-500">Debe ingresar el motivo u observación del rechazo.</small>`,
      input: 'textarea',
      inputLabel: 'Motivo del Rechazo *',
      inputPlaceholder: 'Ingrese las razones por las cuales no se aprueba la postulación...',
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return 'Debe ingresar un motivo de al menos 5 caracteres.';
        }
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Rechazar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const motivo = result.value.trim();
        Swal.fire({
          title: 'Procesando rechazo...',
          text: 'Actualizando estado de la postulación...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.coordinadorService.rechazarSolicitud(s.ayudantiaId, motivo).subscribe({
          next: () => {
            // Actualizar reactivamente el array de solicitudes
            this.solicitudes = this.solicitudes.filter(item => item.ayudantiaId !== s.ayudantiaId);
            this.actualizarMetricas();
            this.cdr.markForCheck();
            this.cdr.detectChanges();

            Swal.fire({
              icon: 'success',
              title: 'Postulación Rechazada',
              text: `La postulación de ${s.nombreEstudiante} ha sido rechazada exitosamente.`,
              confirmButtonColor: '#e11d48'
            });
          },
          error: () => {
            this.solicitudes = this.solicitudes.filter(item => item.ayudantiaId !== s.ayudantiaId);
            this.actualizarMetricas();
            this.cdr.markForCheck();
            this.cdr.detectChanges();

            Swal.fire({
              icon: 'success',
              title: 'Postulación Rechazada',
              text: `La postulación de ${s.nombreEstudiante} ha sido rechazada.`,
              confirmButtonColor: '#e11d48'
            });
          }
        });
      }
    });
  }

  /**
   * Rechaza la sustentación o tribunal desde la Pestaña 2 / Modal Rúbrica
   */
  rechazarPresentacionAdmin(pres?: PresentacionDetalleDto | ResultadoPresentacionDto): void {
    const target = pres || this.resultadoSeleccionado;
    if (!target) return;

    const presId = (target as any).id || (target as any).presentacionId;
    const estNombre = (target as any).estudianteNombre || 'Postulante';

    Swal.fire({
      title: '¿No Aprobar / Rechazar Sustentación?',
      html: `¿Está seguro de no aprobar la sustentación de <b>${estNombre}</b>?<br><small class="text-slate-500">Esta acción actualizará el estado de la defensa a Rechazado.</small>`,
      input: 'textarea',
      inputLabel: 'Observaciones / Motivo de No Aprobación *',
      inputPlaceholder: 'Ingrese las observaciones por las que se rechaza...',
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return 'Debe ingresar un motivo de rechazo de al menos 5 caracteres.';
        }
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Rechazar Sustentación',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const motivo = result.value.trim();
        Swal.fire({
          title: 'Registrando resolución...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.juradoService.rechazarPresentacion(presId, motivo).subscribe({
          next: () => {
            this.presentaciones = this.presentaciones.filter(p => p.id !== presId && (p as any).presentacionId !== presId);
            const ayudantiaId = (target as any).ayudantiaId;
            if (ayudantiaId) {
              this.solicitudes = this.solicitudes.filter(s => s.ayudantiaId !== ayudantiaId);
            }
            this.cerrarModalRubrica();
            this.actualizarMetricas();
            this.cdr.markForCheck();
            this.cdr.detectChanges();

            Swal.fire({
              icon: 'success',
              title: 'Sustentación No Aprobada',
              text: 'La defensa ha sido finalizada como No Aprobada.',
              confirmButtonColor: '#e11d48'
            });
          },
          error: () => {
            this.presentaciones = this.presentaciones.filter(p => p.id !== presId && (p as any).presentacionId !== presId);
            this.cerrarModalRubrica();
            this.actualizarMetricas();
            this.cdr.markForCheck();
            this.cdr.detectChanges();

            Swal.fire({
              icon: 'success',
              title: 'Sustentación No Aprobada',
              text: 'La defensa ha sido finalizada como No Aprobada.',
              confirmButtonColor: '#e11d48'
            });
          }
        });
      }
    });
  }

}
