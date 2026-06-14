import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { ExcursionApiService } from '../../../core/services/api/excursion-api.service';
import { AddExcursionPriceModalComponent } from '../../../core/components/modals/add-excursion-price-modal/add-excursion-price-modal';
import { AddCityModalComponent } from '../../../core/components/modals/add-city-modal/add-city-modal';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { PdfService } from '../../../core/services/pdf.service';
import { MarkupApiService } from '../../../core/services/api/markup-api.service';
import { MarkupCalculatorService } from '../../../core/services/markup-calculator.service';
import { AgentApiService } from '../../../core/services/api/agent-api.service';

@Component({
  selector: 'app-add-excursion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AddExcursionPriceModalComponent, AddCityModalComponent],
  templateUrl: './add-excursion.html',
  styleUrl: './add-excursion.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddExcursionComponent implements OnInit {
  public location = inject(Location);
  public translationService = inject(TranslationService);
  public t = this.translationService.translations;
  private fb = inject(FormBuilder);
  private excursionApiService = inject(ExcursionApiService);
  private route = inject(ActivatedRoute);
  private cd = inject(ChangeDetectorRef);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  public masterData = inject(MasterDataService);
  private pdfService = inject(PdfService);
  private markupApiService = inject(MarkupApiService);
  private markupCalc = inject(MarkupCalculatorService);
  private agentApiService = inject(AgentApiService);
  viewOnly = signal(false);

  excursionId = signal<string | null>(null);
  daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  excursionForm = this.fb.group({
    name: ['', Validators.required],
    country: ['Thailand', Validators.required],
    city: ['', Validators.required],
    code: ['', Validators.required],
    supplier: ['', Validators.required],
    displayOrder: [0],
    description: ['', Validators.required],
    sicAdult: [0, Validators.required],
    sicChild: [0, Validators.required],
    validDays: this.fb.group({
      Mon: [false],
      Tue: [false],
      Wed: [false],
      Thu: [false],
      Fri: [false],
      Sat: [false],
      Sun: [false]
    })
  });

  pricesList = signal<any[]>([]);
  isPriceModalOpen = signal(false);
  editingPriceId = signal<number | null>(null);

  isCityModalOpen = signal(false);

  // Grouped prices for display
  groupedPrices = computed(() => {
    const map = new Map<string, any>();
    this.pricesList().forEach((p, index) => {
      const key = `${p.dateFrom}_${p.dateTo}`;
      if (!map.has(key)) {
        map.set(key, {
          dateFrom: p.dateFrom,
          dateTo: p.dateTo,
          items: []
        });
      }
      map.get(key).items.push({ ...p, originalIndex: index });
    });
    // Sort items by pax ASC inside each group
    const groups = Array.from(map.values());
    groups.forEach(g => {
      g.items.sort((a: any, b: any) => a.pax - b.pax);
    });
    return groups;
  });

  expandedGroups = signal<Record<string, boolean>>({});

  toggleGroup(key: string) {
    this.expandedGroups.update(state => ({
      ...state,
      [key]: !state[key]
    }));
  }

  // Duplicate date modal
  isDuplicateModalOpen = signal(false);
  duplicatingIndex = signal<number | null>(null);
  duplicateDateFrom = signal('');
  duplicateDateTo = signal('');
  duplicatePriceValue = signal<number | null>(null);

  selectedPrice = computed(() => {
    const id = this.editingPriceId();
    if (id === null) return null;
    return this.pricesList().find(p => p.id === id);
  });

  ngOnInit() {
    // Always refresh to ensure newly added cities appear in the city dropdown
    this.masterData.refresh().subscribe();

    const id = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    const pageId = 'cp_excursions';
    const hasAddPerm = this.authService.canAdd(pageId);
    const hasEditPerm = this.authService.canEdit(pageId);

    if (id && !hasEditPerm) {
      this.viewOnly.set(true);
      this.excursionForm.disable();
    }

    if (!id && !hasAddPerm) {
      this.toastService.error('You do not have permission to add new excursions');
      this.goBack();
      return;
    }

    if (id) {
      this.excursionId.set(id);
      this.excursionApiService.getExcursion(id).subscribe(excursion => {
        this.excursionForm.patchValue({
          name: excursion.name,
          city: excursion.city,
          code: excursion.code,
          description: excursion.description,
          sicAdult: excursion.sic_price_adult,
          sicChild: excursion.sic_price_child,
          supplier: excursion.supplier_name,
          displayOrder: excursion.display_order ?? 0
        });

        // Map valid days string "Mon,Tue" -> checkbox group
        if (excursion.valid_days) {
          const daysArray = excursion.valid_days.split(',');
          const daysGroup: any = {};
          this.daysOfWeek.forEach(d => {
            daysGroup[d] = daysArray.includes(d);
          });
          this.excursionForm.get('validDays')?.patchValue(daysGroup);
        }

        // Map prices
        if (excursion.prices) {
          this.pricesList.set(excursion.prices.map((p: any) => ({
            id: p.id,
            dateFrom: p.start_date ? p.start_date.split('T')[0] : '',
            dateTo: p.end_date ? p.end_date.split('T')[0] : '',
            pax: p.pax,
            price: p.price
          })));
        }
        
        // --- Apply Markup in View Mode (Agent only) ---
        if (this.viewOnly() && this.authService.isAgent()) {
          const applyMarkup = (markupObj: any) => {
            if (!markupObj) return;
            const adultBase = excursion.sic_price_adult || 0;
            const childBase = excursion.sic_price_child || 0;

            const adultWithMarkup = this.markupCalc.applyMarkup(adultBase, markupObj.excursion_markup_unit, markupObj.excursion_markup);
            const childWithMarkup = this.markupCalc.applyMarkup(childBase, markupObj.excursion_markup_unit, markupObj.excursion_markup);

            this.excursionForm.patchValue({
              sicAdult: this.markupCalc.round(adultWithMarkup),
              sicChild: this.markupCalc.round(childWithMarkup)
            });

            this.pricesList.update(list => list.map(p => ({
              ...p,
              price: this.markupCalc.round(this.markupCalc.applyMarkup(p.price, markupObj.excursion_markup_unit, markupObj.excursion_markup))
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
  }

  goBack() {
    this.location.back();
  }

  printPage() {
    const fv = this.excursionForm.getRawValue() as any;
    const item = {
      id: this.excursionId(),
      name: fv.name,
      city: fv.city,
      code: fv.code,
      supplier_name: fv.supplier,
      description: fv.description,
      sic_price_adult: fv.sicAdult,
      sic_price_child: fv.sicChild,
      prices: this.pricesList()
    };
    this.pdfService.generateItemPdf(item, 'excursions');
  }

  toggleDay(day: string) {
    const daysGroup = this.excursionForm.get('validDays');
    if (daysGroup) {
      const current = daysGroup.get(day)?.value;
      daysGroup.get(day)?.setValue(!current);
      daysGroup.get(day)?.markAsTouched();
    }
  }

  isDaySelected(day: string): boolean {
    return !!this.excursionForm.get('validDays')?.get(day)?.value;
  }

  addPrice() {
    this.editingPriceId.set(null);
    this.isPriceModalOpen.set(true);
  }

  editPrice(index: number) {
    const list = this.pricesList();
    if (list[index]) {
      this.editingPriceId.set(list[index].id);
      this.isPriceModalOpen.set(true);
    }
  }

  duplicatePrice(index: number) {
    const item = this.pricesList()[index];
    if (!item) return;
    // Pre-fill the modal with the original row's dates and price, then let user adjust
    this.duplicatingIndex.set(index);
    this.duplicateDateFrom.set(item.dateFrom ?? '');
    this.duplicateDateTo.set(item.dateTo ?? '');
    this.duplicatePriceValue.set(item.price ?? 0);
    this.isDuplicateModalOpen.set(true);
  }

  confirmDuplicate() {
    const index = this.duplicatingIndex();
    if (index === null) return;
    this.pricesList.update(list => {
      const item = list[index];
      if (!item) return list;
      const sameGroupPrices = list.filter(p => p.dateFrom === this.duplicateDateFrom() && p.dateTo === this.duplicateDateTo());
      const newPax = sameGroupPrices.length > 0 
        ? Math.max(...sameGroupPrices.map(p => Number(p.pax) || 0)) + 1 
        : (Number(item.pax) || 0);

      const duplicated = {
        ...item,
        id: Date.now() + Math.random(),
        dateFrom: this.duplicateDateFrom(),
        dateTo: this.duplicateDateTo(),
        pax: newPax,
        price: this.duplicatePriceValue() ?? item.price 
      };
      const newList = [...list];
      newList.splice(index + 1, 0, duplicated);
      return newList;
    });
    this.cancelDuplicate();
  }

  cancelDuplicate() {
    this.isDuplicateModalOpen.set(false);
    this.duplicatingIndex.set(null);
    this.duplicateDateFrom.set('');
    this.duplicateDateTo.set('');
    this.duplicatePriceValue.set(null);
  }

  handleSavePrice(priceDataArray: any[]) {
    if (!priceDataArray || priceDataArray.length === 0) return;

    const idToEdit = this.editingPriceId();
    if (idToEdit !== null) {
      const editedData = priceDataArray[0];
      this.pricesList.update(list => list.map(p => p.id === idToEdit ? { ...p, ...editedData } : p));
      
      if (priceDataArray.length > 1) {
        const newItems = priceDataArray.slice(1).map(data => ({ id: Date.now() + Math.random(), ...data }));
        this.pricesList.update(list => [...list, ...newItems]);
      }
    } else {
      const newItems = priceDataArray.map(data => ({ id: Date.now() + Math.random(), ...data }));
      this.pricesList.update(list => [...list, ...newItems]);
    }
    this.isPriceModalOpen.set(false);
    this.editingPriceId.set(null);
  }

  handleSaveCity(cityName: string) {
    this.excursionForm.get('city')?.setValue(cityName);
    this.isCityModalOpen.set(false);
    // Refresh master data so the new city appears in the dropdown
    this.masterData.refresh().subscribe();
    this.cd.markForCheck();
  }

  removePrice(index: number) {
    this.pricesList.update(list => list.filter((_, i) => i !== index));
  }

  removeGroup(group: any, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete all prices in this date range?')) {
      const idsToRemove = group.items.map((i: any) => i.id);
      this.pricesList.update(list => list.filter(p => !idsToRemove.includes(p.id)));
    }
  }

  saveExcursion() {
    if (this.excursionForm.invalid) {
      this.toastService.error('Please fill in all required fields.');
      this.excursionForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.error, .invalid-field, .ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
          firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    const formVal = this.excursionForm.value;
    const validDaysVal = formVal.validDays as any;
    const validDaysStr = Object.keys(validDaysVal)
      .filter(d => validDaysVal[d])
      .join(',');

    const payload = {
      name: formVal.name,
      city: formVal.city,
      code: formVal.code,
      description: formVal.description,
      sic_price_adult: formVal.sicAdult,
      sic_price_child: formVal.sicChild,
      supplier_name: formVal.supplier,
      valid_days: validDaysStr,
      display_order: formVal.displayOrder || 0,
      prices: this.pricesList().map(p => ({
        start_date: p.dateFrom,
        end_date: p.dateTo,
        pax: p.pax,
        price: p.price,
        cost: p.price, // Default cost to price
        currency_id: 1 // Default to THB
      }))
    };

    const id = this.excursionId();
    if (id) {
      this.excursionApiService.updateExcursion(id, payload).subscribe({
        next: () => {
          this.location.back();
        },
        error: (err) => {
          console.error('Error updating excursion:', err);
          alert('Failed to update excursion');
        }
      });
    } else {
      this.excursionApiService.createExcursion(payload).subscribe({
        next: () => {
          this.location.back();
        },
        error: (err) => {
          console.error('Error creating excursion:', err);
          alert('Failed to create excursion');
        }
      });
    }
  }
}
