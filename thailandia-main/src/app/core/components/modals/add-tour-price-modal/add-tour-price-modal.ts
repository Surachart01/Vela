import { Component, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-add-tour-price-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './add-tour-price-modal.html',
  styleUrls: ['./add-tour-price-modal.css']
})
export class AddTourPriceModalComponent {
  isOpen = input.required<boolean>();
  close = output<void>();
  save = output<any>();
  editData = input<any | null>(null);

  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  t = this.translationService.translations;

  priceForm = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    pax: [null, [Validators.required, Validators.min(1)]],
    singlePrice: [null, [Validators.required, Validators.min(0)]],
    doublePrice: [null, [Validators.required, Validators.min(0)]],
    triplePrice: [null, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const data = this.editData();
        if (data) {
          this.priceForm.patchValue({
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            pax: data.pax ?? 1,
            singlePrice: data.singlePrice ?? null,
            doublePrice: data.doublePrice ?? null,
            triplePrice: data.triplePrice ?? null
          });
        } else {
          this.priceForm.reset();
        }
      } else {
        this.priceForm.reset();
      }
    });
  }

  handleClose() {
    this.priceForm.reset();
    this.close.emit();
  }

  handleSave() {
    if (this.priceForm.valid) {
      this.save.emit(this.priceForm.value);
      this.handleClose();
    } else {
      this.priceForm.markAllAsTouched();
    }
  }
}
