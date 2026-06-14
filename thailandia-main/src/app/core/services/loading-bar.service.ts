import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingBarService {
  visible = signal(false);
  progress = signal(0);

  show() {
    this.visible.set(true);
    this.progress.set(10);
    this.startProgress();
  }

  hide() {
    this.progress.set(100);
    setTimeout(() => {
      this.visible.set(false);
      this.progress.set(0);
    }, 300);
  }

  private startProgress() {
    const interval = setInterval(() => {
      if (this.progress() >= 90 || !this.visible()) {
        clearInterval(interval);
        return;
      }
      this.progress.update(p => p + (Math.random() * 5));
    }, 200);
  }
}
