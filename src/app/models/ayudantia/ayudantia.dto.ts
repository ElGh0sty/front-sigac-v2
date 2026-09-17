// src/app/models/ayudantia/ayudantia.dto.ts
export interface PostulacionAyudantiaDto {
  catedraId: number;
}

export interface SolicitudAyudantiaDto {
  ayudantiaId: number;
  estudianteId: number;
  nombreEstudiante: string;
  correoEstudiante?: string;
  catedraId: number;
  nombreCatedra: string;
  estado: string;
  promedio?: number;
  porcentajeMalla?: number;
  notaCatedra?: number;
  fecha?: string;
  // Propiedades de Tribunal y Planificación de Reunión
  tieneTribunal?: boolean;
  presentacionId?: number | null;
  fechaPresentacion?: string | Date | null;
  reunionPlanificada?: boolean;
  jurados?: string[];
  estadoTribunal?: string;
  mensajeTribunal?: string;
}

export interface AsignacionAyudantiaDto {
  ayudantiaId: number;
  estudianteId?: number;
  catedraId?: number;
}

export interface GestionEstadoAyudantiaDto {
  nuevoEstado: string;
}

export interface ActividadAyudantiaDto {
  id: number;
  ayudantiaId: number;
  descripcion: string;
  fechaPlanificada: string;
  completada: boolean;
}

export interface BitacoraDto {
  id: number;
  fecha: string;
  actividadesRealizadas: string;
  evidenciaUrl: string;
}

export interface MonitoreoAyudantiaDto {
  ayudantiaId: number;
  nombreAyudante: string;
  planificacion: ActividadAyudantiaDto[];
  bitacoras: BitacoraDto[];
}

export interface RegistroBitacoraDto {
  ayudantiaId: number;
  actividadesRealizadas: string;
  evidenciaUrl: string;
}

export interface InformeMensualRequestDto {
  ayudantiaId: number;
  mes: number;
  anio: number;
  numeroResolucion?: string;
  tipoInforme?: string;
  horasTotales?: number;
  diasPorSemana?: number;
  modalidad?: string;
  temasImpartidos?: string;
  anexos?: any[];
}

export interface HistorialAyudantiaDto {
  ayudantiaId: number;
  estadoAyudantia: string;
  catedraId: number;
  nombreCatedra: string;
  semestreCatedra: string;
  docenteCatedra: string;
  estudianteId?: number;
  nombreEstudiante?: string;
  tieneTribunal?: boolean;
  reunionPlanificada?: boolean;
  fechaPresentacion?: string | Date | null;
  mensajeTribunal?: string;
}
