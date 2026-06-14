import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserApiService } from '../../core/services/api/user-api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private userApiService = inject(UserApiService);
  private translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  public t = this.translationService.translations;
  users = signal<any[]>([]);
  isLoading = signal(false);
  expandedUserId = signal<number | null>(null);
  
  // Categorized pages for better UI
  permissionGroups = [
    {
      name: 'Main Applications',
      icon: 'fa-layer-group',
      isGranular: false,
      pages: [
        { id: 'home', label: 'Home' },
        { id: 'payment', label: 'Payment' },
        { id: 'itinerary', label: 'Itinerary' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'settings', label: 'Settings' }
      ]
    },
    {
      name: 'Sales & Ops Modules',
      icon: 'fa-briefcase',
      isGranular: true,
      pages: [
        { id: 'quotation', label: 'Quotations' },
        { id: 'cp_bookings', label: 'Bookings/Reservations' }
      ]
    },
    {
      name: 'Control Panel Modules',
      icon: 'fa-screwdriver-wrench',
      isGranular: true,
      masterToggle: true,
      pages: [
        { id: 'cp_activities', label: 'Activities' },
        { id: 'cp_agents', label: 'Agents' },
        { id: 'cp_excursions', label: 'Excursions' },
        { id: 'cp_hotels', label: 'Hotels' },
        { id: 'cp_markups', label: 'Markups' },
        { id: 'cp_other_charges', label: 'Other Charges' },
        { id: 'cp_suppliers', label: 'Suppliers' },
        { id: 'cp_tools', label: 'Tools' },
        { id: 'cp_tours', label: 'Tours' },
        { id: 'cp_transfers', label: 'Transfers' },
        { id: 'cp_users', label: 'Users' }
      ]
    }
  ];

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/users`).subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load users');
        this.isLoading.set(false);
      }
    });
  }

  toggleExpand(userId: number) {
    if (this.expandedUserId() === userId) {
      this.expandedUserId.set(null);
    } else {
      this.expandedUserId.set(userId);
    }
  }

  getActivePagesCount(user: any): number {
    if (user.role === 'superadmin') return 19; // Total pages
    return user.permissions?.pages?.length || 0;
  }

  updateUserRole(userId: number, newRole: string) {
    this.http.patch(`${environment.apiUrl}/users/${userId}/role`, { role: newRole }).subscribe({
      next: () => {
        this.toastService.success(`User role updated to ${newRole}`);
        this.loadUsers();
      },
      error: () => this.toastService.error('Failed to update role')
    });
  }

  togglePagePermission(user: any, pageId: string) {
    const perms = JSON.parse(JSON.stringify(user.permissions || {}));
    if (!perms.pages) perms.pages = [];
    
    if (perms.pages.includes(pageId)) {
      perms.pages = perms.pages.filter((p: string) => p !== pageId);
    } else {
      perms.pages.push(pageId);
    }

    this.updatePermissions(user.id, perms);
  }

  toggleModulePermission(user: any, moduleId: string, action: string) {
    const perms = JSON.parse(JSON.stringify(user.permissions || {}));
    if (!perms.module_permissions) perms.module_permissions = {};
    if (!perms.module_permissions[moduleId]) {
      perms.module_permissions[moduleId] = { view: false, add: false, edit: false, delete: false };
    }
    
    perms.module_permissions[moduleId][action] = !perms.module_permissions[moduleId][action];
    
    // Auto-enable view if add/edit/delete is enabled
    if (perms.module_permissions[moduleId][action] && action !== 'view') {
      perms.module_permissions[moduleId].view = true;
    }

    this.updatePermissions(user.id, perms);
  }

  toggleGroupMaster(user: any, groupName: string) {
    if (groupName !== 'Control Panel Modules') return; // Currently only CP supports master toggle
    
    const perms = JSON.parse(JSON.stringify(user.permissions || {}));
    // Default to true if missing, so toggle it to false.
    const currentStatus = perms.control_panel_enabled !== false;
    perms.control_panel_enabled = !currentStatus;
    
    this.updatePermissions(user.id, perms);
  }

  toggleNotifications(user: any) {
    const perms = { ...user.permissions };
    perms.notifications_enabled = !perms.notifications_enabled;
    this.updatePermissions(user.id, perms);
  }

  deleteUser(id: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userApiService.deleteUser(id).subscribe(() => {
        this.toastService.success('User deleted successfully');
        this.loadUsers();
      });
    }
  }

  editUser(id: number) {
    this.router.navigate(['/control-panel/add-user', id]);
  }

  addUser() {
    this.router.navigate(['/control-panel/add-user']);
  }

  private updatePermissions(userId: number, permissions: any) {
    this.http.patch(`${environment.apiUrl}/users/${userId}/permissions`, { permissions }).subscribe({
      next: () => {
        this.toastService.success('Permissions updated successfully');
        this.loadUsers();
      },
      error: () => this.toastService.error('Failed to update permissions')
    });
  }
}
