import { Component, inject, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslationService } from '../../services/translation.service';
import { NotificationBellComponent } from '../notification-bell/notification-bell';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class HeaderComponent {
  public translationService = inject(TranslationService);
  public authService = inject(AuthService);
  public t = this.translationService.translations;

  mobileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.mobile-menu-wrapper') && !target.closest('.hamburger-btn')) {
      this.mobileMenuOpen.set(false);
    }
  }
}
