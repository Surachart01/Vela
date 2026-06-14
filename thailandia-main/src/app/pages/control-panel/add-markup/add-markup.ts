import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { MarkupApiService } from '../../../core/services/api/markup-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AddMarkupRangeModalComponent } from '../../../core/components/modals/add-markup-range-modal/add-markup-range-modal';

@Component({
  selector: 'app-add-markup',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AddMarkupRangeModalComponent],
  templateUrl: './add-markup.html',
  styleUrl: './add-markup.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddMarkupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private location = inject(Location);
  private translationService = inject(TranslationService);
  private markupApiService = inject(MarkupApiService);
  private route = inject(ActivatedRoute);
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  
  public t = this.translationService.translations;

  markupId = signal<string | null>(null);

  markupForm = this.fb.group({
    groupName: ['', Validators.required],
    hotelMarkupUnit: ['%'],
    hotelMarkupValue: [0 as number | null],
    excursionMarkupUnit: ['%'],
    excursionMarkupValue: [0 as number | null, Validators.required],
    tourMarkupUnit: ['%'],
    tourMarkupValue: [0 as number | null, Validators.required],
    transferMarkupUnit: ['%'],
    transferMarkupValue: [0 as number | null, Validators.required]
  });

  hotelRanges = signal<any[]>([]);
  isRangeModalOpen = signal(false);
  selectedRange = signal<any | null>(null);
  editingRangeIndex = signal<number | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const isViewMode = this.route.snapshot.queryParamMap.get('mode') === 'view';

    // Permission Check
    if (id) {
      if (!this.authService.canEdit('cp_markups') && !isViewMode) {
        this.toastService.error('Access Denied: You do not have permission to edit markups.');
        this.goBack();
        return;
      }
    } else {
      if (!this.authService.canAdd('cp_markups')) {
        this.toastService.error('Access Denied: You do not have permission to add markups.');
        this.goBack();
        return;
      }
    }

    if (id) {
      this.markupId.set(id);
      this.markupApiService.getMarkup(id).subscribe(markup => {
        const unMapUnit = (unit: string | null | undefined) => unit === 'flat rate' ? 'THB' : (unit || '%');

        this.markupForm.patchValue({
          groupName: markup.markup_group,
          hotelMarkupUnit: unMapUnit(markup.hotel_markup_unit),
          hotelMarkupValue: markup.hotel_markup_value || 0,
          excursionMarkupUnit: unMapUnit(markup.excursion_markup_unit),
          excursionMarkupValue: markup.excursion_markup,
          tourMarkupUnit: unMapUnit(markup.tour_markup_unit),
          tourMarkupValue: markup.tour_markup,
          transferMarkupUnit: unMapUnit(markup.transfer_markup_unit),
          transferMarkupValue: markup.transfer_markup
        });

        if (markup.hotel_markup_percentages) {
          this.hotelRanges.set(markup.hotel_markup_percentages.map((r: any) => ({
            priceFrom: r.price_from,
            priceTo: r.price_to,
            markupValue: r.markup_percentage
          })));
        }
        
        if (isViewMode || !this.authService.canEdit('cp_markups')) {
          this.markupForm.disable();
        }

        this.cd.markForCheck();
      });
    }
  }

  goBack() {
    this.location.back();
  }

  saveMarkup() {
    if (this.markupForm.invalid) {
      this.toastService.error('Please fill in all required fields marked with *');
      this.markupForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.error, .invalid-field, .ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
          firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    const formVal = this.markupForm.value;
    
    // Map 'THB' from UI to 'flat rate' from DB schema
    const mapUnit = (unit: string | null | undefined) => unit === 'THB' ? 'flat rate' : (unit || '%');

    const payload = {
      markup_group: formVal.groupName,
      hotel_markup_unit: mapUnit(formVal.hotelMarkupUnit),
      hotel_markup_value: formVal.hotelMarkupValue || 0,
      excursion_markup_unit: mapUnit(formVal.excursionMarkupUnit),
      excursion_markup: formVal.excursionMarkupValue,
      tour_markup_unit: mapUnit(formVal.tourMarkupUnit),
      tour_markup: formVal.tourMarkupValue,
      transfer_markup_unit: mapUnit(formVal.transferMarkupUnit),
      transfer_markup: formVal.transferMarkupValue,
      hotel_markup_percentages: this.hotelRanges().map(r => ({
        price_from: r.priceFrom,
        price_to: r.priceTo,
        markup_percentage: r.markupValue
      })),
      currency_id: 4 // Default to THB
    };

    const id = this.markupId();
    if (id) {
      this.markupApiService.updateMarkup(id, payload).subscribe({
        next: () => this.goBack(),
        error: (err) => {
          console.error('Error updating markup:', err);
          alert('Failed to update markup. Please check required fields.');
        }
      });
    } else {
      this.markupApiService.createMarkup(payload).subscribe({
        next: () => this.goBack(),
        error: (err) => {
          console.error('Error creating markup:', err);
          alert('Failed to create markup. Name might be too long (max 20) or already exists.');
        }
      });
    }
  }

  openRangeModal(range: any | null = null, index: number | null = null) {
    if (range && index !== null) {
      this.selectedRange.set(range);
      this.editingRangeIndex.set(index);
    } else {
      this.selectedRange.set(null);
      this.editingRangeIndex.set(null);
    }
    this.isRangeModalOpen.set(true);
  }

  handleSaveRange(data: any) {
    const index = this.editingRangeIndex();
    this.hotelRanges.update(list => {
      const newList = [...list];
      if (index !== null) {
        newList[index] = data;
      } else {
        newList.push(data);
      }
      return newList;
    });
    this.isRangeModalOpen.set(false);
    this.editingRangeIndex.set(null);
    this.cd.markForCheck();
  }

  removeRange(index: number) {
    if (confirm('Are you sure you want to remove this range?')) {
      this.hotelRanges.update(list => list.filter((_, i) => i !== index));
      this.cd.markForCheck();
    }
  }
}
