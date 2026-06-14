import { Component, output, inject, ChangeDetectionStrategy, signal, computed, input, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../services/translation.service';
import { MasterDataService } from '../../../services/master-data.service';
import { MarkupCalculatorService } from '../../../services/markup-calculator.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tour-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './tour-modal.html',
  styleUrl: './tour-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TourModalComponent implements OnInit {
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

  filteredTours = computed(() => {
    const city = this.selectedCity();
    if (!city || city === 'Select city') return this.masterData.tours();
    return this.masterData.tours().filter((t: any) => t.city === city);
  });
  
  close = output<void>();
  save = output<any>();

  tourForm: FormGroup;

  isPatching = false;

  constructor() {
    this.tourForm = this.fb.group({
      country: ['Thailand', Validators.required],
      startCity: ['', Validators.required],
      tour: ['', Validators.required], // Will store tour ID
      route: [''],
      startDate: [''],
      endDate: [''],
      singleRoom: [false],
      singleRoomCount: [0],
      doubleRoom: [false],
      doubleRoomCount: [0],
      tripleRoom: [false],
      tripleRoomCount: [0],
      pax: [{value: 0, disabled: true}],
      tot: ['', Validators.required],
      flightIn: [''],
      arrivalTime: [''],
      flightOut: [''],
      departureTime: [''],
      display_order: [0],
      price: [{value: 0, disabled: true}],
      remarks: ['']
    });

    this.tourForm.get('startCity')?.valueChanges.subscribe(val => {
      this.selectedCity.set(val);
      this.tourForm.patchValue({ tour: '' }, { emitEvent: false });
    });
    this.selectedCity.set(this.tourForm.get('startCity')?.value || '');

    this.tourForm.valueChanges.subscribe(() => {
      if (!this.isPatching) {
        this.getPrice(true);
      }
    });

    effect(() => {
      const d = this.initialData();
      if (d) {
        this.isPatching = true;
        this.tourForm.patchValue({
          country: d.country || 'Thailand',
          startCity: d.city || '',
          tour: d.tour_id || '',
          route: d.route || '',
          pax: d.pax || 0,
          tot: d.tot || '',
          display_order: d.display_order ?? 0,
          price: d.price || 0,
          remarks: d.remarks || ''
        });
        this.selectedCity.set(d.city || '');
        this.isPatching = false;
      } else {
        this.isPatching = true;
        this.tourForm.reset({ country: 'Thailand', price: 0 });
        this.isPatching = false;
      }
    });
  }

  ngOnInit() {
    this.masterData.refresh().subscribe();
  }

  getPrice(silent: boolean = false) {    const tourId = this.tourForm.get('tour')?.value;
    const tourObj = this.masterData.tours().find((t: any) =>
      t.id?.toString() === tourId?.toString()
    );
    if (!tourObj) {
      if (!silent) this.errorMessage.set('Please select a tour first.');
      return;
    }
    const adults = this.numberOfAdults();
    const children = this.numberOfChildren();
    const tot = this.tourForm.get('tot')?.value;
    
    if (tot === 'SIC') {
      const adultBase = Number(tourObj.sic_price_adult || tourObj.base_price || 0);
      const childBase = Number(tourObj.sic_price_child || 0);

      let total = this.markupCalc.round((adultBase * adults) + (childBase * children));
      
      const markup = this.agentMarkup();
      if (markup) {
        total = this.markupCalc.applyMarkup(
          total,
          markup.tour_markup_unit,
          markup.tour_markup_value
        );
      }
      
      this.tourForm.patchValue({ price: total }, { emitEvent: false });
      this.errorMessage.set(null);
    } else if (tot === 'PVT') {
      const date = this.tourForm.get('startDate')?.value;
      if (!date) {
        if (!silent) this.errorMessage.set('Please select a start date to calculate PVT price.');
        return;
      }
      const totalPax = adults + children;
      if (totalPax <= 0) {
        if (!silent) this.errorMessage.set('Number of Pax must be greater than 0.');
        return;
      }
      
      const prices: any[] = tourObj.prices || [];
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
      
      const singlePrice = Number(matchedPriceRow.single_room_price || 0);
      const doublePrice = Number(matchedPriceRow.double_room_price || 0);
      const triplePrice = Number(matchedPriceRow.triple_room_price || 0);
      
      const singleCount = Number(this.tourForm.get('singleRoomCount')?.value || 0);
      const doubleCount = Number(this.tourForm.get('doubleRoomCount')?.value || 0);
      const tripleCount = Number(this.tourForm.get('tripleRoomCount')?.value || 0);
      
      const pvtBaseTotal = (singleCount * singlePrice) + (doubleCount * doublePrice) + (tripleCount * triplePrice);
      
      if (pvtBaseTotal === 0 && !silent) {
         this.errorMessage.set('Please enter at least one room count for PVT calculation.');
      } else {
         this.errorMessage.set(null);
      }

      let finalPrice = this.markupCalc.round(pvtBaseTotal);      

      const markup = this.agentMarkup();
      if (markup) {
        finalPrice = this.markupCalc.applyMarkup(
          finalPrice,
          markup.tour_markup_unit,
          markup.tour_markup_value
        );
      }

      this.tourForm.patchValue({ price: finalPrice }, { emitEvent: false });
    } else {
      if (!silent) this.errorMessage.set('Please select Tour Type (SIC/PVT).');
    }
  }

  errorMessage = signal<string | null>(null);

  onSave() {
    if (this.tourForm.valid) {
      this.errorMessage.set(null);
      const tourId = this.tourForm.get('tour')?.value;
      const tourObj = this.masterData.tours().find(t => t.id == tourId);
      const data = this.tourForm.getRawValue();
      data.tour_name = tourObj ? tourObj.name : '';
      data.tour_id = tourId;
      this.save.emit(data);
    } else {
      this.errorMessage.set('Please fill in all required fields.');
      this.tourForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
        }
      }, 100);
    }
  }
}
