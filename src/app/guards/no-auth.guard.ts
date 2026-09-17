import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Evita acceso a la ruta de login si ya existe sesión válida (token).
 * Redirige a /dashboard cuando hay token válido.
 */
export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isTokenValid()) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
