import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { noAuthGuard } from './guards/no-auth.guard';
import { LayoutComponent } from './layout/layout';
import { DashboardComponent } from './components/dashboard/dashboard';

// Estudiante / Ayudante / Docente (Rutas compartidas y unificadas)
import { MateriasComponent } from './components/estudiante/materias/materias';
import { MateriaDetalleComponent } from './components/estudiante/materia-detalle/materia-detalle';
import { MiPerfilComponent } from './components/estudiante/mi-perfil/mi-perfil';
import { HorariosComponent } from './components/estudiante/horarios/horarios';
import { AyudanteMateriasComponent } from './components/ayudante/materias/materias';
import { GestionClasesComponent } from './components/docente/gestion-clases/gestion-clases';
import { GestionAyudantiaComponent } from './components/ayudante/gestion-ayudantia/gestion-ayudantia';
import { GestionEstudiantesComponent } from './components/docente/gestion-estudiantes/gestion-estudiantes';

// Administrador
import { SolicitudesComponent } from './components/administrador/solicitudes/solicitudes';
import { AsignacionesComponent } from './components/administrador/asignaciones/asignaciones';
import { SeguimientoComponent } from './components/administrador/seguimiento/seguimiento';
import { CrearMateriaComponent } from './components/administrador/crear-materia/crear-materia';
import { MateriasAdminComponent } from './components/administrador/materias-admin/materias-admin';
import { OcupacionHorariosComponent } from './components/administrador/ocupacion-horarios/ocupacion-horarios';
import { CrearClaseComponent } from './components/administrador/crear-clase/crear-clase';
import { ClasesAdminComponent } from './components/administrador/clases-admin/clases-admin';
import { AyudantiasAdminComponent } from './components/administrador/ayudantias-admin/ayudantias-admin';
import { AyudantiasDashboardComponent } from './components/administrador/ayudantias-dashboard/ayudantias-dashboard';
import { ReportesComponent } from './components/administrador/reportes/reportes';

// Guards
import { crearClaseGuard } from './guards/crear-clase.guard';
import { roleGuard } from './guards/role.guard';

// Nuevos componentes de Proceso de Aceptación de Ayudantía y Servicios
import { ValidacionCoordinadorComponent } from './components/coordinador/validacion-coordinador/validacion-coordinador';
import { ConfiguracionNotaMinimaComponent } from './components/coordinador/configuracion-nota-minima/configuracion-nota-minima';
import { EvaluacionTribunalComponent } from './components/jurado/evaluacion-tribunal/evaluacion-tribunal';
import { CargaMasivaEstudiantesComponent } from './components/administrador/carga-masiva/carga-masiva';
import { InformesAyudantiaComponent } from './components/ayudante/informes-ayudantia/informes-ayudantia';
import { RecuperarPasswordComponent } from './components/login/recuperar-password/recuperar-password';
import { AdminDocentesComponent } from './components/administrador/admin-docentes/admin-docentes';
import { EntregaTareaEstudianteComponent } from './components/estudiante/entrega-tarea-estudiante/entrega-tarea-estudiante';
import { CalificarActividadDocenteComponent } from './components/docente/calificar-actividad-docente/calificar-actividad-docente';
import { PostulacionComponent } from './components/estudiante/postulacion/postulacion';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'recuperar-password', component: RecuperarPasswordComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },

      // ESTUDIANTE / AYUDANTE / DOCENTE
      { path: 'horarios', component: HorariosComponent },
      { path: 'horarios/:claseId', component: HorariosComponent },
      { path: 'clases', redirectTo: 'admin/clases', pathMatch: 'full' },
      { path: 'estudiante/materias', component: MateriasComponent },
      { path: 'estudiante/materia/:id', component: MateriaDetalleComponent },
      { path: 'estudiante/postulacion', component: PostulacionComponent, canActivate: [roleGuard], data: { roles: ['Estudiante', 'Ayudante'] } },
      { path: 'estudiante/actividades/:actividadId', component: EntregaTareaEstudianteComponent, canActivate: [roleGuard], data: { roles: ['Estudiante', 'Ayudante'] } },
      { path: 'estudiante/horarios', component: HorariosComponent },
      { path: 'estudiante/horarios/:claseId', component: HorariosComponent },
      { path: 'estudiante/mi-perfil', component: MiPerfilComponent },
      { path: 'estudiante/informes', component: InformesAyudantiaComponent },

      // AYUDANTE / DOCENTE (Rutas específicas para gestión)
      { path: 'ayudante/dashboard', component: DashboardComponent },
      { path: 'ayudante/materias', component: AyudanteMateriasComponent },
      { path: 'ayudante/materia/:id', component: MateriaDetalleComponent },
      { path: 'ayudante/horarios', component: HorariosComponent }, // Misma ruta, mismo componente unificado
      { path: 'ayudante/horarios/:claseId', component: HorariosComponent },
      { path: 'ayudante/mi-perfil', component: MiPerfilComponent },
      { path: 'ayudante/bitacoras', component: GestionAyudantiaComponent },
      { path: 'ayudante/informes', component: InformesAyudantiaComponent },
      { path: 'docente/gestion-clases', component: GestionClasesComponent },
      { path: 'docente/actividades/:actividadId/calificar', component: CalificarActividadDocenteComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador', 'Docente', 'Ayudante'] } },
      { path: 'ayudante/actividades/:actividadId/calificar', component: CalificarActividadDocenteComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador', 'Docente', 'Ayudante'] } },
      { path: 'ayudante/gestion-ayudantia', component: GestionAyudantiaComponent },
      { path: 'docente/gestion-estudiantes', component: GestionEstudiantesComponent },
      { path: 'docente/gestion-estudiantes/:id', component: GestionEstudiantesComponent },
      { path: 'docente/carga-masiva', component: CargaMasivaEstudiantesComponent },

      // COORDINADOR / TRIBUNAL (JURADO)
      { path: 'coordinador/validaciones/:solicitudId', component: ValidacionCoordinadorComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador'] } },
      { path: 'coordinador/validacion', component: ValidacionCoordinadorComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador'] } },
      { path: 'coordinador/validacion/:solicitudId', component: ValidacionCoordinadorComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador'] } },
      { path: 'coordinador/tribunal', component: ValidacionCoordinadorComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador'] } },
      { path: 'coordinador/nota-minima', component: ConfiguracionNotaMinimaComponent },
      { path: 'tribunal/evaluacion/:presentacionId', component: EvaluacionTribunalComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador', 'Docente', 'Tribunal', 'Jurado'] } },
      { path: 'tribunal/evaluacion', component: EvaluacionTribunalComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador', 'Docente', 'Tribunal', 'Jurado'] } },
      { path: 'jurado/evaluacion', component: EvaluacionTribunalComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador', 'Docente', 'Tribunal', 'Jurado'] } },
      { path: 'jurado/evaluacion/:presentacionId', component: EvaluacionTribunalComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador', 'Docente', 'Tribunal', 'Jurado'] } },
      { path: 'jurado/presentaciones', component: EvaluacionTribunalComponent },

      // ADMINISTRADOR
      { path: 'admin/docentes', component: AdminDocentesComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Decano', 'Coordinador'] } },
      { path: 'admin/solicitudes', component: SolicitudesComponent },
      { path: 'admin/asignaciones', component: AsignacionesComponent },
      { path: 'admin/seguimiento', component: SeguimientoComponent },
      { path: 'admin/crear-materia', component: CrearMateriaComponent },
      { path: 'admin/materias', component: MateriasAdminComponent },
      { path: 'admin/ocupacion-horarios', component: OcupacionHorariosComponent },
      { path: 'admin/horarios', component: HorariosComponent },
      { path: 'admin/horarios/:claseId', component: HorariosComponent },
      { path: 'admin/crear-clase', component: CrearClaseComponent, canActivate: [crearClaseGuard] },
      { path: 'admin/clases', component: ClasesAdminComponent },
      { path: 'admin/ayudantias', component: AyudantiasDashboardComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador', 'Docente'] } },
      { path: 'admin/ayudantias-dashboard', component: AyudantiasDashboardComponent, canActivate: [roleGuard], data: { roles: ['Administrador', 'Coordinador', 'Docente'] } },
      { path: 'admin/gestion-estudiantes', component: GestionEstudiantesComponent },
      { path: 'admin/gestion-estudiantes/:id', component: GestionEstudiantesComponent },
      { path: 'admin/reportes', component: AyudantiasDashboardComponent },
      { path: 'admin/carga-masiva', component: CargaMasivaEstudiantesComponent },
      { path: 'admin/validacion-coordinador', component: ValidacionCoordinadorComponent },
      { path: 'admin/configuracion-nota-minima', component: ConfiguracionNotaMinimaComponent },
      { path: 'admin/evaluacion-tribunal', component: EvaluacionTribunalComponent },
    ]
  },
  { path: '**', redirectTo: 'login' }
];
