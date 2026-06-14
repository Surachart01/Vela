import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-popup.component.html',
  styleUrl: './notification-popup.component.css'
})
export class NotificationPopupComponent implements OnDestroy {
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  
  // Current active notification
  activeNotification = signal<AppNotification | null>(null);
  isVisible = signal(false);
  private timeout: any;
  private subscription: Subscription;

  constructor() {
    this.subscription = this.notificationService.notifications$.subscribe(notif => {
      this.showNotification(notif);
    });
  }

  showNotification(notif: AppNotification) {
    // If a notification is already visible, clear it first
    this.isVisible.set(false);
    
    setTimeout(() => {
      this.activeNotification.set(notif);
      this.isVisible.set(true);
      
      // Auto-hide after 7 seconds
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        this.close();
      }, 7000);
    }, 100);
  }

  close() {
    this.isVisible.set(false);
    setTimeout(() => {
      this.activeNotification.set(null);
    }, 300);
  }

  handleAction() {
    const notif = this.activeNotification();
    if (!notif) return;

    this.close();
    
    // Navigate to the transaction
    if (notif.type === 'Booking' || notif.type === 'StatusUpdate' || notif.type === 'Quotation') {
      this.router.navigate(['/control-panel/bookings'], { queryParams: { search: notif.uuid || notif.id } });
    } else {
      this.router.navigate(['/home']); // Fallback to home instead of an invalid route
    }
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
    if (this.timeout) clearTimeout(this.timeout);
  }
}
