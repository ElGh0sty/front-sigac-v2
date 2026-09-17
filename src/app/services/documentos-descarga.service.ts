import { Injectable } from '@angular/core';

export interface DocumentoReporteDatos {
  titulo?: string;
  subtitulo?: string;
  codigoResolucion?: string;
  periodo?: string;
  fechaEmision?: string;
  materia?: string;
  materiaNombre?: string;
  catedraNombre?: string;
  docente?: string;
  docenteNombre?: string;
  ayudante?: string;
  ayudanteNombre?: string;
  estudianteNombre?: string;
  cedulaAyudante?: string;
  horas?: number;
  horasCumplidas?: number;
  horasTotales?: number;
  horasCompletadas?: number;
  modalidad?: string;
  diasPorSemana?: number;
  temas?: string;
  actividadesRealizadas?: string;
  estado?: string;
  mes?: string;
  anio?: number;
  anexos?: any;
  coordinadorNombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentosDescargaService {

  /**
   * Construye la plantilla HTML del informe oficial de ayudantía.
   */
  construirHtmlInformeAyudantia(datos: DocumentoReporteDatos, autoPrint = false): string {
    const fecha = datos.fechaEmision || new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const sub = datos.subtitulo || 'Rendición Técnico-Pedagógica y Cumplimiento de Horas';
    const ayudanteNombre = datos.ayudante || datos.ayudanteNombre || datos.estudianteNombre || 'Estudiante Ayudante';
    const materiaNombre = datos.materia || datos.materiaNombre || datos.catedraNombre || 'Cátedra Asignada';
    const docenteNombre = datos.docente || datos.docenteNombre || 'Docente Responsable';
    const horasEjecutadas = datos.horas || datos.horasCumplidas || datos.horasCompletadas || 40;
    const codigoRes = datos.codigoResolucion || 'RESOLUCIÓN-UTEQ-2026-001';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${codigoRes} - Informe Oficial UTEQ</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12pt; color: #000; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; background-color: #ffffff; color: #1e293b; max-width: 900px; margin: 0 auto; line-height: 1.5; }
    .header { border-bottom: 3px solid #047857; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-logo { text-align: left; }
    .header-logo h1 { color: #047857; font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .header-logo h2 { color: #334155; font-size: 13px; font-weight: 600; margin: 4px 0 0 0; }
    .header-meta { text-align: right; font-size: 11px; color: #64748b; }
    .badge-resolucion { display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; margin-top: 4px; }
    .titulo-doc { text-align: center; margin: 24px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
    .titulo-doc h3 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
    .titulo-doc p { font-size: 12px; color: #64748b; margin: 4px 0 0 0; }
    .table-info { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    .table-info td, .table-info th { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    .table-info th { background-color: #f8fafc; font-weight: 700; color: #334155; width: 30%; }
    .firmas { margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; }
    .firma-box { flex: 1; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 11px; color: #334155; }
    .btn-print { background-color: #047857; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right;">
    <button onclick="window.print()" class="btn-print">🖨️ Imprimir / Guardar como PDF</button>
  </div>
  <div class="header">
    <div class="header-logo">
      <h1>UNIVERSIDAD TÉCNICA ESTATAL DE QUEVEDO</h1>
      <h2>FACULTAD DE CIENCIAS DE LA COMPUTACIÓN</h2>
    </div>
    <div class="header-meta">
      <div>Fecha: ${fecha}</div>
      <div class="badge-resolucion">${codigoRes}</div>
    </div>
  </div>
  <div class="titulo-doc">
    <h3>INFORME OFICIAL DE CUMPLIMIENTO DE AYUDANTÍA</h3>
    <p>${sub}</p>
  </div>
  <table class="table-info">
    <tr><th>ESTUDIANTE AYUDANTE:</th><td>${ayudanteNombre}</td></tr>
    <tr><th>CÁTEDRA ASIGNADA:</th><td>${materiaNombre}</td></tr>
    <tr><th>DOCENTE RESPONSABLE:</th><td>${docenteNombre}</td></tr>
    <tr><th>HORAS EJECUTADAS:</th><td>${horasEjecutadas} horas acreditadas</td></tr>
    <tr><th>ESTADO OFICIAL:</th><td>${datos.estado || 'APROBADO Y REGISTRADO'}</td></tr>
  </table>
  <p style="font-size: 12px; text-align: justify; margin-top: 20px;">
    Se certifica que el estudiante ayudante ha cumplido a cabalidad con el plan de trabajo establecido para la asignatura, participando activamente en sesiones de refuerzo, tutorías académicas y soporte en laboratorios durante el periodo lectivo.
  </p>
  <div class="firmas">
    <div class="firma-box">
      <strong>${docenteNombre}</strong><br>Docente Responsable de Cátedra
    </div>
    <div class="firma-box">
      <strong>${datos.coordinadorNombre || 'Coordinación de Carrera'}</strong><br>Coordinador(a) de Carrera UTEQ
    </div>
  </div>
  ${autoPrint ? `<script>window.onload = function() { window.print(); }</script>` : ''}
</body>
</html>`;
  }

  descargarInformeAyudantiaPdf(datos: DocumentoReporteDatos): void {
    const htmlContent = this.construirHtmlInformeAyudantia(datos, true);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
    }
  }

  exportarConsolidadoExcel(listaDatos: DocumentoReporteDatos[]): void {
    const jsonStr = JSON.stringify(listaDatos, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Consolidado_Ayudantias_UTEQ_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  descargarArchivo(nombreArchivo: string, contenido: string, tipo: string = 'text/plain'): void {
    const blob = new Blob([contenido], { type: tipo });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  imprimirDocumentoOficial(htmlContenido: string, titulo: string = 'Documento UTEQ'): void {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContenido);
      win.document.close();
      win.print();
    }
  }
}
