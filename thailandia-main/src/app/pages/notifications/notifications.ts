import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification } from '../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      <div class="header-section">
        <h1>Notifications</h1>
        <button class="btn-read-all" (click)="notificationService.markAllAsRead().subscribe()">
          Mark all as read
        </button>
      </div>

      <div class="notif-list">
        @for (notif of notificationService.allNotifications(); track notif.id) {
          <div class="notif-card" [class.unread]="!notif.is_read" (click)="handleAction(notif)">
            <div class="icon-box" [ngClass]="notif.type.toLowerCase()">
              <i class="fa-solid" [ngClass]="{
                'fa-calendar-check': notif.type === 'Booking',
                'fa-file-invoice-dollar': notif.type === 'Quotation',
                'fa-arrows-rotate': notif.type === 'StatusUpdate'
              }"></i>
            </div>
            <div class="info">
              <p class="msg">{{ notif.message }}</p>
              <span class="time">{{ formatDate(notif.created_at) }}</span>
            </div>
            @if (!notif.is_read) {
              <div class="dot"></div>
            }
          </div>
        } @empty {
          <div class="empty-state">
            <i class="fa-solid fa-bell-slash"></i>
            <p>No notifications found</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .notifications-container { padding: 40px; max-width: 800px; margin: 0 auto; }
    .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 800; color: #1a1a1a; margin: 0; }
    .btn-read-all { background: none; border: none; color: #3E71FE; font-weight: 600; cursor: pointer; }
    .notif-list { display: flex; flex-direction: column; gap: 12px; }
    .notif-card { 
      background: white; border-radius: 12px; padding: 20px; display: flex; gap: 20px; 
      align-items: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border-left: 4px solid transparent;
    }
    .notif-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .notif-card.unread { background: #f0f5ff; border-left-color: #3E71FE; }
    .icon-box { 
      width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; 
      justify-content: center; font-size: 20px; color: white; background: #F26419; flex-shrink: 0;
    }
    .icon-box.quotation { background: #3E71FE; }
    .icon-box.statusupdate { background: #3D9F7D; }
    .info { flex: 1; }
    .msg { margin: 0; font-size: 16px; color: #333; font-weight: 500; }
    .unread .msg { font-weight: 700; }
    .time { font-size: 12px; color: #888; margin-top: 4px; display: block; }
    .dot { width: 12px; height: 12px; background: #3E71FE; border-radius: 50%; }
    .empty-state { text-align: center; padding: 60px; color: #ccc; }
    .empty-state i { font-size: 64px; margin-bottom: 16px; }
  `]
})
export class NotificationsComponent {
  public notificationService = inject(NotificationService);
  private router = inject(Router);

  formatDate(date: any) {
    const d = new Date(date);
    return d.toLocaleString();
  }

  handleAction(notif: AppNotification) {
    if (!notif.is_read) {
      this.notificationService.markAsRead(notif.id).subscribe();
    }
    const searchParam = notif.link_id || notif.uuid || notif.id;
    if (notif.type === 'Quotation' && !notif.message.includes('Booking updated')) {
      this.router.navigate(['/control-panel/quotations'], { queryParams: { search: searchParam } });
    } else {
      this.router.navigate(['/control-panel/bookings'], { queryParams: { search: searchParam } });
    }
  }
}
