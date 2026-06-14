import { Component, ChangeDetectionStrategy, signal, inject, computed, OnInit, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { FlightModalComponent } from '../../core/components/modals/flight-modal/flight-modal';
import { TransferModalComponent } from '../../core/components/modals/transfer-modal/transfer-modal';
import { HotelModalComponent } from '../../core/components/modals/hotel-modal/hotel-modal';
import { ExcursionModalComponent } from '../../core/components/modals/excursion-modal/excursion-modal';
import { TourModalComponent } from '../../core/components/modals/tour-modal/tour-modal';
import { OtherModalComponent } from '../../core/components/modals/other-modal/other-modal';
import { DateInputComponent } from '../../core/components/date-input/date-input';
import { TranslationService } from '../../core/services/translation.service';
import { TripApiService } from '../../core/services/api/trip-api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { HotelApiService } from '../../core/services/api/hotel-api.service';
import { AgentApiService } from '../../core/services/api/agent-api.service';
import { ExcursionApiService } from '../../core/services/api/excursion-api.service';
import { TourApiService } from '../../core/services/api/tour-api.service';
import { TransferApiService } from '../../core/services/api/transfer-api.service';
import { AuthService } from '../../core/services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { EmailApiService } from '../../core/services/api/email-api.service';
import { ToastService } from '../../core/services/toast.service';
import { MarkupApiService } from '../../core/services/api/markup-api.service';

@Component({
  selector: 'app-add-quotation',
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FlightModalComponent,
    TransferModalComponent,
    HotelModalComponent,
    ExcursionModalComponent,
    TourModalComponent,
    OtherModalComponent,
    DateInputComponent
  ],
  templateUrl: './add-quotation.html',
  styleUrl: './add-quotation.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddQuotationComponent implements OnInit {
  public location = inject(Location);
  private translationService = inject(TranslationService);
  private tripApiService = inject(TripApiService);
  private hotelApiService = inject(HotelApiService);
  private agentApiService = inject(AgentApiService);
  private excursionApiService = inject(ExcursionApiService);
  private tourApiService = inject(TourApiService);
  private transferApiService = inject(TransferApiService);
  public authService = inject(AuthService);

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public masterData = inject(MasterDataService);
  private emailApiService = inject(EmailApiService);
  private toastService = inject(ToastService);
  private markupApiService = inject(MarkupApiService);

  public t = this.translationService.translations;
  editId = signal<string | number | null>(null);
  isSaving = signal(false);

  // Agent Markup (loaded when agentId is known)
  agentMarkup = signal<any>(null);

  // Master data for select boxes
  availableAgents = signal<any[]>([]);
  availableHotels = signal<any[]>([]);
  availableExcursions = signal<any[]>([]);
  availableTours = signal<any[]>([]);
  availableTransfers = signal<any[]>([]);

  // State for trip services
  flights = signal<any[]>([]);
  transfers = signal<any[]>([]);
  hotels = signal<any[]>([]);
  excursions = signal<any[]>([]);
  tours = signal<any[]>([]);
  other = signal<any[]>([]);

  // Req #3: Hotels sorted by check-in date
  sortedHotels = computed(() =>
    [...this.hotels()].sort((a, b) =>
      new Date(a.checkIn || 0).getTime() - new Date(b.checkIn || 0).getTime()
    )
  );

  // Req #2: Transfers sorted by display_order
  sortedTransfers = computed(() =>
    [...this.transfers()].sort((a, b) =>
      (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
    )
  );

  // Req #1 & #4: Service checkbox selection + email state
  selectedServiceKeys = signal<Set<string>>(new Set());
  isSendingBulkEmail = signal(false);
  isSendingAgentEmail = signal(false);

  toggleServiceKey(key: string) {
    this.selectedServiceKeys.update(set => {
      const newSet = new Set(set);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });
  }

  isServiceSelected(key: string) {
    return this.selectedServiceKeys().has(key);
  }

  sendBulkServiceEmails() {
    const keys = Array.from(this.selectedServiceKeys());
    if (keys.length === 0) return;

    const requests: any[] = [];
    keys.forEach(key => {
      const [type, idx] = key.split(':');
      const index = parseInt(idx, 10);
      if (type === 'hotel') {
        const hotel = this.sortedHotels()[index];
        if (hotel?.hotel_id && hotel?.id) {
          const bookingData = {
            item_id: hotel.id, hotel_name: hotel.hotel,
            checkIn: hotel.checkIn, checkOut: hotel.checkOut,
            nights: hotel.nights, roomType: hotel.roomType, city: hotel.city,
            bookingRef: this.quotationForm.get('bookingRef')?.value || '',
            promotion: hotel.promotion || '', meals: hotel.meals || null,
            notes: hotel.notes || '', earlyCheckIn: !!hotel.earlyCheckIn,
            lateCheckOut: !!hotel.lateCheckOut,
            flightIn: hotel.flightIn || '', flightOut: hotel.flightOut || '',
            flightInfo: hotel.flightInfo || ''
          };
          requests.push(this.emailApiService.sendHotelBookingEmail(hotel.hotel_id, bookingData));
        }
      }
    });

    if (requests.length === 0) {
      this.toastService.warning('Only saved Hotel items can be emailed. Please save the booking first.');
      return;
    }

    this.isSendingBulkEmail.set(true);
    forkJoin(requests).subscribe({
      next: () => {
        this.isSendingBulkEmail.set(false);
        this.selectedServiceKeys.set(new Set());
        this.toastService.success(`${requests.length} email(s) sent to suppliers!`);
      },
      error: () => {
        this.isSendingBulkEmail.set(false);
        this.toastService.error('Some emails failed to send.');
      }
    });
  }

  // Req #4: Manual email button – notify Agent that booking was received
  sendAgentNotificationEmail() {
    const id = this.editId();
    if (!id) return;
    const agentEmail = (this.currentUser() as any)?.email || '';
    if (!agentEmail) {
      this.toastService.warning('Agent email address not found in profile.');
      return;
    }
    this.isSendingAgentEmail.set(true);
    this.emailApiService.sendAgentBookingNotification(id, {
      agentEmail,
      clientName: this.quotationForm.get('clientName')?.value || '',
      tripStartDate: this.quotationForm.get('tripStartDate')?.value || ''
    }).subscribe({
      next: () => {
        this.isSendingAgentEmail.set(false);
        this.toastService.success('Notification email sent to Agent!');
      },
      error: () => {
        this.isSendingAgentEmail.set(false);
        this.toastService.error('Failed to send email to Agent.');
      }
    });
  }

  // Main Form
  quotationForm = this.fb.group({
    agentId: [''],
    bookingDate: [new Date().toISOString().split('T')[0]],
    tripStartDate: ['', Validators.required],
    clientName: ['', Validators.required],
    mobileNumber: [''],
    emailId: [''],
    adults: [0],
    children: [0],
    bookingRef: [''],
    status: ['Pending'],
    remark: [''],
    assistanceFee: [1000],
    includeFee: [true]
  });

  isBooking = signal(false);
  
  pageTitle = computed(() => {
    const translations = this.t() as any;
    return this.isBooking() ? (translations['booking.addBtn'] || 'Booking Details') : (translations['quote.addBtn'] || 'Add Quotation');
  });
  saveBtnText = computed(() => {
    const translations = this.t() as any;
    return this.isBooking() ? (translations['booking.table.save'] || 'Save Booking') : (translations['form.saveQuotation'] || 'Save Quotation');
  });

  isAdmin = computed(() => ['admin', 'superadmin'].includes(this.authService.currentUser()?.role || ''));
  canModify = computed(() => !this.isBooking() || this.isAdmin());

  // Computed totals
  totalCost = computed(() => {
    const fCost = this.flights().reduce((sum, f) => sum + (Number(f.cost) || 0), 0);
    const tCost = this.transfers().reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    const hCost = this.hotels().reduce((sum, h) => sum + (Number(h.price) || 0), 0);
    const eCost = this.excursions().reduce((sum, e) => sum + (Number(e.price) || 0), 0);
    const trCost = this.tours().reduce((sum, tr) => sum + (Number(tr.price) || 0), 0);
    const oCost = this.other().reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    return fCost + tCost + hCost + eCost + trCost + oCost;
  });

  finalPrice = computed(() => {
    const total = this.totalCost();
    const fee = this.quotationForm.get('includeFee')?.value ? (this.quotationForm.get('assistanceFee')?.value || 0) : 0;
    return total + Number(fee);
  });

  tabs = [
    { id: 'flight', name: 'Flight', icon: 'fa-plane' },
    { id: 'transfers', name: 'Transfers', icon: 'fa-bus' },
    { id: 'hotels', name: 'Hotels', icon: 'fa-hotel' },
    { id: 'excursions', name: 'Excursions', icon: 'fa-binoculars' },
    { id: 'tours', name: 'Tours', icon: 'fa-flag' },
    { id: 'other', name: 'Other', icon: 'fa-plus' }
  ];

  activeTab = signal('flight');
  isFlightModalOpen = signal(false);
  isTransferModalOpen = signal(false);
  isHotelModalOpen = signal(false);
  isExcursionModalOpen = signal(false);
  isTourModalOpen = signal(false);
  isOtherModalOpen = signal(false);
  isConfirmConvertModalOpen = signal(false);

  // Editing state
  editingIndex = signal<number | null>(null);
  flightData = signal<any>(null);
  transferData = signal<any>(null);
  hotelData = signal<any>(null);
  excursionData = signal<any>(null);
  tourData = signal<any>(null);
  otherData = signal<any>(null);
  sendingEmailIndex = signal<number | null>(null);

  currentUser = computed(() => this.authService.currentUser());
  agentDisplay = computed(() => {
    const user = this.currentUser() as any;
    return user ? user.username : 'Loading...';
  });

  // Reactive min date for all sub-modals
  minTravelDate = signal<string>('');

  constructor() {
    effect(() => {
      const user = this.currentUser() as any;
      if (!this.editId() && user) {
        this.quotationForm.patchValue({ agentId: user.agent_id?.toString() || '' });
      }
    });

    // Sync minTravelDate with form value
    this.quotationForm.get('tripStartDate')?.valueChanges.subscribe(val => {
      this.minTravelDate.set(val || '');
    });

    // Load agent markup when agentId changes
    this.quotationForm.get('agentId')?.valueChanges.subscribe(agentId => {
      this.loadAgentMarkup(agentId);
    });
  }

  setActiveTab(tabId: string) {
    this.activeTab.set(tabId);
  }


  /** ดึง Markup ของ Agent:
   * - ถ้าเป็น agent role → ใช้ /my-markup (JWT token)
   * - ถ้าเป็น admin/superadmin → ใช้ /:id/markup (โดย agentId ที่เลือก)
   */
  private loadAgentMarkup(agentId: string | null | undefined) {
    if (!agentId) {
      this.agentMarkup.set(null);
      return;
    }
    const user = this.authService.currentUser();
    const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

    if (isAdmin) {
      // Admin: โหลด markup ของ agent ที่เลือก (ไม่ใช่ markup ของ admin เอง)
      this.agentApiService.getAgentMarkup(agentId).subscribe({
        next: (markup: any) => {
          this.agentMarkup.set(markup || null);
        },
        error: () => {
          this.agentMarkup.set(null);
        }
      });
    } else {
      // Agent: โหลด markup ของตัวเอง (JWT-based)
      this.agentApiService.getMyMarkup().subscribe({
        next: (markup: any) => {
          this.agentMarkup.set(markup || null);
        },
        error: () => {
          this.agentMarkup.set(null);
        }
      });
    }
  }


  ngOnInit() {
    this.masterData.refresh().subscribe();
    const pageId = this.route.snapshot.data['pageId'] || 'quotation';
    const hasAddPerm = this.authService.canAdd(pageId);
    const hasEditPerm = this.authService.canEdit(pageId);
    const q = this.route.snapshot.data['trip'];

    if (q) {
      this.isBooking.set(!!q.is_booking || this.router.url.includes('booking'));
      this.editId.set(q.id);
      this.quotationForm.patchValue({
        agentId: q.agent_id ? q.agent_id.toString() : '',
        bookingDate: q.created_at ? q.created_at.split('T')[0] : '',
        tripStartDate: q.trip_start_date ? q.trip_start_date.split('T')[0] : '',
        clientName: q.client_name,
        mobileNumber: q.client_phone,
        emailId: q.client_email || '',
        bookingRef: q.booking_reference || '',
        status: q.declined ? 'Declined' : 'InProgress',
        remark: q.remarks,
        assistanceFee: Number(q.final_amount) - Number(q.total_amount),
        adults: q.number_of_adults,
        children: q.number_of_kids,
        includeFee: true
      });

      this.mapTripDataToSignals(q);
      
      // Enforce View-Only if user lacks permission OR if it's a booking and user is NOT an admin
      if (!hasEditPerm || (this.isBooking() && !this.isAdmin())) {
        this.quotationForm.disable();
      }
    } else {
      // New Entry: Check Add permission
      if (!hasAddPerm) {
        this.toastService.error('You do not have permission to add new ' + (this.router.url.includes('booking') ? 'bookings' : 'quotations'));
        this.goBack();
        return;
      }

      const user = this.authService.currentUser() as any;
      if (user && user.agent_id) {
        this.quotationForm.patchValue({ agentId: user.agent_id.toString() });
      }
    }

    // Initialize minTravelDate
    this.minTravelDate.set(this.quotationForm.get('tripStartDate')?.value || '');

    // Load markup for pre-selected agent (edit mode)
    const currentAgentId = this.quotationForm.get('agentId')?.value;
    if (currentAgentId) {
      this.loadAgentMarkup(currentAgentId);
    }

    // Role-based restrictions: Agents MUST include assistance fee
    if (!this.isAdmin()) {
      this.quotationForm.get('includeFee')?.setValue(true);
      this.quotationForm.get('includeFee')?.disable();
    }
  }

  loadMasterData() {
    this.agentApiService.listAgents().subscribe(data => this.availableAgents.set(data));
    this.hotelApiService.listHotels().subscribe(res => this.availableHotels.set(res.data));
    this.excursionApiService.listExcursions().subscribe(res => this.availableExcursions.set(res.data));
    this.tourApiService.listTours().subscribe(res => this.availableTours.set(res.data));
    this.transferApiService.listTransfers().subscribe(res => this.availableTransfers.set(res.data));
  }

  openFlightModal(index: number | null = null) {
    this.editingIndex.set(index);
    this.flightData.set(index !== null ? this.flights()[index] : null);
    this.isFlightModalOpen.set(true);
  }
  closeFlightModal() { this.isFlightModalOpen.set(false); }
  saveFlight(data: any) {
    const normalized = {
      date: data.dateOfTravel,
      flight: data.flight,
      number: data.number,
      inOut: data.flightInOut,
      route: data.route,
      edt: data.departureTime,
      eat: data.arrivalTime,
      issued: data.issuedBy,
      cost: data.cost,
      remarks: data.remarks
    };
    if (this.editingIndex() !== null) {
      this.flights.update(items => {
        const newItems = [...items];
        newItems[this.editingIndex()!] = normalized;
        return newItems;
      });
    } else {
      this.flights.update(items => [...items, normalized]);
    }
    this.closeFlightModal();
  }

  openTransferModal(index: number | null = null) {
    this.editingIndex.set(index);
    this.transferData.set(index !== null ? this.transfers()[index] : null);
    this.isTransferModalOpen.set(true);
  }
  closeTransferModal() { this.isTransferModalOpen.set(false); }
  saveTransfer(data: any) {
    const normalized = {
      date: data.date,
      city: data.city,
      description: data.transfer_name || data.description,
      transfer_id: data.transfer_id,
      tot: data.tot,
      from: data.from,
      to: data.to,
      pickup: data.pickupTime || data.pickup,
      remarks: data.remarks,
      price: data.price,
      typeOfTransfer: data.typeOfTransfer,
      type_of_transfer: data.typeOfTransfer,
      display_order: data.display_order ?? 0,
      flight: data.flight,
      flightTime: data.flightTime
    };
    if (this.editingIndex() !== null) {
      this.transfers.update(items => {
        const newItems = [...items];
        newItems[this.editingIndex()!] = normalized;
        return newItems;
      });
    } else {
      this.transfers.update(items => [...items, normalized]);
    }
    this.closeTransferModal();
  }

  openHotelModal(index: number | null = null) {
    this.editingIndex.set(index);
    this.hotelData.set(index !== null ? this.hotels()[index] : null);
    this.isHotelModalOpen.set(true);
  }
  closeHotelModal() { this.isHotelModalOpen.set(false); }
  saveHotel(data: any) {
    let roomType = data.roomType || '';
    if (data.roomTypes && Array.isArray(data.roomTypes)) {
      roomType = data.roomTypes.map((rt: any) => rt.roomType).filter(Boolean).join(', ');
    }

    // Count how many room rows have extra beds checked, factoring in quantity
    const roomTypesArr: any[] = data.roomTypes || [];
    const extraAdultBedCount = roomTypesArr.reduce((sum: number, rt: any) => sum + (rt.extraAdultBed ? (Number(rt.extraAdultBedQty) || 1) : 0), 0);
    const extraChildBedCount = roomTypesArr.reduce((sum: number, rt: any) => sum + (rt.extraChildBed ? (Number(rt.extraChildBedQty) || 1) : 0), 0);

    const normalized = {
      id: data.id,  // preserve DB record id for updates
      booking_status: data.booking_status,
      booking_remark: data.booking_remark,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      city: data.city,
      hotel: data.hotel_name || data.hotel,
      hotel_id: data.hotel_id,
      roomType: roomType,
      roomTypes: data.roomTypes || [],
      nights: data.nights,
      singleRoom: data.single || data.singleRoom,
      doubleRoom: data.double || data.doubleRoom,
      extraAdultBedCount,
      extraChildBedCount,
      promotion: data.promotion,
      price: data.price,
      meals: data.meals ? {
        hasAbf: !!data.meals.hasAbf,
        hasLunch: !!data.meals.hasLunch,
        hasDinner: !!data.meals.hasDinner,
        hasAllInclusive: !!data.meals.hasAllInclusive,
        abfDays: data.meals.abfDays || 0,
        lunchDays: data.meals.lunchDays || 0,
        dinnerDays: data.meals.dinnerDays || 0,
        allInclusiveDays: data.meals.allInclusiveDays || 0,
        abfNotes: data.meals.abfNotes || '',
        lunchNotes: data.meals.lunchNotes || '',
        dinnerNotes: data.meals.dinnerNotes || '',
        allInclusiveNotes: data.meals.allInclusiveNotes || ''
      } : null,
      notes: data.notes || data.remarks || '',
      earlyCheckIn: data.earlyCheckIn || false,
      lateCheckOut: data.lateCheckOut || false,
      flightIn: data.flightIn || '',
      flightOut: data.flightOut || '',
      flightInfo: data.flightInfo || '',
      discount: data.discount || 0,
      adults: data.adults || 0,
      children: data.children || 0,
      compAbf: data.compAbf || false,
      extraAdultBed: data.extraAdultBed || false,
      extraChildBed: data.extraChildBed || false,
      sharingBed: data.sharingBed || false,
      display_order: data.display_order ?? 0
    };
    if (this.editingIndex() !== null) {
      this.hotels.update(items => {
        const newItems = [...items];
        newItems[this.editingIndex()!] = normalized;
        return newItems;
      });
    } else {
      this.hotels.update(items => [...items, normalized]);
    }
    this.closeHotelModal();
  }

  openExcursionModal(index: number | null = null) {
    this.editingIndex.set(index);
    this.excursionData.set(index !== null ? this.excursions()[index] : null);
    this.isExcursionModalOpen.set(true);
  }
  closeExcursionModal() { this.isExcursionModalOpen.set(false); }
  saveExcursion(data: any) {
    const normalized = {
      date: data.date,
      city: data.city,
      name: data.excursion_name || data.name,
      excursion_id: data.excursion_id,
      pickup: data.pickupTime || data.pickup,
      hotel: data.hotel,
      remarks: data.remarks,
      toe: data.typeOfExcursion || data.toe,
      price: data.price,
      display_order: data.display_order ?? 0
    };
    if (this.editingIndex() !== null) {
      this.excursions.update(items => {
        const newItems = [...items];
        newItems[this.editingIndex()!] = normalized;
        return newItems;
      });
    } else {
      this.excursions.update(items => [...items, normalized]);
    }
    this.closeExcursionModal();
  }

  openTourModal(index: number | null = null) {
    this.editingIndex.set(index);
    this.tourData.set(index !== null ? this.tours()[index] : null);
    this.isTourModalOpen.set(true);
  }
  closeTourModal() { this.isTourModalOpen.set(false); }
  saveTour(data: any) {
    const normalized = {
      city: data.startCity || data.city,
      name: data.tour_name || data.name,
      tour_id: data.tour_id,
      tot: data.tot,
      route: data.route,
      pax: data.pax,
      remarks: data.remarks,
      price: data.price,
      display_order: data.display_order ?? 0
    };
    if (this.editingIndex() !== null) {
      this.tours.update(items => {
        const newItems = [...items];
        newItems[this.editingIndex()!] = normalized;
        return newItems;
      });
    } else {
      this.tours.update(items => [...items, normalized]);
    }
    this.closeTourModal();
  }

  openOtherModal(index: number | null = null) {
    this.editingIndex.set(index);
    this.otherData.set(index !== null ? this.other()[index] : null);
    this.isOtherModalOpen.set(true);
  }
  closeOtherModal() { this.isOtherModalOpen.set(false); }
  saveOther(data: any) {
    if (this.editingIndex() !== null) {
      this.other.update(items => {
        const newItems = [...items];
        newItems[this.editingIndex()!] = data;
        return newItems;
      });
    } else {
      this.other.update(items => [...items, data]);
    }
    this.closeOtherModal();
  }

  removeFlight(index: number) { this.flights.update(items => items.filter((_, i) => i !== index)); }
  removeTransfer(index: number) { this.transfers.update(items => items.filter((_, i) => i !== index)); }
  removeHotel(index: number) { this.hotels.update(items => items.filter((_, i) => i !== index)); }
  removeExcursion(index: number) { this.excursions.update(items => items.filter((_, i) => i !== index)); }
  removeTour(index: number) { this.tours.update(items => items.filter((_, i) => i !== index)); }
  removeOther(index: number) { this.other.update(items => items.filter((_, i) => i !== index)); }

  saveQuotation() {
    if (this.quotationForm.invalid) {
      this.quotationForm.markAllAsTouched();
      this.toastService.error('Please fill all required fields (marked with *).');
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.error, .invalid-field, .ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
          firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }
    const formValue: any = this.quotationForm.getRawValue();
    
    const quotationData: any = {
      agent_id: formValue.agentId ? Number(formValue.agentId) : null,
      client_name: formValue.clientName || 'N/A',
      client_phone: formValue.mobileNumber || '',
      client_email: formValue.emailId || '',
      booking_reference: formValue.bookingRef || '',
      number_of_adults: Number(formValue.adults) || 0,
      number_of_kids: Number(formValue.children) || 0,
      trip_start_date: formValue.tripStartDate || null,
      total_amount: this.totalCost(),
      final_amount: this.finalPrice(),
      remarks: formValue.remark || '',
      status: this.isBooking() ? 'InProgress' : (formValue.status || 'Pending'),
      hotels: this.hotels(),
      transfers: this.transfers(),
      excursions: this.excursions(),
      tours: this.tours(),
      flights: this.flights(),
      other: this.other()
    };

    this.isSaving.set(true);
    if (this.editId()) {
      this.tripApiService.updateTrip(this.editId()!, quotationData).subscribe({
        next: (updatedTrip: any) => {
          this.isSaving.set(false);
          this.syncSignalsWithResponse(updatedTrip);
          this.toastService.success('Quotation updated successfully!');
          setTimeout(() => this.goBack(), 1500);
        },
        error: (err: any) => {
          this.isSaving.set(false);
          console.error('Error updating trip:', err);
          this.toastService.error('Failed to update trip');
        }
      });
    } else {
      this.tripApiService.createTrip(quotationData).subscribe({
        next: (newTrip: any) => {
          this.isSaving.set(false);
          this.editId.set(newTrip.id);
          this.syncSignalsWithResponse(newTrip);
          this.toastService.success('Quotation created successfully!');
          setTimeout(() => this.goBack(), 1500);
        },
        error: (err: any) => {
          this.isSaving.set(false);
          console.error('Error creating trip:', err);
          this.toastService.error('Failed to save trip');
        }
      });
    }
  }

  private mapTripDataToSignals(trip: any) {
    if (trip.hotels) {
      this.hotels.set(trip.hotels.map((h: any) => {
        let mealsVal = h.meals;
        if (typeof mealsVal === 'string') {
          try { mealsVal = JSON.parse(mealsVal); } catch(e) {}
        }
        let roomTypesVal = h.room_types_json || h.room_types || [];
        if (typeof roomTypesVal === 'string') {
          try { roomTypesVal = JSON.parse(roomTypesVal); } catch(e) {}
        }
        // Compute extra bed counts from roomTypes or from saved DB fields
        const roomTypesForCount: any[] = roomTypesVal || [];
        const extraAdultBedCount = h.extra_adult_bed_count != null
          ? Number(h.extra_adult_bed_count)
          : roomTypesForCount.filter((rt: any) => !!rt.extraAdultBed).length;
        const extraChildBedCount = h.extra_child_bed_count != null
          ? Number(h.extra_child_bed_count)
          : roomTypesForCount.filter((rt: any) => !!rt.extraChildBed).length;

        return {
          ...h,
          id: h.id, 
          checkIn: h.from_date ? h.from_date.split('T')[0] : '',
          checkOut: h.to_date ? h.to_date.split('T')[0] : '',
          city: h.city,
          hotel: h.hotel_name,
          hotel_id: h.hotel_id, 
          roomType: h.room_type,
          roomTypes: roomTypesVal, 
          promotion: h.promotion,
          nights: h.nights,
          singleRoom: h.single_price,
          doubleRoom: h.double_price,
          extraAdultBedCount,
          extraChildBedCount,
          price: Number(h.total_price) || Number(h.price) || 0,
          meals: mealsVal,
          notes: h.notes || h.remarks || '',
          earlyCheckIn: !!h.early_check_in,
          lateCheckOut: !!h.late_check_out,
          flightIn: h.flight_in || '',
          flightOut: h.flight_out || '',
          flightInfo: h.flight_info || '',
          discount: h.discount || 0,
          display_order: h.display_order ?? 0
        };
      }));
    }
    if (trip.transfers) {
      this.transfers.set(trip.transfers.map((t: any) => ({
        ...t,
        id: t.id,
        date: t.from_date ? t.from_date.split('T')[0] : '',
        city: t.city,
        description: t.transfer_description || t.description,
        pickup: t.pickup_time,
        tot: t.tot,
        from: t.from_location,
        to: t.to_location,
        price: t.price,
        remarks: t.remarks,
        typeOfTransfer: t.type_of_transfer || t.typeOfTransfer || '',
        display_order: t.display_order ?? 0,
        flight: t.flight_number || '',
        flightTime: t.flight_time || ''
      })));
    }
    if (trip.excursions) {
      this.excursions.set(trip.excursions.map((e: any) => ({
        ...e,
        id: e.id,
        date: e.from_date ? e.from_date.split('T')[0] : '',
        city: e.city,
        name: e.excursion_name || e.excursion_id, 
        excursion_id: e.excursion_id,
        pickup: e.pickup_time,
        hotel: e.hotel,
        price: e.price,
        remarks: e.remarks,
        display_order: e.display_order ?? 0
      })));
    }
    if (trip.tours) {
      this.tours.set(trip.tours.map((t: any) => ({
        ...t,
        id: t.id,
        date: t.from_date ? t.from_date.split('T')[0] : '',
        city: t.from_location,
        name: t.tour_name || t.tour_id,
        tour_id: t.tour_id,
        tot: t.tot,
        pax: t.pax,
        route: t.route,
        price: t.price,
        remarks: t.remarks,
        display_order: t.display_order ?? 0
      })));
    }
    if (trip.flights) {
      this.flights.set(trip.flights.map((f: any) => ({
        ...f,
        id: f.id,
        date: f.from_date ? f.from_date.split('T')[0] : '',
        number: f.flight_number,
        flight: f.flight_airline,
        edt: f.edt,
        eat: f.eat,
        issued: f.issued_by,
        inOut: f.in_or_out || 'Inbound',
        route: f.route,
        cost: f.price,
        remarks: f.remarks
      })));
    }
    if (trip.other) {
      this.other.set(trip.other.map((o: any) => ({
        ...o,
        id: o.id,
        date: o.from_date ? o.from_date.split('T')[0] : ''
      })));
    }
  }

  private syncSignalsWithResponse(trip: any) {
    this.mapTripDataToSignals(trip);
  }

  sendHotelEmail(index: number) {
    const hotel = this.hotels()[index];
    if (!hotel || (!hotel.hotel_id && !hotel.id)) {
       this.toastService.error('Cannot send email: Hotel data or ID is missing.');
       return;
    }
    
    if (!hotel.id) {
      this.toastService.warning('Please Save the Quotation first before sending an email.');
      return;
    }
    
    this.sendingEmailIndex.set(index);
    const bookingData = {
      item_id: hotel.id,
      hotel_name: hotel.hotel,
      checkIn: hotel.checkIn,
      checkOut: hotel.checkOut,
      nights: hotel.nights,
      roomType: hotel.roomType,
      city: hotel.city,
      bookingRef: this.quotationForm.get('bookingRef')?.value || '',
      promotion: hotel.promotion || '',
      meals: hotel.meals || null,
      notes: hotel.notes || '',
      earlyCheckIn: !!hotel.earlyCheckIn,
      lateCheckOut: !!hotel.lateCheckOut,
      flightIn: hotel.flightIn || '',
      flightOut: hotel.flightOut || '',
      flightInfo: hotel.flightInfo || ''
    };
    
    this.emailApiService.sendHotelBookingEmail(hotel.hotel_id, bookingData).subscribe({
      next: (res) => {
        this.sendingEmailIndex.set(null);
        if (res.previewUrl) {
           const confirmView = confirm('Success! Email sent to: ' + res.recipient + '\n\nWould you like to view the email preview (Ethereal)?');
           if (confirmView) {
             window.open(res.previewUrl, '_blank');
           }
        } else {
           this.toastService.success('Email sent successfully to ' + res.recipient);
        }
      },
      error: (err) => {
        this.sendingEmailIndex.set(null);
        console.error('Error:', err);
        this.toastService.error('Failed to send email');
      }
    });
  }

  openConvertConfirmModal() {
    // Guard: prevent double-convert if already a booking
    if (this.isBooking()) {
      this.toastService.error('This quotation has already been converted to a booking.');
      return;
    }
    this.isConfirmConvertModalOpen.set(true);
  }

  closeConvertConfirmModal() {
    this.isConfirmConvertModalOpen.set(false);
  }

  confirmConvertBooking() {
    const id = this.editId();
    if (!id) return;

    // For agents: form is disabled (view-only), skip form validation & updateTrip
    // Just call updateTripStatus -> convertToBooking -> navigate to payment
    if (!this.isAdmin()) {
      this.isConfirmConvertModalOpen.set(false);
      this.isSaving.set(true);
      this.tripApiService.convertToBooking(id).subscribe({
        next: () => {
          this.tripApiService.updateTripStatus(id, 'OnProcess').subscribe({
            next: () => {
              this.isBooking.set(true);
              this.isSaving.set(false);
              this.toastService.success('Converted to Booking successfully!');
              this.router.navigate(['/payment'], { queryParams: { tripId: id } });
            },
            error: (err) => {
              this.isSaving.set(false);
              console.error('Failed to update status', err);
              this.toastService.error('Converted but failed to set status to OnProcess.');
              this.router.navigate(['/payment'], { queryParams: { tripId: id } });
            }
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          console.error('Failed to convert', err);
          this.toastService.error('Failed to convert to booking.');
        }
      });
      return;
    }

    // For admin: validate form, save all changes, then convert
    if (this.quotationForm.invalid) {
      this.isConfirmConvertModalOpen.set(false);
      this.quotationForm.markAllAsTouched();
      this.toastService.error('Please fill all required fields before converting.');
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.error, .invalid-field, .ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
          firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }
    
    this.isConfirmConvertModalOpen.set(false);
    this.isSaving.set(true);
      
      const formValue: any = this.quotationForm.getRawValue();
      const quotationData: any = {
        agent_id: formValue.agentId ? Number(formValue.agentId) : null,
        client_name: formValue.clientName || 'N/A',
        client_phone: formValue.mobileNumber || '',
        client_email: formValue.emailId || '',
        booking_reference: formValue.bookingRef || '',
        number_of_adults: Number(formValue.adults) || 0,
        number_of_kids: Number(formValue.children) || 0,
        trip_start_date: formValue.tripStartDate || null,
        total_amount: this.totalCost(),
        final_amount: this.finalPrice(),
        remarks: formValue.remark || '',
        status: 'InProgress',
        hotels: this.hotels(),
        transfers: this.transfers(),
        excursions: this.excursions(),
        tours: this.tours(),
        flights: this.flights(),
        other: this.other()
      };

      this.tripApiService.updateTrip(id, quotationData).subscribe({
        next: () => {
          this.tripApiService.convertToBooking(id).subscribe({
            next: () => {
              this.tripApiService.updateTripStatus(id, 'OnProcess').subscribe({
                next: () => {
                  this.isBooking.set(true);
                  this.isSaving.set(false);
                  this.toastService.success('Converted to Booking successfully!');
                  this.router.navigate(['/payment'], { queryParams: { tripId: id } });
                },
                error: (err) => {
                  this.isSaving.set(false);
                  console.error('Failed to set status', err);
                  this.toastService.error('Converted but failed to set status to OnProcess.');
                  this.router.navigate(['/payment'], { queryParams: { tripId: id } });
                }
              });
            },
            error: (err) => {
              this.isSaving.set(false);
              console.error('Failed to convert', err);
              this.toastService.error('Failed to convert to booking.');
            }
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          console.error('Failed to save before converting', err);
          this.toastService.error('Failed to save changes before converting.');
        }
      });
  }

  goBack() {
    this.location.back();
  }
}
