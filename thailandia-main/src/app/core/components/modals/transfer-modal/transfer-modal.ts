import { Component, output, inject, ChangeDetectionStrategy, signal, computed, input, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../services/translation.service';
import { MasterDataService } from '../../../services/master-data.service';
import { MarkupCalculatorService } from '../../../services/markup-calculator.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-transfer-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './transfer-modal.html',
  styleUrl: './transfer-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransferModalComponent implements OnInit {
  public translationService = inject(TranslationService);
  public masterData = inject(MasterDataService);
  private fb = inject(FormBuilder);
  private markupCalc = inject(MarkupCalculatorService);
  public authService = inject(AuthService);

  initialData = input<any>(null);
  flights = input<any[]>([]);
  minDate = input<string>('');
  agentMarkup = input<any>(null);
  numberOfAdults = input<number>(0);
  numberOfChildren = input<number>(0);
  public t = this.translationService.translations;

  selectedCity = signal<string>('');

  filteredTransfers = computed(() => {
    const city = this.selectedCity();
    let list = this.masterData.transfers();
    if (city && city !== 'Select city') {
      list = list.filter((t: any) => t.city === city);
    }
    return [...list].sort((a: any, b: any) => 
      (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
    );
  });
  
  close = output<void>();
  save = output<any>();

  transferForm: FormGroup;

  isPatching = false;

  constructor() {
    this.transferForm = this.fb.group({
      country: ['Thailand', Validators.required],
      city: ['', Validators.required],
      date: ['', Validators.required],
      transfer: ['', Validators.required],
      display_order: [0],
      from: [''],
      to: [''],
      flight: [''],
      flightTime: [''],
      selectedFlightIndex: [''],
      typeOfTransfer: ['', Validators.required],
      tot: ['', Validators.required],
      pickupTime: [''],
      price: [0, Validators.required],
      remarks: ['']
    });

    this.transferForm.get('selectedFlightIndex')?.valueChanges.subscribe(index => {
      if (index !== '') {
        const flight = this.flights()[Number(index)];
        if (flight) {
          this.transferForm.patchValue({
            flight: `${flight.flight} ${flight.number}`,
            flightTime: flight.eat || flight.edt || ''
          }, { emitEvent: false });
        }
      }
    });

    this.transferForm.get('city')?.valueChanges.subscribe(val => {
      this.selectedCity.set(val);
      this.transferForm.patchValue({ transfer: '' }, { emitEvent: false });
    });

    this.transferForm.get('transfer')?.valueChanges.subscribe(description => {
      if (description) {
        const transfer = this.masterData.transfers().find(t => t.description === description);
        if (transfer) {
          this.transferForm.patchValue({
            from: transfer.departure,
            to: transfer.arrival
          }, { emitEvent: false });
        }
      }
    });

    this.selectedCity.set(this.transferForm.get('city')?.value || '');

    this.transferForm.valueChanges.subscribe(() => {
      if (!this.isPatching) {
        this.getPrice(true);
      }
    });

    effect(() => {
      const d = this.initialData();
      if (d) {
        this.isPatching = true;
        this.transferForm.patchValue({
          city: d.city,
          date: d.date,
          transfer: d.description || d.transfer_name || d.transfer || '',
          display_order: d.display_order ?? 0,
          from: d.from,
          to: d.to,
          typeOfTransfer: d.typeOfTransfer || d.type_of_transfer || '',
          tot: d.tot,
          pickupTime: d.pickup,
          price: d.price,
          remarks: d.remarks,
          flight: d.flight || '',
          flightTime: d.flightTime || ''
        });
        this.selectedCity.set(d.city);
        this.isPatching = false;
      } else {
        this.isPatching = true;
        this.transferForm.reset({ country: 'Thailand', price: 0 });
        this.isPatching = false;
      }
    });
  }

  ngOnInit() {}

  getPrice(silent: boolean = false) {    const description = this.transferForm.get('transfer')?.value;
    const city = this.transferForm.get('city')?.value;
    const transferObj = this.masterData.transfers().find((t: any) =>
      (t.description === description || t.id?.toString() === description?.toString()) &&
      (!city || t.city === city)
    );
    if (!transferObj) {
      if (!silent) this.errorMessage.set('Please select a transfer first.');
      return;
    }
    const adults = this.numberOfAdults();
    const children = this.numberOfChildren();
    
    const tot = this.transferForm.get('tot')?.value;

    if (tot === 'SIC') {
      const adultBase = Number(transferObj.sic_price_adult) || 0;
      const childBase = Number(transferObj.sic_price_child) || 0;

      let total = this.markupCalc.round((adultBase * adults) + (childBase * children));

      const markup = this.agentMarkup();
      if (markup) {
        total = this.markupCalc.applyMarkup(
          total,
          markup.transfer_markup_unit,
          markup.transfer_markup ?? markup.transfer_markup_value ?? 0
        );
      }

      this.transferForm.patchValue({ price: total }, { emitEvent: false });
      this.errorMessage.set(null);
    } else if (tot === 'PVT') {
      const date = this.transferForm.get('date')?.value;
      if (!date) {
        if (!silent) this.errorMessage.set('Please select a date to calculate PVT price.');
        return;
      }
      const totalPax = adults + children;
      if (totalPax <= 0) {
        if (!silent) this.errorMessage.set('Number of Pax must be greater than 0.');
        return;
      }
      
      const prices: any[] = transferObj.prices || [];
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
          markup.transfer_markup_unit,
          markup.transfer_markup ?? markup.transfer_markup_value ?? 0
        );
      }
      
      this.transferForm.patchValue({ price: finalPrice }, { emitEvent: false });
      this.errorMessage.set(null);
    } else {
      if (!silent) this.errorMessage.set('Please select Transfer Type (SIC/PVT).');
    }
  }

  errorMessage = signal<string | null>(null);

  onSave() {
    if (this.transferForm.valid) {
      this.errorMessage.set(null);
      const transferDescription = this.transferForm.get('transfer')?.value;
      const city = this.transferForm.get('city')?.value;
      
      // Try to find a matching transfer in master data for this description and city to get an ID
      const transferObj = this.masterData.transfers().find(t => 
        t.city === city && t.description === transferDescription
      );

      const data = this.transferForm.getRawValue();
      data.transfer_name = transferDescription; 
      data.transfer_id = transferObj ? transferObj.id : null;
      this.save.emit(data);
    } else {
      this.errorMessage.set('Please fill in all required fields.');
      this.transferForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
        }
      }, 100);
    }
  }
}
