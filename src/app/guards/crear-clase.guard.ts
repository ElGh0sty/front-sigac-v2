import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger la creación de clases.
 * Regla de negocio: Validación inclusiva para permitir el acceso únicamente si
 * el usuario cuenta con rol de Administrador o Coordinador.
 * Un usuario puede tener múltiples roles (por ejemplo, Docente Y Coordinador a la vez).
 */
export const crearClaseGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Validación inclusiva: permitir acceso si tiene rol Administrador o Coordinador
  if (authService.hasAnyRole(['Administrador', 'Coordinador'])) {
    return true;
  }

  // Denegar para cualquier otro caso
  console.warn('Acceso denegado: Se requiere rol Administrador o Coordinador para crear clases.');
  router.navigate(['/clases']);
  return false;
};
