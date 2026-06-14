import { Injectable, signal, inject, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Subject, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from './auth.service';

export interface AppNotification {
// ... existing code ...
  id: string | number;
  type: 'Booking' | 'Quotation' | 'StatusUpdate';
  title?: string;
  message: string;
  link_id?: string;
  is_read: boolean;
  created_at: Date | string;
  // Legacy fields for pop-up support
  client_name?: string;
  uuid?: string;
  status?: string;
  agent?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private socket: Socket;
  private notificationSubject = new Subject<AppNotification>();
  notifications$ = this.notificationSubject.asObservable();
  
  // State for history and badge
  allNotifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  
  private userInteracted = signal(false);
  private audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

  constructor() {
    const socketUrl = environment.apiUrl.replace('/api/v1', '');
    this.socket = io(socketUrl);

    this.setupListeners();
    this.setupInteractionListener();
    this.loadHistory();
  }

  // Refactoring the room joining logic to use the already imported effect
  private initSocketRooms = effect(() => {
    const user = this.authService.currentUser() as AuthUser | null;
    if (user && this.socket) {
      this.socket.emit('join', {
        role: user.role,
        agent_id: user.agent_id
      });
    }
  });

  loadHistory() {
    this.http.get<{data: AppNotification[], total: number}>(`${environment.apiUrl}/notifications`)
      .subscribe(res => {
        this.allNotifications.set(res.data);
        this.updateUnreadCountLocal();
      });
  }

  private updateUnreadCountLocal() {
    const count = this.allNotifications().filter(n => !n.is_read).length;
    this.unreadCount.set(count);
  }

  markAsRead(id: string | number) {
    return this.http.patch<AppNotification>(`${environment.apiUrl}/notifications/${id}/read`, {})
      .pipe(tap(() => {
        this.allNotifications.update(list => 
          list.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        this.updateUnreadCountLocal();
      }));
  }

  markAllAsRead() {
    return this.http.patch(`${environment.apiUrl}/notifications/read-all`, {})
      .pipe(tap(() => {
        this.allNotifications.update(list => 
          list.map(n => ({ ...n, is_read: true }))
        );
        this.updateUnreadCountLocal();
      }));
  }

  private setupListeners() {
    this.socket.on('notification:new_trip', (data: any) => {
      if (!this.shouldShowNotification(data, 'new_trip')) return;

      const notification: AppNotification = {
        id: data.id,
        type: data.type === 'Quotation' ? 'Quotation' : 'Booking',
        message: data.message || `New ${data.type} from ${data.agent}: ${data.client_name}`,
        link_id: data.uuid || data.id,
        is_read: false,
        created_at: new Date(),
        client_name: data.client_name,
        uuid: data.uuid
      };
      this.handleIncomingNotification(notification);
    });

    this.socket.on('notification:status_update', (data: any) => {
      if (!this.shouldShowNotification(data, 'status_update')) return;

      const notification: AppNotification = {
        id: data.id,
        type: 'StatusUpdate',
        message: data.message || `Booking for ${data.client_name} updated to: ${data.status}`,
        link_id: data.uuid || data.id,
        is_read: false,
        created_at: new Date(),
        client_name: data.client_name,
        status: data.status
      };
      this.handleIncomingNotification(notification);
    });

    this.socket.on('notification:booking_converted', (data: any) => {
      // Treat logic similar to status_update for visibility
      if (!this.shouldShowNotification(data, 'status_update')) return;

      const notification: AppNotification = {
        id: data.id,
        type: 'Booking',
        title: 'Converted to Booking',
        message: data.message || `Quotation for ${data.client_name} converted to Booking`,
        link_id: data.uuid || data.id,
        is_read: false,
        created_at: new Date(),
        client_name: data.client_name
      };
      this.handleIncomingNotification(notification);
    });
  }

  private shouldShowNotification(data: any, eventType: 'new_trip' | 'status_update'): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    // 1. Check if notifications are enabled for this user
    if (user.permissions && user.permissions.notifications_enabled === false) {
      return false;
    }

    // 2. Role-based visibility
    if (user.role === 'admin' || user.role === 'superadmin') {
      return true;
    }

    // 3. User & Agent-specific logic (Non-Admins)
    // Non-admins NEVER see 'New Trip' notifications (those are exclusively for Admins)
    if (eventType === 'new_trip') {
      return false;
    }
    
    // Non-admins ONLY see status updates for THEIR OWN records
    // Based on socket architecture, they only receive events routed to their room,
    // but just in case we enforce a strict agent/user id match if present in the payload.
    if (data.agent_id && user.agent_id && data.agent_id !== user.agent_id) {
      return false;
    }

    return true;
  }

  private handleIncomingNotification(notif: AppNotification) {
    // Add to history list immediately
    this.allNotifications.update(list => [notif, ...list]);
    this.updateUnreadCountLocal();
    
    this.notificationSubject.next(notif);
    this.playNotificationSound();
  }

  private setupInteractionListener() {
    const listener = () => {
      this.userInteracted.set(true);
      window.removeEventListener('click', listener);
      window.removeEventListener('keydown', listener);
    };
    window.addEventListener('click', listener);
    window.addEventListener('keydown', listener);
  }

  playNotificationSound() {
    if (this.userInteracted()) {
      this.audio.currentTime = 0;
      this.audio.play().catch(err => console.warn('Sound play failed:', err));
    }
  }
}
