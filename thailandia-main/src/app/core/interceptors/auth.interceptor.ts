import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth-token');
  const authService = inject(AuthService);

  const cloned = token 
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 is standard Unauthorized. 
      // Our backend sends 403 for expired tokens (via sendStatus(403) which sends 'Forbidden' string)
      // and 403 JSON { message: 'Forbidden' } for permission denied.
      if (error.status === 401 || (error.status === 403 && typeof error.error === 'string' && error.error === 'Forbidden')) {
        console.warn('Token expired or invalid. Logging out...');
        alert('Your session has expired. Please log in again.');
        authService.logout();
      } else if (error.status === 403) {
        console.warn('Permission denied to access this resource.');
      }
      return throwError(() => error);
    })
  );
};
