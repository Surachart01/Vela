import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingBarService } from '../../services/loading-bar.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingBar.visible()) {
      <div class="loading-bar-container">
        <div class="loading-bar" [style.width.%]="loadingBar.progress()"></div>
      </div>
    }
  `,
  styles: [`
    .loading-bar-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 10001;
      background: rgba(0, 0, 0, 0.05);
    }
    .loading-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #10b981);
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
      transition: width 0.3s ease-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingBarComponent {
  loadingBar = inject(LoadingBarService);
}
