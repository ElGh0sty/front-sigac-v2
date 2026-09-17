import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { EstudianteService, HistorialAyudantiaDto, PostulacionAyudantiaDto } from '../../../services/estudiante.service';
import { CoordinadorService, CatedraMinimoNotaDto } from '../../../services/coordinador.service';

export interface CatedraConvocatoria {
  id: number;
  nombre: string;
  codigo: string;
  docente: string;
  semestre?: string;
  minimoNota: number;
  cuposDisponibles: number;
  horasAyudantia: number;
  notaObtenidaEstudiante: number;
  materiaAprobada: boolean;
  cumpleRequisitos: boolean;
  motivoInvalidez?: string;
  yaPostulado?: boolean;
}

@Component({
  selector: 'app-postulacion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './postulacion.html',
  styleUrls: ['./postulacion.css']
})
export class PostulacionComponent implements OnInit, OnDestroy {
  private estudianteService = inject(EstudianteService);
  private coordinadorService = inject(CoordinadorService);
  private router = inject(Router);

  isLoading = true;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  // Requisitos del Estudiante
  esEstudianteRegular = true;
  tieneSanciones = false;
  cumpleMalla = true;
  cumplePromedioGeneral = true;

  promedioAcumulado = 8.92;
  promedioMinimoExigido = 8.0;

  // Cátedras disponibles para postulación
  convocatorias: CatedraConvocatoria[] = [];
  catedraSeleccionada: CatedraConvocatoria | null = null;
  historial: HistorialAyudantiaDto[] = [];

  // Formulario modal
  declaracionJurada = false;
  get aceptaDeclaracionJurada(): boolean {
    return this.declaracionJurada;
  }
  set aceptaDeclaracionJurada(val: boolean) {
    this.declaracionJurada = val;
  }

  get mostrarModalPostular(): boolean {
    return !!this.catedraSeleccionada;
  }

  disponibilidadHoraria = 'Completa (10 horas semanales)';
  motivoPostulacion = '';
  cartaMotivacion = '';
  temaSilaboPropuesto = '';

  private subs: Subscription[] = [];

  // Notas de expediente registradas por materia ID
  private expedienteNotasMateria: Record<number, number> = {
    101: 9.5, // Cálculo Avanzado
    102: 9.2, // Estructura de Datos
    103: 9.4, // Base de Datos I
    104: 8.8, // Ingeniería de Software I
    105: 9.0, // Sistemas Operativos
    201: 8.9  // Física Newtoniana
  };

  ngOnInit(): void {
    this.cargarDatosRequisitos();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private cargarDatosRequisitos() {
    this.isLoading = true;
    const estudianteId = 1; // Estudiante en sesión actual

    // Validar requisitos académicos vía API
    const subVal = this.estudianteService.validarMalla(estudianteId).subscribe({
      next: (val) => {
        if (val) {
          this.cumpleMalla = val.cumpleMalla !== false;
          this.cumplePromedioGeneral = val.cumplePromedioGeneral !== false;
          if (this.cumplePromedioGeneral && this.promedioAcumulado < 8.0) {
            this.promedioAcumulado = 8.92;
          }
          this.procesarConvocatorias();
        }
      }
    });
    this.subs.push(subVal);

    // 1. Obtener historial previo de postulaciones
    const subHist = this.estudianteService.historial$.subscribe(hist => {
      this.historial = hist || [];
      this.procesarConvocatorias();
    });
    this.subs.push(subHist);

    // 2. Obtener cátedras con nota mínima configurada
    const subCat = this.coordinadorService.getCatedrasConMinimoNota().subscribe({
      next: (list) => {
        this.procesarCatedrasConvocatoria(list);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
    this.subs.push(subCat);
  }

  private procesarCatedrasConvocatoria(catedras: CatedraMinimoNotaDto[]) {
    const publicadas = JSON.parse(localStorage.getItem('sigac_convocatorias_publicadas') || '[]');
    const idsPublicados = new Set<number>(publicadas
      .map((item: any) => Number(item.catedraId || item.materiaId || item.id || item.catedra || 0))
      .filter((id: number) => id > 0));
    const catedrasVisibles = catedras.filter(c => idsPublicados.size === 0 || idsPublicados.has(Number(c.id)));
    const listaFinal = (catedrasVisibles.length > 0 ? catedrasVisibles : catedras);

    this.convocatorias = listaFinal.map(c => {
      const notaEst = this.expedienteNotasMateria[c.id] ?? 8.5;
      const tienePromedioGeneral = this.cumplePromedioGeneral && this.promedioAcumulado >= this.promedioMinimoExigido;
      const tieneNotaMateria = notaEst >= c.minimoNota;
      const esApta = this.esEstudianteRegular && !this.tieneSanciones && this.cumpleMalla && tienePromedioGeneral && tieneNotaMateria;

      let motivo = '';
      if (!this.cumpleMalla) {
        motivo = 'No cumples con las materias aprobadas en la malla curricular requeridas para postular.';
      } else if (!tieneNotaMateria) {
        motivo = `Tu calificación previa en esta materia fue ${notaEst.toFixed(2)}/10, inferior al mínimo exigido de ${c.minimoNota.toFixed(2)}/10.`;
      } else if (!tienePromedioGeneral) {
        motivo = `Tu promedio acumulado (${this.promedioAcumulado}) es menor al 8.0 mínimo requerido por el Estatuto.`;
      }

      const yaPostulado = this.historial.some(h => h.catedraId === c.id);

      return {
        id: c.id,
        nombre: c.nombre,
        codigo: c.codigo,
        docente: c.docente || 'Docente Responsable',
        semestre: c.semestre,
        minimoNota: c.minimoNota,
        cuposDisponibles: 2,
        horasAyudantia: 80,
        notaObtenidaEstudiante: notaEst,
        materiaAprobada: notaEst >= 7.0,
        cumpleRequisitos: esApta,
        motivoInvalidez: motivo,
        yaPostulado
      };
    });
  }

  private procesarConvocatorias() {
    if (this.convocatorias.length > 0) {
      this.convocatorias = this.convocatorias.map(c => ({
        ...c,
        yaPostulado: this.historial.some(h => h.catedraId === c.id)
      }));
    }
  }

  abrirModalPostular(cat: CatedraConvocatoria) {
    if (!cat.cumpleRequisitos) {
      Swal.fire({
        icon: 'warning',
        title: 'Requisitos Incompletos',
        text: cat.motivoInvalidez || 'No cumples con los requisitos normativos para esta cátedra.',
        confirmButtonColor: '#059669'
      });
      return;
    }
    if (cat.yaPostulado) {
      Swal.fire({
        icon: 'info',
        title: 'Ya Postulado',
        text: 'Ya te encuentras postulado a esta asignatura en el presente periodo.',
        confirmButtonColor: '#059669'
      });
      return;
    }

    this.catedraSeleccionada = cat;
    this.declaracionJurada = false;
    this.disponibilidadHoraria = 'Completa (10 horas semanales)';
    this.motivoPostulacion = '';
    this.cartaMotivacion = '';
    this.temaSilaboPropuesto = `Propuesta de nivelación y talleres prácticos para la asignatura ${cat.nombre}`;
  }

  abrirModalPostulacion(cat: CatedraConvocatoria) {
    this.abrirModalPostular(cat);
  }

  cerrarModal() {
    this.catedraSeleccionada = null;
  }

  confirmarPostulacion() {
    if (!this.catedraSeleccionada) return;

    if (!this.declaracionJurada) {
      Swal.fire({
        icon: 'warning',
        title: 'Declaración Requerida',
        text: 'Debes aceptar la declaración jurada de cumplimiento de normas para continuar.',
        confirmButtonColor: '#059669'
      });
      return;
    }

    this.isSubmitting = true;
    const cat = this.catedraSeleccionada;

    const dto: PostulacionAyudantiaDto = {
      estudianteId: 1,
      catedraId: cat.id,
      nombreCatedra: cat.nombre,
      promedioEstudiante: this.promedioAcumulado,
      notaEstudianteEnCatedra: cat.notaObtenidaEstudiante,
      porcentajeMallaAprobada: 65.0,
      disponibilidadHoraria: this.disponibilidadHoraria,
      motivoPostulacion: this.motivoPostulacion || this.cartaMotivacion,
      temaSilaboPropuesto: this.temaSilaboPropuesto
    };

    this.estudianteService.postularAyudantia(dto).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.cerrarModal();

        Swal.fire({
          icon: 'success',
          title: '¡Postulación Exitosa!',
          text: `Tu postulación a la cátedra de ${cat.nombre} ha sido registrada correctamente. El expediente ha sido enviado a Coordinación de Carrera.`,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Ver Mis Postulaciones'
        }).then(() => {
          this.router.navigate(['/estudiante/informes']);
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error al postular:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error en la Postulación',
          text: 'Ocurrió un error al enviar tu postulación. Inténtalo nuevamente.',
          confirmButtonColor: '#059669'
        });
      }
    });
  }
}
