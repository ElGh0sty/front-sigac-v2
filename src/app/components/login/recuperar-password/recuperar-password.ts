import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar-password.html',
  styleUrls: ['./recuperar-password.css']
})
export class RecuperarPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  modoRestablecer = false; // false = solicitar token, true = restablecer con token
  isSubmitting = false;
  solicitudEnviada = false;
  claveRestablecida = false;
  correoEnviado = '';
  mensajeError = '';
  mensajeExito = '';

  recoveryForm: FormGroup = this.fb.group({
    correo: ['', [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ]]
  });

  resetForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    token: ['', [Validators.required, Validators.minLength(4)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const email = params['email'] || params['correo'];
      if (token) {
        this.modoRestablecer = true;
        this.resetForm.patchValue({
          token,
          email: email || ''
        });
      }
    });
  }

  onSubmitSolicitud(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.mensajeError = '';
    const email = this.recoveryForm.value.correo.trim();

    // POST /api/Login/forgot-password con { email: string }
    this.authService.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.solicitudEnviada = true;
        this.correoEnviado = email;
        this.resetForm.patchValue({ email });
      },
      error: (err: any) => {
        // En caso de que el backend responda error, se notifica y se permite proceder
        this.isSubmitting = false;
        this.solicitudEnviada = true;
        this.correoEnviado = email;
        this.resetForm.patchValue({ email });
      }
    });
  }

  onSubmitReset(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { email, token, newPassword, confirmPassword } = this.resetForm.value;

    if (newPassword !== confirmPassword) {
      this.mensajeError = 'Las contraseñas no coinciden.';
      return;
    }

    this.isSubmitting = true;
    this.mensajeError = '';

    // POST /api/Login/reset-password con { email: string, token: string, newPassword: string }
    this.authService.resetPassword({
      email: email.trim(),
      token: token.trim(),
      newPassword
    }).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.claveRestablecida = true;
        this.mensajeExito = res?.mensaje || '¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión con tu nueva clave.';
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.mensajeError = err?.error?.message || err?.error || 'Token inválido o expirado. Por favor solicita un nuevo código.';
      }
    });
  }

  cambiarModo(restablecer: boolean): void {
    this.modoRestablecer = restablecer;
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  reintentar(): void {
    this.solicitudEnviada = false;
    this.claveRestablecida = false;
    this.recoveryForm.reset();
  }
}

