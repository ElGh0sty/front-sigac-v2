// src/app/models/evaluacion/evaluacion.dto.ts
export interface AlertaTempranaDto {
  estudianteId: number;
  nombreEstudiante: string;
  promedioActual: number;
  alertaActiva: boolean;
}

export interface EvaluacionDto {
  id: number;
  nombre: string;
  catedraId: number;
  esDiagnostica: boolean;
  adaptadaConIA: boolean;
  descripcionIA: string;
}

export interface CronogramaActividadDto {
  id: number;
  catedraId: number;
  descripcion: string;
  fechaPrevista: string;
  fechaReal?: string;
}

export interface IndicadorCualitativoDto {
  id: number;
  estudianteId: number;
  catedraId: number;
  indicador: string;
  observacion: string;
  fecha: string;
}

export interface ExpedienteDto {
  estudianteId: number;
  nombreEstudiante: string;
  historial: HistorialAcademicoDto[];
  indicadores: IndicadorCualitativoDto[];
}

export interface HistorialAcademicoDto {
  nombreCatedra: string;
  calificacionFinal: number;
  periodo: string;
}
