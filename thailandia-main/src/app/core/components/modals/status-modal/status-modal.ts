import { Component, Output, EventEmitter, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-status-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './status-modal.html',
  styleUrl: './status-modal.css'
})
export class StatusModalComponent {
  private fb = inject(FormBuilder);
  public translationService = inject(TranslationService);
  public t = this.translationService.translations;

  @Input() currentStatus: string = 'Pending';
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  statusForm = this.fb.nonNullable.group({
    status: [this.currentStatus, Validators.required]
  });

  ngOnInit() {
    this.statusForm.patchValue({ status: this.currentStatus || 'Pending' });
  }

  onSave() {
    if (this.statusForm.valid) {
      this.save.emit(this.statusForm.value.status);
    }
  }
}
