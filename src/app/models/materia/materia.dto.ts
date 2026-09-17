// src/app/models/materia/materia.dto.ts
export interface MateriaDto {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string;
  docenteResponsableId: number;
  cupos?: number;
  cuposDisponibles?: number;
  postulantesPendientes?: number;
  estudiantesPostulando?: number;
}

export interface RecursoDto {
  id?: number;
  titulo: string;
  descripcion?: string;
  url?: string;
  tipo?: string;
  materiaId?: number;
  fechaSubida?: string;
  temaId?: number;
  esVisible?: boolean;
  enlace?: string;
  fechaCreacion?: string;
  esEsencial?: boolean;
  temaNombre?: string;
  creadoPor?: string;
  nombreArchivo?: string;
  archivoDataUrl?: string;
  tamanoArchivoKb?: number;
  links?: string[];
  storageKey?: string;
  visto?: boolean;
}

export interface RecursoConEstadoDto extends RecursoDto {
  visto?: boolean;
}

export interface ActividadDto {
  id?: number;
  titulo: string;
  descripcion: string;
  tipo?: string;
  fechaEntrega: string;
  puntajeMaximo?: number;
  materiaId?: number;
  temaId?: number;
  estado?: string;
  ponderacion?: number;
  nota?: number;
  entregadoEl?: string;
  nombreArchivo?: string;
  archivoDataUrl?: string;
  tamanoArchivoKb?: number;
}

export interface ClaseDto {
  id: number;
  nombre: string;
  materiaId: number;
  docenteId: number;
  estudianteIds: number[];
}

export interface ClaseSesionDto {
  id: number;
  materiaId: number;
  claseId?: number;
  docenteId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoClase: string;
  linkVirtual?: string;
  aplicacionVirtual?: string;
  edificioPresencial?: string;
  aulaPresencial?: string;
  pisoPresencial?: string;
}

export interface AsistenciaDto {
  id: number;
  claseSesionId: number;
  estudianteId: number;
  presente: boolean;
}

export interface CreateRecursoDto {
  titulo: string;
  descripcion?: string;
  tipo?: string;
  url?: string;
  temaId?: number;
  esVisible?: boolean;
  temaNombre?: string;
  esEsencial?: boolean;
  materiaId?: number;
  nombreArchivo?: string;
  archivoDataUrl?: string;
  tamanoArchivoKb?: number;
  links?: string[];
}

export interface CreateActividadDto {
  titulo: string;
  descripcion: string;
  tipo?: string;
  fechaEntrega: string;
  puntajeMaximo?: number;
  temaId?: number;
  materiaId?: number;
  ponderacion?: number;
  estado?: string;
  nombreArchivo?: string;
  archivoDataUrl?: string;
  tamanoArchivoKb?: number;
}

export interface CreateClaseDto {
  nombre: string;
  materiaId: number;
  docenteId: number;
  estudianteIds: number[];
}

export interface CreateClaseSesionDto {
  materiaId: number;
  claseId?: number;
  docenteId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoClase: string;
  linkVirtual?: string;
  aplicacionVirtual?: string;
  edificioPresencial?: string;
  aulaPresencial?: string;
  pisoPresencial?: string;
}
