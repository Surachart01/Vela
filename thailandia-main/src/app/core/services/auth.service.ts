import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  agent_id: number | null;
  permissions?: any;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = environment.AUTH_KEY;
  private readonly USER_KEY = environment.USER_KEY;

  private _currentUser = signal<AuthUser | null>(this.loadUser());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly isSuperAdmin = computed(() => this._currentUser()?.role === 'superadmin');
  readonly isAdmin = computed(() => ['admin', 'superadmin'].includes(this._currentUser()?.role || ''));
  readonly role = computed(() => this._currentUser()?.role || 'guest');
  readonly isAgent = computed(() => this._currentUser()?.role === 'agent');
  
  hasPageAccess(pageId: string): boolean {
    const user = this._currentUser();
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    
    const perms = user.permissions;
    if (!perms || !perms.pages) return false;
    
    return perms.pages.includes(pageId);
  }

  hasControlPanelAccess(): boolean {
    const user = this._currentUser();
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    
    // Default to true if the property is missing to maintain legacy behavior
    // but check explicitly for the new flag if it exists.
    const perms = user.permissions;
    if (!perms) return false;
    
    return perms.control_panel_enabled !== false;
  }
  
  hasModulePermission(moduleId: string, action: 'view' | 'add' | 'edit' | 'delete'): boolean {
    const user = this._currentUser();
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    
    const perms = user.permissions;
    if (!perms) return false;
    if (perms.all) return true;
    
    const modulePerms = perms.module_permissions?.[moduleId];
    if (!modulePerms) return false;
    
    return !!modulePerms[action];
  }

  canAdd(moduleId: string): boolean { return this.hasModulePermission(moduleId, 'add'); }
  canEdit(moduleId: string): boolean { return this.hasModulePermission(moduleId, 'edit'); }
  canDelete(moduleId: string): boolean { return this.hasModulePermission(moduleId, 'delete'); }
  canView(moduleId: string): boolean { return this.hasModulePermission(moduleId, 'view'); }

  /**
   * Finds the best landing page for the user based on their permissions.
   * Priority order: Home > Quotation > Bookings > etc.
   */
  getFirstAccessibleRoute(): string {
    const user = this._currentUser();
    if (!user) return '/login';
    if (user.role === 'superadmin') return '/home';

    const perms = user.permissions;
    if (!perms || !perms.pages || perms.pages.length === 0) {
      return '/notifications'; // Safe generic page for everyone
    }

    // Priority-ordered list of page IDs and their corresponding routes
    const routePriority = [
      { id: 'home', path: '/home' },
      { id: 'quotation', path: '/quotation' },
      { id: 'cp_bookings', path: '/control-panel/bookings' },
      { id: 'payment', path: '/payment' },
      { id: 'itinerary', path: '/itinerary' },
      { id: 'analytics', path: '/analytics' },
      { id: 'cp_tours', path: '/control-panel/tours' },
      { id: 'cp_hotels', path: '/control-panel/hotels' }
    ];

    for (const route of routePriority) {
      if (perms.pages.includes(route.id)) {
        return route.path;
      }
    }

    // fallback to any first permitted page found
    const firstPermId = perms.pages[0];
    const anyRouteMap: Record<string, string> = {
      'cp_activities': '/control-panel/activities',
      'cp_agents': '/control-panel/agents',
      'cp_excursions': '/control-panel/excursions',
      'cp_hotels': '/control-panel/hotels',
      'cp_markups': '/control-panel/markups',
      'cp_other_charges': '/control-panel/other-charges',
      'cp_suppliers': '/control-panel/suppliers',
      'cp_tools': '/control-panel/tools',
      'cp_tours': '/control-panel/tours',
      'cp_transfers': '/control-panel/transfers',
      'cp_users': '/control-panel/users',
      'settings': '/settings'
    };

    return anyRouteMap[firstPermId] || '/notifications';
  }

  private loadUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this._currentUser.set(res.user);
      })
    );
  }

  googleLogin(idToken: string) {
    // This is where you would send the token to your backend
    // return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/google-login`, { token: idToken }).pipe(...)
    console.log('Token to be sent to backend:', idToken);
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/google-login`, { idToken });
  }

  logout() {
    // Selectively remove only auth-related keys.
    // We intentionally do NOT clear all of localStorage so that user
    // preferences such as 'remember_user' are preserved across sessions.
    console.log('[AuthService] logout(): removing auth keys from localStorage');
    console.log('[AuthService] logout(): localStorage before =>', { ...localStorage });
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    console.log('[AuthService] logout(): localStorage after  =>', { ...localStorage });
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  updatePassword(oldPassword: string, newPassword: string) {
    return this.http.patch(`${environment.apiUrl}/auth/update-password`, { oldPassword, newPassword });
  }
}
