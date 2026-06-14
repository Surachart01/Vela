import { Component, ChangeDetectionStrategy, input, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-add-city-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-city-modal.html',
  styleUrl: './add-city-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddCityModalComponent {
  isOpen = input.required<boolean>();
  country = input.required<string>();
  
  close = output<void>();
  save = output<string>();

  private translationService = inject(TranslationService);
  public t = this.translationService.translations;
  private fb = inject(FormBuilder);

  form = this.fb.group({
    cityName: ['', Validators.required],
    country: [{value: '', disabled: true}]
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.form.reset();
        this.form.patchValue({ country: this.country() });
      }
    });
  }

  onSave() {
    if (this.form.valid) {
      this.save.emit(this.form.get('cityName')?.value!);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onClose() {
    this.close.emit();
  }
}
