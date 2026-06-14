import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css'
})
export class NotificationBellComponent {
  public notificationService = inject(NotificationService);
  public authService = inject(AuthService);
  private router = inject(Router);
  
  isDropdownOpen = signal(false);

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isDropdownOpen.update(v => !v);
  }

  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen.set(false);
  }

  handleNotificationClick(notif: AppNotification) {
    this.isDropdownOpen.set(false);
    
    // Mark as read in background
    if (!notif.is_read) {
      this.notificationService.markAsRead(notif.id).subscribe();
    }

    // Navigate based on type
    const searchParam = notif.link_id || notif.uuid || notif.id;
    if (notif.type === 'Quotation' || notif.type === 'Booking' || notif.type === 'StatusUpdate') {
      this.router.navigate(['/control-panel/bookings'], { queryParams: { search: searchParam } });
    } else {
      this.router.navigate(['/home']);
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }

  formatDate(date: Date | string) {
    const d = new Date(date);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${time} ${day}/${month}/${year}`;
  }
}
