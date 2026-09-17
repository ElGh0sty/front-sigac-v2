import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { getApiBase } from '../api';
import { ClaseService } from './clase.service';

export interface EstudianteDirectorioDto {
  id: number;
  nombre: string;
  correo: string;
  username: string;
  cedula?: string;
  matricula?: string;
  carrera?: string;
  telefono?: string;
  nota?: number;
  asistencia?: number;
  estado?: string;
}

const DIRECTORIO_BASE: EstudianteDirectorioDto[] = [];

@Injectable({
  providedIn: 'root'
})
export class DirectorioService {
  private http = inject(HttpClient);
  private claseService = inject(ClaseService);

  private readonly STORAGE_KEY = 'sigac_directorio_estudiantes_v2';
  private directorioSubject = new BehaviorSubject<EstudianteDirectorioDto[]>(this.loadStorage());
  public directorio$ = this.directorioSubject.asObservable();

  private get apiUrl() {
    return `${getApiBase()}/api/Estudiante`;
  }

  private loadStorage(): EstudianteDirectorioDto[] {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch { }
      }
    }
    return DIRECTORIO_BASE;
  }

  private saveStorage(data: EstudianteDirectorioDto[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
  }

  cargarDirectorio(): Observable<EstudianteDirectorioDto[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      tap((backendData) => {
        if (Array.isArray(backendData) && backendData.length > 0) {
          const mapped: EstudianteDirectorioDto[] = backendData.map(b => ({
            id: b.id || b.estudianteId || Math.floor(Math.random() * 10000),
            nombre: b.nombre || (b.nombres ? `${b.nombres} ${b.apellidos || ''}`.trim() : 'Estudiante'),
            correo: b.correo || b.email || '',
            username: b.username || (b.correo ? b.correo.split('@')[0] : 'estudiante'),
            cedula: b.cedula || '',
            matricula: b.matricula || '',
            carrera: b.carrera || 'Ingeniería de Software',
            nota: b.nota || 0,
            asistencia: b.asistencia || 0,
            estado: b.estado || 'Regular'
          }));
          this.directorioSubject.next(mapped);
          this.saveStorage(mapped);
        } else {
          this.directorioSubject.next(this.loadStorage());
        }
      }),
      catchError(() => {
        const local = this.loadStorage();
        this.directorioSubject.next(local);
        return of(local);
      })
    );
  }

  getDirectorioActual(): EstudianteDirectorioDto[] {
    return this.directorioSubject.value;
  }

  agregarEstudiante(nuevo: Partial<EstudianteDirectorioDto>): Observable<any> {
    const list = this.directorioSubject.value;
    const est: EstudianteDirectorioDto = {
      id: nuevo.id || Date.now(),
      nombre: nuevo.nombre || 'Estudiante Nuevo',
      correo: nuevo.correo || '',
      username: nuevo.username || (nuevo.correo ? nuevo.correo.split('@')[0] : 'estudiante'),
      cedula: nuevo.cedula || '',
      matricula: nuevo.matricula || '',
      carrera: nuevo.carrera || 'Ingeniería de Software',
      nota: nuevo.nota || 0,
      asistencia: nuevo.asistencia || 0,
      estado: nuevo.estado || 'Regular'
    };
    const updated = [est, ...list];
    this.directorioSubject.next(updated);
    this.saveStorage(updated);
    return this.http.post(this.apiUrl, est).pipe(
      catchError(() => of(est))
    );
  }
}
