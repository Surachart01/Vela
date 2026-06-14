import { Component, ChangeDetectionStrategy, input, output, inject, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-add-transfer-price-modal',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    DateInputComponent
  ],
  templateUrl: './add-transfer-price-modal.html',
  styleUrl: './add-transfer-price-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddTransferPriceModalComponent {
  isOpen = input.required<boolean>();
  priceData = input<any>(null);
  
  close = output<void>();
  save = output<any[]>();

  private translationService = inject(TranslationService);
  public t = this.translationService.translations;
  private fb = inject(FormBuilder);

  form = this.fb.group({
    dateFrom: ['', Validators.required],
    dateTo: ['', Validators.required],
    paxPrices: this.fb.array([])
  });

  get paxPrices() {
    return this.form.get('paxPrices') as FormArray;
  }

  modalTitle = computed(() => {
    const data = this.priceData();
    return data ? (this.t()['transfer.editPriceTitle'] || 'Edit Price Row') : (this.t()['transfer.addPriceTitle'] || 'Add Price Row');
  });

  addPaxPrice(pax: any = '', price: any = '') {
    this.paxPrices.push(this.fb.group({
      pax: [pax, Validators.required],
      price: [price, Validators.required]
    }));
  }

  removePaxPrice(index: number) {
    this.paxPrices.removeAt(index);
  }

  generatePaxRows(countStr: string) {
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count <= 0) return;
    
    this.paxPrices.clear();
    for (let i = 1; i <= count; i++) {
      this.addPaxPrice(i, '');
    }
  }

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const pd = this.priceData();
        this.paxPrices.clear();
        
        if (pd) {
          this.form.patchValue({
            dateFrom: pd.dateFrom,
            dateTo: pd.dateTo
          });
          this.addPaxPrice(pd.pax, pd.price);
        } else {
          this.form.reset();
          this.addPaxPrice(); // one default row
        }
      }
    });
  }

  errorMessage = signal<string | null>(null);

  onSave() {
    if (this.form.valid) {
      this.errorMessage.set(null);
      const formVal = this.form.value;
      const results = formVal.paxPrices?.map((pp: any) => ({
        dateFrom: formVal.dateFrom,
        dateTo: formVal.dateTo,
        pax: pp.pax,
        price: pp.price
      }));
      this.save.emit(results || []);
    } else {
      this.errorMessage.set('Please fill in all required fields (Dates and Prices).');
      this.form.markAllAsTouched();
    }
  }

  onCancel() {
    this.errorMessage.set(null);
    this.close.emit();
  }
}
