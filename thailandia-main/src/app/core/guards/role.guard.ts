import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const user = authService.currentUser();
  const expectedRoles: string[] = route.data['roles'] || [];
  const pageId: string = route.data['pageId'] || '';

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // SuperAdmins can go anywhere
  if (user.role === 'superadmin') {
    return true;
  }

  // Check granular page access first if pageId is provided
  if (pageId && !authService.hasPageAccess(pageId)) {
    toastService.error('You do not have permission to access this page.');
    router.navigate([authService.getFirstAccessibleRoute()]);
    return false;
  }

  // Check role-based access
  if (expectedRoles.length > 0 && !expectedRoles.includes(user.role)) {
    toastService.error('You do not have permission to access this page.');
    router.navigate([authService.getFirstAccessibleRoute()]);
    return false;
  }

  return true;
};
