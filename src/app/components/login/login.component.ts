import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';
import { getApiBase } from '../../api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  credentials = { username: '', password: '' };
  isLoading = false;
  errorMessage = '';
  currentBackendUrl = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    const base = getApiBase();
    this.currentBackendUrl = base ? base : 'Modo Autónomo (Sin Backend)';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private showLoginError(message: string): void {
    this.errorMessage = message;
    Swal.fire({
      icon: 'error',
      title: 'No se pudo iniciar sesión',
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#4f46e5'
    });
  }

  onLogin() {
    if (!this.credentials.username || !this.credentials.password) {
      const message = 'Por favor ingresa usuario/correo y contraseña.';
      this.showLoginError(message);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        const errorText = err?.error?.message || err?.error?.error || err?.error?.mensaje ||
          (err.status === 401 || err.status === 403
            ? 'Usuario o contraseña incorrectos. Verifica las credenciales.'
            : `Error de comunicación con el backend (${this.currentBackendUrl}). Verifica que el servidor esté corriendo en http://localhost:5001.`);
        this.showLoginError(errorText);
      },
    });
  }
}
