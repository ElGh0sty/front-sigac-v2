import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RightSidebarComponent } from '../components/right-sidebar/right-sidebar';
import { RightSidebarAyudanteComponent } from '../components/ayudante/right-sidebar-ayudante/right-sidebar-ayudante';
import { RightSidebarDocenteComponent } from '../components/docente/right-sidebar-docente/right-sidebar-docente';
import { AuthService } from '../services/auth.service';
import { getApiBase, setApiBase, isModoAutonomo } from '../api';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    RightSidebarComponent,
    RightSidebarAyudanteComponent,
    RightSidebarDocenteComponent,
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
})
export class LayoutComponent implements OnInit {
  public authService = inject(AuthService);
  public router = inject(Router);

  rol: string = '';
  esAyudante: boolean = false;
  esEstudianteNormal: boolean = false;
  menuAbierto: boolean = false;
  username: string = 'Usuario';

  // Gestión de Backend y Modo Autónomo
  backendActual: string = '';
  mostrarModalBackend: boolean = false;
  inputBackendUrl: string = '';
  mensajeBackend: string = '';
  esExitoBackend: boolean | null = null;
  probandoConexion: boolean = false;

  ngOnInit() {
    this.rol = this.authService.getRole() || this.authService.currentUser?.rol || this.authService.currentUser?.role || localStorage.getItem('rol') || 'Estudiante';
    this.actualizarEstadoAyudante();
    this.actualizarBackend();

    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      this.username = storedUsername;
    }
  }

  normalizeRol(valor: string | null | undefined): string {
    return (valor || '').trim().toLowerCase();
  }

  esRolIgual(rolActual: string, nombreRol: string): boolean {
    return this.normalizeRol(rolActual) === this.normalizeRol(nombreRol);
  }

  get isAyudante(): boolean {
    const r = this.normalizeRol(
      this.authService.getRole() ||
        this.authService.currentUser?.rol ||
        this.authService.currentUser?.role,
    );
    return r.includes('ayudante');
  }

  get userDisplayName(): string {
    const nombre = localStorage.getItem('nombre');
    const apellido = localStorage.getItem('apellido');
    if (nombre) {
      return `${nombre} ${apellido || ''}`.trim();
    }
    const username = localStorage.getItem('username');
    if (username) {
      return username;
    }
    return this.username || 'Usuario';
  }

  get userInitials(): string {
    const name = this.userDisplayName;
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || 'US';
  }

  abrirCentroNotificaciones(): void {
    if (this.esRolIgual(this.rol, 'Docente')) {
      this.router.navigate(['/docente/gestion-estudiantes']);
    }
  }

  actualizarBackend() {
    const base = getApiBase();
    this.backendActual = isModoAutonomo() ? '' : base || '';
    this.inputBackendUrl = isModoAutonomo() ? '' : base || 'http://localhost:5001';
  }

  mostrarSeccion(seccion: string): boolean {
    const rolActual = this.normalizeRol(this.rol || this.authService.getRole() || 'Estudiante');
    const sec = this.normalizeRol(seccion);

    if (sec === 'jurado' || sec === 'tribunal') {
      return (
        rolActual === 'jurado' ||
        rolActual === 'tribunal' ||
        rolActual.includes('jurado') ||
        rolActual.includes('tribunal')
      );
    }

    if (sec === 'ayudante') {
      return (
        rolActual.includes('ayudante') ||
        this.authService.hasRole('Ayudante') ||
        this.authService.hasRole('AYUDANTE')
      );
    }

    return rolActual === sec || rolActual.includes(sec) || this.authService.hasRole(seccion);
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.authService.hasAnyRole(roles);
  }

  get userRoles(): string[] {
    return this.authService.getRoles();
  }

  actualizarEstadoAyudante() {
    this.esAyudante =
      this.isAyudante ||
      this.esRolIgual(this.rol, 'Ayudante') ||
      this.authService.hasRole('Ayudante') ||
      this.authService.hasRole('AYUDANTE');
    this.esEstudianteNormal = this.esRolIgual(this.rol, 'Estudiante') && !this.esAyudante;
    if (this.rol) {
      this.rol = this.rol.trim();
    }
  }

  activarModoAutonomo() {
    setApiBase('OFFLINE');
    this.actualizarBackend();
    this.mensajeBackend =
      '✓ Modo Autónomo activado con éxito. Se usará almacenamiento local en memoria sin errores de red.';
    this.esExitoBackend = true;
    setTimeout(() => {
      window.location.reload();
    }, 600);
  }

  guardarUrlBackend(url: string) {
    if (!url.trim()) {
      this.activarModoAutonomo();
      return;
    }
    this.probandoConexion = true;
    this.mensajeBackend = 'Probando conexión con el backend...';
    this.esExitoBackend = null;

    fetch(`${url.replace(/\/$/, '')}/api/Materias`, { method: 'GET' })
      .then((res) => {
        this.probandoConexion = false;
        if (res.ok || res.status === 401 || res.status === 403) {
          setApiBase(url.replace(/\/$/, ''));
          this.actualizarBackend();
          this.esExitoBackend = true;
          this.mensajeBackend = '✓ ¡Conexión exitosa! URL del backend guardada.';
          setTimeout(() => {
            this.mostrarModalBackend = false;
            window.location.reload();
          }, 800);
        } else {
          this.esExitoBackend = false;
          this.mensajeBackend = `El servidor respondió con código ${res.status}. Verifique la URL.`;
        }
      })
      .catch((err) => {
        this.probandoConexion = false;
        this.esExitoBackend = false;
        this.mensajeBackend =
          'No se pudo conectar con el servidor. ¿Está el backend encendido?';
      });
  }
}
