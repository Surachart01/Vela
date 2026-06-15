import { Component, output, inject, ChangeDetectionStrategy, signal, computed, input, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../services/translation.service';
import { MasterDataService } from '../../../services/master-data.service';
import { MarkupCalculatorService } from '../../../services/markup-calculator.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-excursion-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './excursion-modal.html',
  styleUrl: './excursion-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExcursionModalComponent implements OnInit {
  public translationService = inject(TranslationService);
  public masterData = inject(MasterDataService);
  private fb = inject(FormBuilder);
  private markupCalc = inject(MarkupCalculatorService);
  public authService = inject(AuthService);

  initialData = input<any>(null);
  minDate = input<string>('');
  agentMarkup = input<any>(null);
  numberOfAdults = input<number>(0);
  numberOfChildren = input<number>(0);
  public t = this.translationService.translations;

  selectedCity = signal<string>('');

  filteredExcursions = computed(() => {
    const city = this.selectedCity();
    let list = this.masterData.excursions();
    if (city && city !== 'Select city') {
      list = list.filter((e: any) => e.city === city);
    }
    return [...list].sort((a: any, b: any) => 
      (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
    );
  });
  
  close = output<void>();
  save = output<any>();

  excursionForm: FormGroup;

  isPatching = false;

  constructor() {
    this.excursionForm = this.fb.group({
      country: ['Thailand', Validators.required],
      city: ['', Validators.required],
      date: ['', Validators.required],
      excursion: ['', Validators.required], // Will store excursion ID
      hotel: ['', Validators.required],
      pickupTime: [''],
      typeOfExcursion: ['', Validators.required],
      display_order: [0],
      price: [0, Validators.required],
      remarks: ['']
    });

    this.excursionForm.get('city')?.valueChanges.subscribe(val => {
      this.selectedCity.set(val);
      this.excursionForm.patchValue({ excursion: '' }, { emitEvent: false });
    });
    this.selectedCity.set(this.excursionForm.get('city')?.value || '');

    this.excursionForm.valueChanges.subscribe(() => {
      if (!this.isPatching) {
        this.getPrice(true);
      }
    });

    effect(() => {
      const d = this.initialData();
      if (d) {
        this.isPatching = true;
        this.excursionForm.patchValue({
          city: d.city || '',
          date: d.date || '',
          excursion: d.excursion_id || '',
          hotel: d.hotel || '',
          pickupTime: d.pickup || '',
          typeOfExcursion: d.toe || '',
          display_order: d.display_order ?? 0,
          price: d.price || 0,
          remarks: d.remarks || ''
        });
        this.selectedCity.set(d.city || '');
        this.isPatching = false;
      } else {
        this.isPatching = true;
        this.excursionForm.reset({ country: 'Thailand', price: 0 });
        this.isPatching = false;
      }
    });
  }

  ngOnInit() {}

  getPrice(silent: boolean = false) {    const excursionId = this.excursionForm.get('excursion')?.value;
    const excursionObj = this.masterData.excursions().find((e: any) =>
      e.id?.toString() === excursionId?.toString()
    );
    if (!excursionObj) {
      if (!silent) this.errorMessage.set('Please select an excursion first.');
      return;
    }
    const adults = this.numberOfAdults();
    const children = this.numberOfChildren();
    const toe = this.excursionForm.get('typeOfExcursion')?.value;
    
    if (toe === 'SIC') {
      const adultBase = Number(excursionObj.sic_price_adult) || 0;
      const childBase = Number(excursionObj.sic_price_child) || 0;

      let total = this.markupCalc.round((adultBase * adults) + (childBase * children));

      const markup = this.agentMarkup();
      if (markup) {
        total = this.markupCalc.applyMarkup(
          total,
          markup.excursion_markup_unit,
          markup.excursion_markup_value
        );
      }

      this.excursionForm.patchValue({ price: total }, { emitEvent: false });
      this.errorMessage.set(null);
    } else if (toe === 'PVT') {
      const date = this.excursionForm.get('date')?.value;
      if (!date) {
        if (!silent) this.errorMessage.set('Please select a date to calculate PVT price.');
        return;
      }
      const totalPax = adults + children;
      if (totalPax <= 0) {
        if (!silent) this.errorMessage.set('Number of Pax must be greater than 0.');
        return;
      }
      
      const prices: any[] = excursionObj.prices || [];
      if (prices.length === 0) {
        if (!silent) this.errorMessage.set('No PVT prices found in master data.');
        return;
      }
      
      let targetDateStr = date;
      if (typeof date === 'string' && date.includes('/')) {
        const parts = date.split('/');
        if (parts.length === 3) targetDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const targetDate = new Date(targetDateStr).getTime();
      
      const validPrices = prices.filter(p => {
        if (!p.start_date || !p.end_date) return false;
        const df = new Date(p.start_date).getTime();
        const dt = new Date(p.end_date).getTime();
        return targetDate >= df && targetDate <= dt;
      });
      
      if (validPrices.length === 0) {
        if (!silent) this.errorMessage.set('No PVT prices found for the selected date range.');
        return;
      }
      
      validPrices.sort((a, b) => (Number(b.pax) || 0) - (Number(a.pax) || 0));
      let matchedPriceRow = validPrices.find(p => Number(p.pax) === totalPax);
      if (!matchedPriceRow) {
        matchedPriceRow = validPrices.find(p => Number(p.pax) <= totalPax);
        if (!matchedPriceRow) {
           matchedPriceRow = validPrices[validPrices.length - 1]; 
        }
      }
      
      const pvtPrice = Number(matchedPriceRow.price || 0);
      const pvtBaseTotal = pvtPrice * totalPax;

      let finalPrice = this.markupCalc.round(pvtBaseTotal);      

      const markup = this.agentMarkup();
      if (markup) {
        finalPrice = this.markupCalc.applyMarkup(
          finalPrice,
          markup.excursion_markup_unit,
          markup.excursion_markup_value
        );
      }

      this.excursionForm.patchValue({ price: finalPrice }, { emitEvent: false });
      this.errorMessage.set(null);
    } else {
      if (!silent) this.errorMessage.set('Please select Excursion Type (SIC/PVT).');
    }
  }

  errorMessage = signal<string | null>(null);

  onSave() {
    if (this.excursionForm.valid) {
      this.errorMessage.set(null);
      const excursionId = this.excursionForm.get('excursion')?.value;
      const excursionObj = this.masterData.excursions().find(e => e.id == excursionId);
      const data = this.excursionForm.getRawValue();
      data.excursion_name = excursionObj ? excursionObj.name : '';
      data.excursion_id = excursionId;
      this.save.emit(data);
    } else {
      this.errorMessage.set('Please fill in all required fields.');
      this.excursionForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
        }
      }, 100);
    }
  }
}
