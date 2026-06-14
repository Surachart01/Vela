import { Component, ChangeDetectionStrategy, input, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-add-markup-range-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-markup-range-modal.html',
  styleUrl: './add-markup-range-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddMarkupRangeModalComponent {
  isOpen = input.required<boolean>();
  selectedRange = input<any | null>(null);
  
  close = output<void>();
  save = output<any>();

  private translationService = inject(TranslationService);
  public t = this.translationService.translations;
  private fb = inject(FormBuilder);

  form = this.fb.group({
    priceFrom: [null as number | null, [Validators.required, Validators.min(0)]],
    priceTo: [null as number | null, [Validators.required, Validators.min(0)]],
    markupValue: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    effect(() => {
      const range = this.selectedRange();
      if (this.isOpen()) {
        if (range) {
          this.form.patchValue(range);
        } else {
          this.form.reset();
        }
      }
    });
  }

  onSave() {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onClose() {
    this.close.emit();
  }
}
