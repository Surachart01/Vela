import { Component, output, inject, ChangeDetectionStrategy, signal, computed, input, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../services/translation.service';
import { MasterDataService } from '../../../services/master-data.service';
import { HotelApiService } from '../../../services/api/hotel-api.service';
import { MarkupCalculatorService } from '../../../services/markup-calculator.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-hotel-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './hotel-modal.html',
  styleUrl: './hotel-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelModalComponent implements OnInit {
  public translationService = inject(TranslationService);
  public masterData = inject(MasterDataService);
  private fb = inject(FormBuilder);
  private hotelApi = inject(HotelApiService);
  private markupCalc = inject(MarkupCalculatorService);
  public authService = inject(AuthService);

  initialData = input<any>(null);
  minDate = input<string>('');
  agentMarkup = input<any>(null);
  numberOfAdults = input<number>(0);
  numberOfChildren = input<number>(0);
  public t = this.translationService.translations;

  /** Adults ที่กรอกไปแล้วในทุก room type รวมกัน — writable signal updated via valueChanges */
  totalAdultsInRooms = signal(0);

  /** Children ที่กรอกไปแล้วในทุก room type รวมกัน */
  totalChildrenInRooms = signal(0);

  /** Adults ที่เหลือยังกรอกได้ */
  remainingAdults = computed(() => this.numberOfAdults() - this.totalAdultsInRooms());

  /** Children ที่เหลือยังกรอกได้ */
  remainingChildren = computed(() => this.numberOfChildren() - this.totalChildrenInRooms());

  /** Recalculate totals from FormArray */
  private recalcTotals() {
    const controls = (this.hotelForm?.get('roomTypes') as FormArray)?.controls || [];
    let adults = 0, children = 0;
    for (const c of controls) {
      adults += Number((c as FormGroup).get('adults')?.value) || 0;
      children += Number((c as FormGroup).get('children')?.value) || 0;
    }
    this.totalAdultsInRooms.set(adults);
    this.totalChildrenInRooms.set(children);
  }

  /** Max adults a specific room row can have = remaining + its own current value */
  getMaxAdultsForRoom(index: number): number | null {
    if (this.numberOfAdults() <= 0) return null;
    const current = Number((this.roomTypes.at(index) as FormGroup).get('adults')?.value) || 0;
    return Math.max(0, this.remainingAdults() + current);
  }

  /** Max children a specific room row can have = remaining + its own current value */
  getMaxChildrenForRoom(index: number): number | null {
    if (this.numberOfChildren() <= 0) return null;
    const current = Number((this.roomTypes.at(index) as FormGroup).get('children')?.value) || 0;
    return Math.max(0, this.remainingChildren() + current);
  }

  close = output<void>();
  save = output<any>();

  selectedCity = signal<string>('');
  roomTypesList = signal<any[]>([]);
  private isPatching = false;
  /** When editing an existing hotel that already has a saved price, prevent
   *  silent auto-recalc (getPrice(true)) from overwriting it until the user
   *  explicitly clicks "Get Price". */
  private priceLockedFromEdit = false;
  isLoading = signal(false);

  hotelSearchQuery = signal<string>('');
  showHotelResults = signal<boolean>(false);
  checkInDateSignal = signal<Date | null>(null);

  filteredHotels = computed(() => {
    const city = this.selectedCity();
    const query = this.hotelSearchQuery().toLowerCase().trim();
    
    // Filter by city first
    let hotelsInCity = this.masterData.hotels().filter((h: any) => 
      !city || city === 'Select city' || city === '' || String(h.city).toLowerCase() === String(city).toLowerCase()
    );

    hotelsInCity = [...hotelsInCity].sort((a: any, b: any) => {
      const orderA = a.display_order !== null && a.display_order !== undefined ? Number(a.display_order) : 999999;
      const orderB = b.display_order !== null && b.display_order !== undefined ? Number(b.display_order) : 999999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!query) return hotelsInCity.slice(0, 10); // Show top 10 if no query
    
    return hotelsInCity.filter((h: any) => 
      h.name.toLowerCase().includes(query)
    ).slice(0, 20); // Limit to 20 results for performance
  });

  // Comparison functions for select elements
  compareById = (o1: any, o2: any): boolean => {
    return o1 && o2 ? String(o1) === String(o2) : o1 === o2;
  };

  compareByName = (o1: any, o2: any): boolean => {
    return o1 && o2 ? String(o1).trim() === String(o2).trim() : o1 === o2;
  };

  hotelForm: FormGroup;

  constructor() {
    this.hotelForm = this.fb.group({
      checkIn: ['', Validators.required],
      checkOut: ['', Validators.required],
      country: ['Thailand', Validators.required],
      city: ['', Validators.required],
      hotel: ['', Validators.required], // Will store hotel ID
      nights: [{value: 0, disabled: true}],
      pax: [{value: 0, disabled: true}],
      single: [0],
      double: [0],
      earlyCheckIn: [false],
      lateCheckOut: [false],
      roomTypes: this.fb.array([this.createRoomType()]),
      meals: this.fb.group({
        hasAbf: [false],
        hasLunch: [false],
        hasDinner: [false],
        hasAllInclusive: [false],
        abfDays: [0],
        lunchDays: [0],
        dinnerDays: [0],
        allInclusiveDays: [0],
        abfNotes: [''],
        lunchNotes: [''],
        dinnerNotes: [''],
        allInclusiveNotes: ['']
      }),
      flightIn: [''],
      flightOut: [''],
      flightInfo: [''],
      display_order: [0],
      price: [{value: 0, disabled: true}],
      discount: [0],
      notes: ['']
    });

    // Subscriptions for reactivity
    this.hotelForm.get('city')?.valueChanges.subscribe(val => {
      if (this.isPatching) return;
      this.selectedCity.set(val);
      this.hotelForm.patchValue({ hotel: '' }, { emitEvent: false });
      this.roomTypesList.set([]);
    });

    this.hotelForm.get('hotel')?.valueChanges.subscribe(val => {
      if (val && !this.isPatching) {
        this.updateHotelDetails(val);
      }
    });

    this.hotelForm.get('checkIn')?.valueChanges.subscribe(val => {
      this.checkInDateSignal.set(val ? new Date(val) : null);
      this.calculateNights();
    });
    this.hotelForm.get('checkOut')?.valueChanges.subscribe(() => this.calculateNights());
    this.hotelForm.get('single')?.valueChanges.subscribe(() => this.calculatePax());
    this.hotelForm.get('double')?.valueChanges.subscribe(() => this.calculatePax());

    // Track adults/children changes across all room types
    (this.hotelForm.get('roomTypes') as FormArray).valueChanges.subscribe(() => this.recalcTotals());

    // Auto-calculate price on any form change (silent mode to prevent annoying errors)
    this.hotelForm.valueChanges.subscribe(() => {
      if (!this.isPatching) {
        // Don't auto-recalculate if price was loaded from saved edit data
        // (prevents updateHotelDetails async response from overriding the saved price)
        if (!this.priceLockedFromEdit) {
          this.getPrice(true);
        }
      }
    });

    // Initial values
    const city = this.hotelForm.get('city')?.value;
    if (city) this.selectedCity.set(city);

    // Effect to handle initialData changes (for Persistent Modal)
    effect(() => {
      const d = this.initialData();
      if (d) {
        this.isPatching = true;
        this.patchForm(d);
        this.isPatching = false;
      } else {
        this.hotelForm.reset({ 
          country: 'Thailand',
          single: 0,
          double: 0,
          meals: {
            hasAbf: false,
            hasLunch: false,
            hasDinner: false,
            hasAllInclusive: false,
            abfDays: 0,
            lunchDays: 0,
            dinnerDays: 0,
            allInclusiveDays: 0
          }
        });
        this.hotelSearchQuery.set('');
        this.roomTypes.clear();
        this.roomTypes.push(this.createRoomType());
      }
    });

    // Effect to re-patch once master data or room types arrive
    effect(() => {
      const hotels = this.masterData.hotels();
      const cities = this.masterData.cities();
      if (this.isPatching && (hotels.length > 0 || cities.length > 0)) {
        this.repatchOnDataLoad();
      }
    });


  }

  repatchOnDataLoad() {
    if (!this.isPatching) return;
    const d = this.initialData();
    if (!d) return;

    // Re-verify hotel ID match
    let hId = d.hotel_id;
    if (!hId && d.hotel) {
       const matched = this.masterData.hotels().find((h: any) => h.name === d.hotel);
       if (matched) hId = matched.id;
    }

    if (hId) {
      this.hotelForm.patchValue({ 
        city: d.city,
        hotel: hId 
      }, { emitEvent: false });
      this.selectedCity.set(d.city);
    }
  }

  ngOnInit() {
    const d = this.initialData();
    if (d) this.patchForm(d);
  }

  patchForm(d: any) {
    if (!d) return;
    
    // Synchronous patching from provided data
    this.selectedCity.set(d.city || '');
    
    this.hotelForm.patchValue({
      checkIn: d.checkIn || '',
      checkOut: d.checkOut || '',
      city: d.city || '',
      nights: d.nights || 0,
      single: d.singleRoom != null ? Number(d.singleRoom) : 0,
      double: d.doubleRoom != null ? Number(d.doubleRoom) : 0,
      display_order: d.display_order ?? 0,
      price: d.price || 0,  // Patch saved price first
      discount: d.discount || 0,
      notes: d.notes || d.remarks || '',
      earlyCheckIn: !!d.earlyCheckIn,
      lateCheckOut: !!d.lateCheckOut,
      flightIn: d.flightIn || '',
      flightOut: d.flightOut || '',
      flightInfo: d.flightInfo || ''
    }, { emitEvent: false });

    // Manually sync checkInDateSignal since emitEvent:false bypasses valueChanges
    if (d.checkIn) {
      this.checkInDateSignal.set(new Date(d.checkIn));
    }

    if (d.meals) {
      this.hotelForm.get('meals')?.patchValue({
        hasAbf: !!d.meals.hasAbf,
        hasLunch: !!d.meals.hasLunch,
        hasDinner: !!d.meals.hasDinner,
        hasAllInclusive: !!d.meals.hasAllInclusive,
        abfDays: d.meals.abfDays || 0,
        lunchDays: d.meals.lunchDays || 0,
        dinnerDays: d.meals.dinnerDays || 0,
        allInclusiveDays: d.meals.allInclusiveDays || 0,
        abfNotes: d.meals.abfNotes || '',
        lunchNotes: d.meals.lunchNotes || '',
        dinnerNotes: d.meals.dinnerNotes || '',
        allInclusiveNotes: d.meals.allInclusiveNotes || ''
      }, { emitEvent: false });
    }

    // Lock price from being auto-overridden if editing with existing price
    if (d.price && Number(d.price) > 0) {
      this.priceLockedFromEdit = true;
    }

    // Important: Only fetch from API if we don't have the room types list yet
    this.patchRoomTypes(d);

    let hId = d.hotel_id;
    if (!hId && d.hotel) {
       const matched = this.masterData.hotels().find((h: any) => h.name === d.hotel);
       if (matched) hId = matched.id;
    }

    if (hId) {
      this.hotelForm.patchValue({ hotel: hId }, { emitEvent: false });
      const hotelObj = this.masterData.hotels().find(h => h.id == hId);
      if (hotelObj) {
        this.hotelSearchQuery.set(hotelObj.name);
      }
      this.updateHotelDetails(hId);
    }
  }

  private patchRoomTypes(d: any) {
    if (d.roomTypes && Array.isArray(d.roomTypes) && d.roomTypes.length > 0) {
      this.roomTypes.clear();
      d.roomTypes.forEach((rt: any) => {
        this.roomTypes.push(this.fb.group({
          roomType: [rt.roomType || rt.name || '', Validators.required],
          adults: [rt.adults || 0],
          children: [rt.children || 0],
          compAbf: [rt.compAbf || false],
          extraAdultBed: [rt.extraAdultBed || false],
          extraAdultBedQty: [rt.extraAdultBedQty || 1],
          compExtraAdultBed: [rt.compExtraAdultBed || false],
          extraChildBed: [rt.extraChildBed || false],
          extraChildBedQty: [rt.extraChildBedQty || 1],
          compExtraChildBed: [rt.compExtraChildBed || false],
          sharingBed: [rt.sharingBed || false]
        }));
      });
    } else if (d.roomType || d.name) {
      this.roomTypes.clear();
      this.roomTypes.push(this.fb.group({
        roomType: [d.roomType || d.name || '', Validators.required],
        adults: [d.adults || 0],
        children: [d.children || 0],
        compAbf: [d.compAbf || false],
        extraAdultBed: [d.extraAdultBed || false],
        extraAdultBedQty: [d.extraAdultBedQty || 1],
        compExtraAdultBed: [d.compExtraAdultBed || false],
        extraChildBed: [d.extraChildBed || false],
        extraChildBedQty: [d.extraChildBedQty || 1],
        compExtraChildBed: [d.compExtraChildBed || false],
        sharingBed: [d.sharingBed || false]
      }));
    }
  }

  selectedHotelDetails = signal<any>(null);

  updateHotelDetails(hotelId: string | number) {
    this.hotelApi.getHotel(hotelId).subscribe({
      next: (details: any) => {
        this.selectedHotelDetails.set(details);

        // Map API snake_case flat structure → camelCase with nested roomEntries
        // (same mapping as add-hotel.ts)
        const mappedRoomTypes = (details.roomTypes || []).map((rt: any) => ({
          dateFrom: rt.start_date ? rt.start_date.split('T')[0] : '',
          dateTo: rt.end_date ? rt.end_date.split('T')[0] : '',
          extraBedAdult: rt.extra_bed_adult ?? 0,
          extraBedChild: rt.extra_bed_child ?? 0,
          extraBedShared: rt.extra_bed_shared ?? 0,
          foodCostAdultAbf: rt.food_adult_abf ?? 0,
          foodCostAdultLunch: rt.food_adult_lunch ?? 0,
          foodCostAdultDinner: rt.food_adult_dinner ?? 0,
          foodCostAdultAllInclusive: 0,
          foodCostChildAbf: rt.food_child_abf ?? 0,
          foodCostChildLunch: rt.food_child_lunch ?? 0,
          foodCostChildDinner: rt.food_child_dinner ?? 0,
          foodCostChildAllInclusive: 0,
          roomEntries: [{
            name: rt.name || '',
            allotment: rt.allotment ?? 0,
            cutOff: 0,
            maxCapacity: rt.allotment ?? 0,
            singlePrice: rt.single_price ?? 0,
            doublePrice: rt.double_price ?? 0
          }]
        }));
        this.roomTypesList.set(mappedRoomTypes);
        
        // Don't recalculate if we are patching initial data
        if (!this.isPatching) {
          this.getPrice(true);
        }

        // Sync search query with selected hotel name if missing
        const currentHotelId = this.hotelForm.get('hotel')?.value;
        if (currentHotelId == hotelId) {
          const hotelObj = this.masterData.hotels().find(h => h.id == hotelId);
          if (hotelObj && !this.hotelSearchQuery()) {
            this.hotelSearchQuery.set(hotelObj.name);
          }
        }
      },
      error: (err) => {
        console.error('Error fetching hotel details:', err);
      }
    });
  }

  selectHotel(hotel: any) {
    this.hotelForm.patchValue({ hotel: hotel.id });
    this.hotelSearchQuery.set(hotel.name);
    this.showHotelResults.set(false);
    this.updateHotelDetails(hotel.id);
  }

  clearHotelSearch() {
    this.hotelSearchQuery.set('');
    this.hotelForm.patchValue({ hotel: '' });
    this.showHotelResults.set(true);
  }

  calculateNights() {
    const checkIn = this.hotelForm.get('checkIn')?.value;
    const checkOut = this.hotelForm.get('checkOut')?.value;
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      this.hotelForm.patchValue({ nights: diffDays > 0 ? diffDays : 0 });
    }
  }

  calculatePax() {
    const single = Number(this.hotelForm.get('single')?.value || 0);
    const double = Number(this.hotelForm.get('double')?.value || 0);
    this.hotelForm.patchValue({ pax: single + (double * 2) });
  }

  /** Clamp adults/children input so it never exceeds the remaining PAX allocation */
  clampRoomField(index: number, field: 'adults' | 'children') {
    const group = this.roomTypes.at(index) as FormGroup;
    const val = Number(group.get(field)?.value) || 0;
    const max = field === 'adults' ? this.getMaxAdultsForRoom(index) : this.getMaxChildrenForRoom(index);
    if (max !== null && val > max) {
      group.get(field)?.setValue(max, { emitEvent: true });
    }
    if (val < 0) {
      group.get(field)?.setValue(0, { emitEvent: true });
    }
  }

  get roomTypes() {
    return this.hotelForm.get('roomTypes') as FormArray;
  }

  createRoomType(): FormGroup {
    return this.fb.group({
      roomType: ['', Validators.required],
      adults: [0],
      children: [0],
      compAbf: [false],
      extraAdultBed: [false],
      extraAdultBedQty: [1],
      compExtraAdultBed: [false],
      extraChildBed: [false],
      extraChildBedQty: [1],
      compExtraChildBed: [false],
      sharingBed: [false]
    });
  }

  addRoomType() {
    this.roomTypes.push(this.createRoomType());
  }

  removeRoomType(i: number) {
    if (this.roomTypes.length > 1) {
      this.roomTypes.removeAt(i);
    }
  }

  /** Flat, unique list of room entries — shows markup-applied prices for Agents, raw for Admin */
  allRoomEntries = computed(() => {
    const checkIn = this.checkInDateSignal();
    
    // If no check-in date selected yet, show nothing
    if (!checkIn) return [];
    
    const checkInDate = new Date(checkIn);
    checkInDate.setHours(0,0,0,0);
    
    const seen = new Set<string>();
    const result: { name: string; singlePrice: number; doublePrice: number }[] = [];

    for (const rt of this.roomTypesList()) {
      // Filter: only periods covering the check-in date
      if (rt.dateFrom && rt.dateTo) {
        const dFrom = new Date(rt.dateFrom); dFrom.setHours(0,0,0,0);
        const dTo = new Date(rt.dateTo); dTo.setHours(23,59,59,999);
        if (checkInDate < dFrom || checkInDate > dTo) {
          console.log('[HotelModal] SKIP period', rt.dateFrom, '→', rt.dateTo, '(checkIn not in range)');
          continue;
        }
        console.log('[HotelModal] USE  period', rt.dateFrom, '→', rt.dateTo);
      }

      for (const entry of (rt.roomEntries || [])) {
        if (entry.name && !seen.has(entry.name)) {
          seen.add(entry.name);
          const rawSingle = Number(entry.singlePrice) || 0;
          const rawDouble = Number(entry.doublePrice) || 0;

          result.push({ name: entry.name, singlePrice: rawSingle, doublePrice: rawDouble });
        }
      }
    }
    return result;
  });



  getPrice(silent: boolean = false) {
    // Unlock price lock whenever user explicitly calls getPrice (not silent)
    if (!silent) {
      this.priceLockedFromEdit = false;
    }
    const rawValue = this.hotelForm.getRawValue();
    const nights = Number(rawValue.nights) || 0;
    if (nights <= 0) {
      if (!silent) this.errorMessage.set('Please select Check-in and Check-out dates first.');
      return;
    }

    const checkInStr = rawValue.checkIn;
    if (!checkInStr) {
      if (!silent) this.errorMessage.set('Please select a Check-in date.');
      return;
    }
    const checkInDate = new Date(checkInStr);
    checkInDate.setHours(0, 0, 0, 0);

    const roomTypesData = this.roomTypesList();
    if (!roomTypesData || roomTypesData.length === 0) {
      if (!silent) this.errorMessage.set('Hotel has no room types configured. Please select a hotel first.');
      return;
    }

    const singleQty = Number(rawValue.single) || 0;
    const doubleQty = Number(rawValue.double) || 0;
    const roomControls = this.roomTypes.controls;

    // Helper to calculate price for a single row control
    const calcRowPrice = (ctrl: any, forceSingle: boolean = false, forceDouble: boolean = false) => {
      const selectedRoomTypeName = ctrl.get('roomType')?.value;
      if (!selectedRoomTypeName) return { baseRoom: 0, perRoomOther: 0, absoluteOther: 0 };
      
      let matchedPeriod: any = null;
      let matchedEntry: any = null;

      for (const rt of roomTypesData) {
        const entry = (rt.roomEntries || []).find((e: any) => e.name === selectedRoomTypeName);
        if (!entry) continue;

        if (rt.dateFrom && rt.dateTo) {
          const dFrom = new Date(rt.dateFrom); dFrom.setHours(0,0,0,0);
          const dTo = new Date(rt.dateTo); dTo.setHours(23,59,59,999);
          if (checkInDate >= dFrom && checkInDate <= dTo) {
            matchedPeriod = rt;
            matchedEntry = entry;
            break;
          }
        } else {
          if (!matchedPeriod) {
            matchedPeriod = rt;
            matchedEntry = entry;
          }
        }
      }

      if (matchedPeriod && matchedEntry) {
        const sPrice = Number(matchedEntry.singlePrice) || 0;
        const dPrice = Number(matchedEntry.doublePrice) || 0;

        let absoluteOther = 0;
        if (ctrl.get('extraAdultBed')?.value && !ctrl.get('compExtraAdultBed')?.value) {
          const qty = Number(ctrl.get('extraAdultBedQty')?.value) || 1;
          absoluteOther += qty * (Number(matchedPeriod.extraBedAdult) || 0);
        }
        if (ctrl.get('extraChildBed')?.value && !ctrl.get('compExtraChildBed')?.value) {
          const qty = Number(ctrl.get('extraChildBedQty')?.value) || 1;
          absoluteOther += qty * (Number(matchedPeriod.extraBedChild) || 0);
        }
        if (ctrl.get('sharingBed')?.value) {
          absoluteOther += Number(matchedPeriod.extraBedShared) || 0;
        }

        let foodCostPerAdult = 0;
        let foodCostPerChild = 0;
        const mealsForm = this.hotelForm.get('meals');
        if (mealsForm) {
          if (mealsForm.get('hasAbf')?.value && !ctrl.get('compAbf')?.value) {
            foodCostPerAdult += Number(matchedPeriod.foodCostAdultAbf) || 0;
            foodCostPerChild += Number(matchedPeriod.foodCostChildAbf) || 0;
          }
          if (mealsForm.get('hasLunch')?.value) {
            foodCostPerAdult += Number(matchedPeriod.foodCostAdultLunch) || 0;
            foodCostPerChild += Number(matchedPeriod.foodCostChildLunch) || 0;
          }
          if (mealsForm.get('hasDinner')?.value) {
            foodCostPerAdult += Number(matchedPeriod.foodCostAdultDinner) || 0;
            foodCostPerChild += Number(matchedPeriod.foodCostChildDinner) || 0;
          }
          if (mealsForm.get('hasAllInclusive')?.value) {
            foodCostPerAdult += Number(matchedPeriod.foodCostAdultAllInclusive) || 0;
            foodCostPerChild += Number(matchedPeriod.foodCostChildAllInclusive) || 0;
          }
        }

        const adultsInRow = Number(ctrl.get('adults')?.value) || 0;
        const childrenInRow = Number(ctrl.get('children')?.value) || 0;
        const totalChildFoodCost = foodCostPerChild * childrenInRow;
        const totalAdultFoodCost = foodCostPerAdult * adultsInRow;

        let baseRoom = 0;
        if (forceSingle) {
          baseRoom = sPrice;
        } else if (forceDouble) {
          baseRoom = dPrice;
        } else {
          baseRoom = adultsInRow > 1 ? dPrice : (sPrice || dPrice);
        }

        const perRoomOther = totalAdultFoodCost + totalChildFoodCost;
        return { baseRoom, perRoomOther, absoluteOther };
      }
      return { baseRoom: 0, perRoomOther: 0, absoluteOther: 0 };
    };

    let roomPerNight = 0;
    let rawOtherPerNight = 0;

    if (roomControls.length === 1 && (singleQty > 0 || doubleQty > 0)) {
      const ctrl = roomControls[0];
      const costPerSingle = calcRowPrice(ctrl, true, false);
      const costPerDouble = calcRowPrice(ctrl, false, true);
      
      roomPerNight = (singleQty * costPerSingle.baseRoom) + (doubleQty * costPerDouble.baseRoom);
      rawOtherPerNight = (singleQty * costPerSingle.perRoomOther) + (doubleQty * costPerDouble.perRoomOther) + costPerSingle.absoluteOther;
    } else {
      for (const ctrl of roomControls) {
        const costs = calcRowPrice(ctrl);
        roomPerNight += costs.baseRoom;
        rawOtherPerNight += costs.perRoomOther + costs.absoluteOther;
      }
    }

    if (roomPerNight <= 0) {
      if (!silent) this.errorMessage.set('No room price found for the selected room types. Please check hotel room configuration.');
      return;
    }

    const pricePerNight = roomPerNight + rawOtherPerNight;
    let totalBaseStay = pricePerNight * nights;

    const hotelDetails = this.selectedHotelDetails();
    if (hotelDetails?.fees) {
      if (rawValue.earlyCheckIn) {
        const pct = Number(hotelDetails.fees.early_checkin_fee) || 0;
        totalBaseStay += pricePerNight * (pct / 100);
      }
      if (rawValue.lateCheckOut) {
        const pct = Number(hotelDetails.fees.late_checkout_fee) || 0;
        totalBaseStay += pricePerNight * (pct / 100);
      }
    }



    if (totalBaseStay < 0) totalBaseStay = 0;

    let finalTotal = this.markupCalc.round(totalBaseStay);

    const markup = this.agentMarkup();
    if (markup) {
      finalTotal = this.markupCalc.applyHotelMarkup(
        finalTotal,
        markup.hotel_markup_percentages,
        markup.hotel_markup_unit,
        markup.hotel_markup_value
      );
    }

    this.hotelForm.patchValue({ price: finalTotal }, { emitEvent: false });
    this.errorMessage.set(null);
  }

  errorMessage = signal<string | null>(null);

  onSave() {
    // ตรวจสอบว่าจำนวน Adults/Children รวมทุก room ไม่เกิน booking
    const totalAdults = this.roomTypes.controls.reduce(
      (sum, c) => sum + (Number((c as FormGroup).get('adults')?.value) || 0), 0
    );
    const totalChildren = this.roomTypes.controls.reduce(
      (sum, c) => sum + (Number((c as FormGroup).get('children')?.value) || 0), 0
    );
    const maxAdults = this.numberOfAdults();
    const maxChildren = this.numberOfChildren();

    if (maxAdults > 0 && totalAdults > maxAdults) {
      this.errorMessage.set(`Total adults across all rooms (${totalAdults}) cannot exceed booking adults (${maxAdults}).`);
      return;
    }
    if (maxChildren > 0 && totalChildren > maxChildren) {
      this.errorMessage.set(`Total children across all rooms (${totalChildren}) cannot exceed booking children (${maxChildren}).`);
      return;
    }

    if (this.hotelForm.valid) {
      this.errorMessage.set(null);
      const hotelId = this.hotelForm.get('hotel')?.value;
      const hotelObj = this.masterData.hotels().find(h => h.id == hotelId);
      const data = this.hotelForm.getRawValue();
      data.hotel_name = hotelObj ? hotelObj.name : '';
      data.hotel_id = hotelId;
      // Preserve DB record id and booking metadata from initialData (needed for updates)
      const initial = this.initialData();
      if (initial?.id) data.id = initial.id;
      if (initial?.booking_status) data.booking_status = initial.booking_status;
      if (initial?.booking_remark) data.booking_remark = initial.booking_remark;
      this.save.emit(data);
    } else {
      console.warn('Form is invalid. Errors:', this.getFormValidationErrors());
      this.errorMessage.set('Please fill in all required fields.');
      this.hotelForm.markAllAsTouched();
      this.roomTypes.controls.forEach(c => {
        (c as FormGroup).markAllAsTouched();
      });
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
        }
      }, 100);
    }
  }

  getFormValidationErrors() {
    const errors: any = {};
    Object.keys(this.hotelForm.controls).forEach(key => {
      const controlErrors = this.hotelForm.get(key)?.errors;
      if (controlErrors != null) {
        errors[key] = controlErrors;
      }
    });
    // Check Room Types FormArray
    this.roomTypes.controls.forEach((group, index) => {
      const groupErrors: any = {};
      Object.keys((group as FormGroup).controls).forEach(key => {
        const ctrlErrors = (group as FormGroup).get(key)?.errors;
        if (ctrlErrors != null) {
          groupErrors[key] = ctrlErrors;
        }
      });
      if (Object.keys(groupErrors).length > 0) {
        errors[`roomType_${index}`] = groupErrors;
      }
    });
    return errors;
  }
}
