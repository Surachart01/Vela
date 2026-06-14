import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="toast.type" (click)="toastService.remove(toast.id)">
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') { <i class="fa fa-check-circle"></i> }
              @case ('error') { <i class="fa fa-exclamation-circle"></i> }
              @case ('warning') { <i class="fa fa-exclamation-triangle"></i> }
              @default { <i class="fa fa-info-circle"></i> }
            }
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button class="toast-close">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      min-width: 300px;
      max-width: 450px;
      padding: 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border-left: 6px solid #ccc;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast.success { border-left-color: #10b981; }
    .toast.error { border-left-color: #ef4444; }
    .toast.warning { border-left-color: #f59e0b; }
    .toast.info { border-left-color: #3b82f6; }
    
    .toast-icon { font-size: 20px; }
    .success .toast-icon { color: #10b981; }
    .error .toast-icon { color: #ef4444; }
    .warning .toast-icon { color: #f59e0b; }
    .info .toast-icon { color: #3b82f6; }
    
    .toast-message {
      font-weight: 500;
      color: #1f2937;
      flex: 1;
    }
    
    .toast-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #9ca3af;
      cursor: pointer;
      padding: 0 4px;
    }
    .toast-close:hover { color: #4b5563; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
  toastService = inject(ToastService);
}
