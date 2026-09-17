import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de roles funcional inclusivo basado en `hasAnyRole`.
 * Permite usuarios con múltiples roles simultáneos sin exclusiones rígidas.
 *
 * Puede utilizarse de dos formas en `app.routes.ts`:
 * 1. `canActivate: [roleGuard(['Administrador', 'Coordinador'])]`
 * 2. `canActivate: [roleMatchGuard], data: { roles: ['Administrador', 'Coordinador'] }`
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const rolesRequeridos = allowedRoles && allowedRoles.length > 0
      ? allowedRoles
      : (route.data?.['roles'] as string[]) || [];

    if (!authService.isTokenValid()) {
      authService.logout();
      router.navigate(['/login']);
      return false;
    }

    if (rolesRequeridos.length === 0 || authService.hasAnyRole(rolesRequeridos)) {
      return true;
    }

    console.warn(`[roleGuard] Acceso denegado a "${state.url}". Requiere uno de:`, rolesRequeridos, 'Roles activos:', authService.getRoles());
    authService.logout();
    router.navigate(['/login']);
    return false;
  };
};

export const roleMatchGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const rolesRequeridos = (route.data?.['roles'] as string[]) || [];

  if (!authService.isTokenValid()) {
    authService.logout();
    router.navigate(['/login']);
    return false;
  }

  if (rolesRequeridos.length === 0 || authService.hasAnyRole(rolesRequeridos)) {
    return true;
  }

  console.warn(`[roleMatchGuard] Acceso denegado a "${state.url}". Requiere:`, rolesRequeridos, 'Roles actuales:', authService.getRoles());
  authService.logout();
  router.navigate(['/login']);
  return false;
};
