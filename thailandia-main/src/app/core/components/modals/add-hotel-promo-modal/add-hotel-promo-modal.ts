import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslationService } from '../../../services/translation.service';
import { DateInputComponent } from '../../date-input/date-input';

@Component({
  selector: 'app-add-hotel-promo-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './add-hotel-promo-modal.html',
  styleUrl: './add-hotel-promo-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddHotelPromoModalComponent {
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);
  public t = this.translationService.translations;

  @Input() isOpen = false;
  @Input() set promoData(data: unknown | null) {
    const d = data as Record<string, unknown> | null;
    if (d) {
      this.promoForm.patchValue(d);
      this.editIndex = d['id'] !== undefined ? d['id'] as number : null;
      this.cd.markForCheck();
    } else {
      this.promoForm.reset({
        earlyBird: null,
        minNights: null,
        discountAmount: null,
        discountType: '%',
        validForExtraBed: false,
        enabled: true,
        freeMealsAbf: null,
        freeMealsLunch: null,
        freeMealsDinner: null,
        description: '',
        travelDateFrom: '',
        travelDateTo: ''
      });
      this.editIndex = null;
    }
  }

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<unknown>();

  editIndex: number | null = null;

  promoForm: FormGroup = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    bookingDateFrom: [''],
    bookingDateTo: [''],
    travelDateFrom: [''],
    travelDateTo: [''],
    earlyBird: [null],
    minNights: [{value: null, disabled: true}],
    discountAmount: [null],
    discountType: ['%'],
    validForExtraBed: [false],
    enabled: [true],
    freeMealsAbf: [null],
    freeMealsLunch: [null],
    freeMealsDinner: [null],
    description: ['']
  });

  closeModal() {
    this.close.emit();
  }

  onSubmit() {
    if (this.promoForm.valid) {
      const data: Record<string, unknown> = { ...this.promoForm.value };
      if (this.editIndex !== null) {
        data['id'] = this.editIndex;
      }
      this.save.emit(data);
      this.promoForm.reset({
        earlyBird: null,
        minNights: null,
        discountAmount: null,
        discountType: '%',
        validForExtraBed: false,
        enabled: true,
        freeMealsAbf: null,
        freeMealsLunch: null,
        freeMealsDinner: null,
        description: '',
        travelDateFrom: '',
        travelDateTo: ''
      });
    } else {
      this.promoForm.markAllAsTouched();
    }
  }
}
