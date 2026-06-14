import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { HotelApiService } from '../../../core/services/api/hotel-api.service';
import { ExcursionApiService } from '../../../core/services/api/excursion-api.service';
import { TransferApiService } from '../../../core/services/api/transfer-api.service';
import { TourApiService } from '../../../core/services/api/tour-api.service';
import { AddTourPriceModalComponent } from '../../../core/components/modals/add-tour-price-modal/add-tour-price-modal';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { PdfService } from '../../../core/services/pdf.service';
import { MarkupApiService } from '../../../core/services/api/markup-api.service';
import { MarkupCalculatorService } from '../../../core/services/markup-calculator.service';
import { AgentApiService } from '../../../core/services/api/agent-api.service';
import { forkJoin } from 'rxjs';

interface ServiceItem {
  id: number;
  city: string;
  from_time: string;
  to_time: string;
  item_id: string; // hotelId, excursionId, or transferId
  room_type?: string; // only for hotels
}

interface ItineraryDay {
  dayNumber: number;
  description: string;
  hotels: ServiceItem[];
  excursions: ServiceItem[];
  transfers: ServiceItem[];
}

@Component({
  selector: 'app-add-tour',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, AddTourPriceModalComponent],
  templateUrl: './add-tour.html',
  styleUrls: ['./add-tour.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddTourComponent {
  private fb = inject(FormBuilder);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private translationService = inject(TranslationService);
  private hotelApiService = inject(HotelApiService);
  private excursionApiService = inject(ExcursionApiService);
  private transferApiService = inject(TransferApiService);
  private tourApiService = inject(TourApiService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  private pdfService = inject(PdfService);
  public masterData = inject(MasterDataService);
  private markupApiService = inject(MarkupApiService);
  private markupCalc = inject(MarkupCalculatorService);
  private agentApiService = inject(AgentApiService);
  private cd = inject(ChangeDetectorRef);
  t = this.translationService.translations;
  public countries = this.masterData.countries;
  viewOnly = signal(false);

  // Edit mode
  public editTourId = signal<number | null>(null);
  public isEditMode = computed(() => this.editTourId() !== null);

  tourForm = this.fb.group({
    name: ['', Validators.required],
    country: ['Thailand', Validators.required],
    startCity: ['', Validators.required],
    category: ['', Validators.required],
    departureType: ['', Validators.required],
    description: ['', Validators.required],
    route: ['', Validators.required],
    displayOrder: [0],
    validDays: this.fb.group({
      mon: [true], tue: [true], wed: [true], thu: [false], fri: [false], sat: [false], sun: [false]
    })
  });

  // Dynamic state using signals
  public itinerary = signal<ItineraryDay[]>([]);
  public prices = signal<any[]>([]);

  // Lists from Database
  public hotelsList = signal<any[]>([]);
  public excursionsList = signal<any[]>([]);
  public transfersList = signal<any[]>([]);
  public hotelRoomsMap = signal<Record<string, any[]>>({});
  
  // Computed duration
  duration = computed(() => this.itinerary().length);

  // Modal state
  isPriceModalOpen = signal(false);
  editingPriceIndex = signal<number | null>(null);
  editingPriceData = computed(() => {
    const idx = this.editingPriceIndex();
    if (idx === null) return null;
    return this.prices()[idx];
  });

  ngOnInit() {
    this.masterData.refresh().subscribe();
    const id = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    const pageId = 'cp_tours';
    const hasAddPerm = this.authService.canAdd(pageId);
    const hasEditPerm = this.authService.canEdit(pageId);

    if (id && !hasEditPerm) {
      this.viewOnly.set(true);
      this.tourForm.disable();
    }

    if (!id && !hasAddPerm) {
      this.toastService.error('You do not have permission to add new tours');
      this.goBack();
      return;
    }

    this.loadDatabaseData(() => {
      if (id) {
        this.editTourId.set(Number(id));
        this.loadTourForEdit(Number(id));
      }
    });
  }

  loadTourForEdit(id: number) {
    this.tourApiService.getTour(id).subscribe((tour: any) => {
      // Parse valid_days if it came back as a JSON string
      let validDays = { mon: true, tue: true, wed: true, thu: false, fri: false, sat: false, sun: false };
      if (tour.valid_days) {
        try {
          validDays = typeof tour.valid_days === 'string' ? JSON.parse(tour.valid_days) : tour.valid_days;
        } catch { /* keep defaults */ }
      }

      // Patch main form fields
      this.tourForm.patchValue({
        name: tour.name || '',
        country: tour.country || 'Thailand',
        startCity: tour.city || '',
        category: tour.category || '',
        departureType: tour.departures || '',
        description: tour.description || '',
        route: tour.route || '',
        displayOrder: tour.display_order ?? 0,
        validDays
      });

      // Helper function to resolve service_name to an ID if it's a name, or return the ID if it's already an ID
      const resolveItemId = (sName: any, list: any[]) => {
        if (!sName) return '';
        const sNameStr = String(sName).trim();
        if (sNameStr && !isNaN(Number(sNameStr))) {
          return sNameStr;
        }
        const found = list.find(item => item.name && item.name.trim().toLowerCase() === sNameStr.toLowerCase());
        return found ? String(found.id) : '';
      };

      // Patch itinerary
      if (tour.itinerary && Array.isArray(tour.itinerary)) {
        const days: ItineraryDay[] = tour.itinerary.map((day: any) => ({
          dayNumber: day.dayNumber || day.day || 1,
          description: day.description || day.itinerary || '',
          hotels: (day.hotels || []).map((s: any) => {
            const itemId = resolveItemId(s.service_name || s.item_id || s.service_id, this.hotelsList());
            return {
              id: s.id || Date.now() + Math.random(),
              city: s.city || '',
              from_time: s.from_time || '',
              to_time: s.to_time || '',
              item_id: itemId,
              room_type: s.room_type || ''
            };
          }),
          excursions: (day.excursions || []).map((s: any) => {
            const itemId = resolveItemId(s.service_name || s.item_id || s.service_id, this.excursionsList());
            return {
              id: s.id || Date.now() + Math.random(),
              city: s.city || '',
              from_time: s.from_time || '',
              to_time: s.to_time || '',
              item_id: itemId
            };
          }),
          transfers: (day.transfers || []).map((s: any) => {
            const itemId = resolveItemId(s.service_name || s.item_id || s.service_id, this.transfersList());
            return {
              id: s.id || Date.now() + Math.random(),
              city: s.city || '',
              from_time: s.from_time || '',
              to_time: s.to_time || '',
              item_id: itemId
            };
          })
        }));
        this.itinerary.set(days);

        // Preload room types for any selected hotels
        days.forEach(day => {
          day.hotels.forEach(hotel => {
            if (hotel.item_id) {
              this.onHotelChange(hotel);
            }
          });
        });
      }

      // Patch prices
      if (tour.pricing && Array.isArray(tour.pricing)) {
        const prices = tour.pricing.map((p: any) => ({
          startDate: p.start_date,
          endDate: p.end_date,
          singlePrice: p.single_room_price,
          doublePrice: p.double_room_price,
          triplePrice: p.triple_room_price
        }));
        this.prices.set(prices);
      }

      // --- Apply Markup in View Mode (Agent only) ---
      if (this.viewOnly() && this.authService.isAgent()) {
        const applyMarkup = (markupObj: any) => {
          if (!markupObj) return;
          const unit = markupObj.tour_markup_unit;
          const val = markupObj.tour_markup;

          this.prices.update(list => list.map(p => ({
            ...p,
            singlePrice: this.markupCalc.round(this.markupCalc.applyMarkup(p.singlePrice || 0, unit, val)),
            doublePrice: this.markupCalc.round(this.markupCalc.applyMarkup(p.doublePrice || 0, unit, val)),
            triplePrice: this.markupCalc.round(this.markupCalc.applyMarkup(p.triplePrice || 0, unit, val))
          })));
          this.cd.markForCheck();
        };

        this.agentApiService.getMyMarkup().subscribe({
          next: (markup) => applyMarkup(markup),
          error: () => {
            this.markupApiService.listMarkups().subscribe(markups => {
              const defaultMarkup = markups.find((m: any) => m.markup_group === 'SYSTEM DEFAULT') || markups[0];
              applyMarkup(defaultMarkup);
            });
          }
        });
      } else {
        this.cd.markForCheck();
      }
    });
  }

  loadDatabaseData(callback?: () => void) {
    // allCities comes from masterData.cities (already refreshed in ngOnInit)
    forkJoin({
      hotels: this.hotelApiService.listHotels({ limit: 1000 }),
      excursions: this.excursionApiService.listExcursions({ limit: 1000 }),
      transfers: this.transferApiService.listTransfers({ limit: 1000 })
    }).subscribe({
      next: (res) => {
        this.hotelsList.set(res.hotels.data);
        this.excursionsList.set(res.excursions.data);
        this.transfersList.set(res.transfers.data);
        if (callback) callback();
      },
      error: (err) => {
        console.error('Error loading database data:', err);
        if (callback) callback();
      }
    });
  }

  // Use masterData.cities so cities added from Countries page appear here
  public allCities = this.masterData.cities;

  getFilteredHotels(city: string) {
    if (!city) return this.hotelsList();
    return this.hotelsList().filter(h => h.city === city);
  }

  getFilteredExcursions(city: string) {
    if (!city) return this.excursionsList();
    return this.excursionsList().filter(e => e.city === city);
  }

  getFilteredTransfers(city: string) {
    if (!city) return this.transfersList();
    return this.transfersList().filter(t => t.city === city);
  }

  onHotelChange(hotel: ServiceItem) {
    if (!hotel.item_id || isNaN(Number(hotel.item_id))) return;
    this.hotelApiService.getHotel(hotel.item_id).subscribe(data => {
      if (data && data.roomTypes) {
        this.hotelRoomsMap.update(prev => ({
          ...prev,
          [hotel.item_id]: data.roomTypes
        }));
      }
    });
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.tourForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  goBack() {
    this.location.back();
  }

  printPage() {
    const fv = this.tourForm.getRawValue() as any;
    const item = {
      id: this.editTourId(),
      name: fv.name,
      city: fv.startCity,
      category: fv.category,
      description: fv.description,
      route: fv.route,
      departures: fv.departureType,
      validDays: fv.validDays,
      itinerary: this.itinerary(),
      prices: this.prices(),
      hotelsList: this.hotelsList(),
      excursionsList: this.excursionsList(),
      transfersList: this.transfersList()
    };
    this.pdfService.generateItemPdf(item, 'tours');
  }

  toggleDay(dayKey: string) {
    const group = this.tourForm.get('validDays') as any;
    group.get(dayKey).setValue(!group.get(dayKey).value);
  }

  addDay() {
    this.itinerary.update(current => [
      ...current,
      {
        dayNumber: current.length + 1,
        description: '',
        hotels: [],
        excursions: [],
        transfers: []
      }
    ]);
  }

  removeDay(index: number) {
    this.itinerary.update(current => {
      const updated = current.filter((_, i) => i !== index);
      // Re-number days
      return updated.map((day, i) => ({ ...day, dayNumber: i + 1 }));
    });
  }

  addService(dayIndex: number, type: 'hotels' | 'excursions' | 'transfers') {
    this.itinerary.update(current => {
      const updated = [...current];
      const day = { ...updated[dayIndex] };
      const services = [...day[type]];
      
      const newService: ServiceItem = {
        id: Date.now(),
        city: '',
        from_time: '',
        to_time: '',
        item_id: ''
      };
      
      if (type === 'hotels') newService.room_type = '';
      
      services.push(newService);
      day[type] = services as any;
      updated[dayIndex] = day;
      return updated;
    });
  }

  removeService(dayIndex: number, type: 'hotels' | 'excursions' | 'transfers', serviceId: number) {
    this.itinerary.update(current => {
      const updated = [...current];
      const day = { ...updated[dayIndex] };
      day[type] = day[type].filter(s => s.id !== serviceId) as any;
      updated[dayIndex] = day;
      return updated;
    });
  }

  openPriceModal(index?: number) {
    if (index !== undefined) {
      this.editingPriceIndex.set(index);
    } else {
      this.editingPriceIndex.set(null);
    }
    this.isPriceModalOpen.set(true);
  }

  savePrice(priceData: any) {
    const idx = this.editingPriceIndex();
    if (idx !== null) {
      this.prices.update(prev => prev.map((p, i) => i === idx ? priceData : p));
    } else {
      this.prices.update(prev => [...prev, priceData]);
    }
  }

  deletePrice(index: number) {
    this.prices.update(prev => prev.filter((_, i) => i !== index));
  }

  saveTour() {
    if (this.tourForm.valid) {
      const formValue = this.tourForm.value as any;
      
      const tourData = {
        name: formValue.name,
        code: formValue.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000),
        category: formValue.category,
        description: formValue.description,
        duration: this.duration(),
        route: formValue.route,
        departures: formValue.departureType,
        city: formValue.startCity,
        display_order: formValue.displayOrder || 0,
        valid_days: formValue.validDays,
        itinerary: this.itinerary(),
        pricing: this.prices().map(p => ({
          start_date: p.startDate,
          end_date: p.endDate,
          single_room_price: p.singlePrice,
          double_room_price: p.doublePrice,
          triple_room_price: p.triplePrice,
          currency_id: 4
        }))
      };

      const id = this.editTourId();
      const request$ = id
        ? this.tourApiService.updateTour(id, tourData)
        : this.tourApiService.createTour(tourData);

      request$.subscribe({
        next: () => {
          alert(id ? 'Tour updated successfully!' : 'Tour saved successfully!');
          this.goBack();
        },
        error: (err) => {
          console.error('Error saving tour:', err);
          alert('Error saving tour: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.toastService.error('Please fill in all required fields.');
      this.tourForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.invalid-field, .ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
          firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }
}
