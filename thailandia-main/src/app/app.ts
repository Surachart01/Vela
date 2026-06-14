import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './core/components/header/header.component';
import { filter } from 'rxjs';
import { NotificationPopupComponent } from './core/components/notification-popup/notification-popup.component';
import { ToastComponent } from './core/components/toast/toast.component';
import { LoadingBarComponent } from './core/components/loading-bar/loading-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, NotificationPopupComponent, ToastComponent, LoadingBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);
  showHeader = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.showHeader.set(!event.urlAfterRedirects.includes('/login'));
    });
  }
}
