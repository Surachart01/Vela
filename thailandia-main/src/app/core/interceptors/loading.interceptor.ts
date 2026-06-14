import { HttpInterceptorFn, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingBarService } from '../services/loading-bar.service';
import { finalize, Observable } from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const loadingBar = inject(LoadingBarService);
  
  // Skip loading bar for background notifications if needed, but for now show for all
  loadingBar.show();

  return next(req).pipe(
    finalize(() => {
      loadingBar.hide();
    })
  );
};
