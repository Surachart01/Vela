import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-add-hotel-room-modal',
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './add-hotel-room-modal.html',
  styleUrl: './add-hotel-room-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddHotelRoomModalComponent {
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);
  public t = this.translationService.translations;

  @Input() isOpen = false;
  @Input() set roomData(data: unknown | null) {
    const d = data as Record<string, unknown> | null;
    if (d) {
      // Patch top-level fields
      this.roomForm.patchValue({
        dateFrom: d['dateFrom'] ?? '',
        dateTo: d['dateTo'] ?? '',
        foodCostAdultAbf: d['foodCostAdultAbf'] ?? 0,
        foodCostAdultLunch: d['foodCostAdultLunch'] ?? 0,
        foodCostAdultDinner: d['foodCostAdultDinner'] ?? 0,
        foodCostAdultAllInclusive: d['foodCostAdultAllInclusive'] ?? 0,
        foodCostChildAbf: d['foodCostChildAbf'] ?? 0,
        foodCostChildLunch: d['foodCostChildLunch'] ?? 0,
        foodCostChildDinner: d['foodCostChildDinner'] ?? 0,
        foodCostChildAllInclusive: d['foodCostChildAllInclusive'] ?? 0,
        extraBedAdult: d['extraBedAdult'] ?? 0,
        extraBedChild: d['extraBedChild'] ?? 0,
        extraBedShared: d['extraBedShared'] ?? 0,
      });
      // Patch room entries
      const entries = d['roomEntries'] as unknown[] | undefined;
      this.roomEntries.clear();
      if (entries && entries.length > 0) {
        entries.forEach((entry) => {
          this.roomEntries.push(this.createRoomEntry(entry as Record<string, unknown>));
        });
      } else {
        this.roomEntries.push(this.createRoomEntry());
      }
      this.editIndex = d['id'] !== undefined ? d['id'] as number : null;
      this.roomEntriesControls.set([...this.roomEntries.controls] as FormGroup[]);
      this.cd.markForCheck();
    } else {
      this.resetForm();
      this.editIndex = null;
    }
  }

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<unknown>();

  editIndex: number | null = null;

  /** Signal snapshot of FormArray controls — required because FormArray.clear/push mutate
   *  the same array reference, which OnPush's @for cannot detect without a new reference. */
  roomEntriesControls = signal<FormGroup[]>([]);

  roomForm: FormGroup = this.fb.group({
    dateFrom: ['', Validators.required],
    dateTo: ['', Validators.required],
    roomEntries: this.fb.array([this.createRoomEntry()]),
    foodCostAdultAbf: [null],
    foodCostAdultLunch: [null],
    foodCostAdultDinner: [null],
    foodCostAdultAllInclusive: [null],
    foodCostChildAbf: [null],
    foodCostChildLunch: [null],
    foodCostChildDinner: [null],
    foodCostChildAllInclusive: [null],
    extraBedAdult: [null],
    extraBedChild: [null],
    extraBedShared: [null],
  });

  get roomEntries(): FormArray {
    return this.roomForm.get('roomEntries') as FormArray;
  }

  createRoomEntry(data?: Record<string, unknown>): FormGroup {
    return this.fb.group({
      name: [data?.['name'] ?? '', Validators.required],
      allotment: [data?.['allotment'] ?? null],
      cutOff: [data?.['cutOff'] ?? null],
      maxCapacity: [data?.['maxCapacity'] ?? null],
      singlePrice: [data?.['singlePrice'] ?? null],
      doublePrice: [data?.['doublePrice'] ?? null],
    });
  }

  addRoomEntry() {
    this.roomEntries.push(this.createRoomEntry());
    this.roomEntriesControls.set([...this.roomEntries.controls] as FormGroup[]);
  }

  removeRoomEntry(index: number) {
    if (this.roomEntries.length > 1) {
      this.roomEntries.removeAt(index);
      this.roomEntriesControls.set([...this.roomEntries.controls] as FormGroup[]);
    }
  }

  resetForm() {
    this.roomEntries.clear();
    this.roomEntries.push(this.createRoomEntry());
    this.roomEntriesControls.set([...this.roomEntries.controls] as FormGroup[]);
    this.roomForm.patchValue({
      dateFrom: '', dateTo: '',
      foodCostAdultAbf: null, foodCostAdultLunch: null, foodCostAdultDinner: null, foodCostAdultAllInclusive: null,
      foodCostChildAbf: null, foodCostChildLunch: null, foodCostChildDinner: null, foodCostChildAllInclusive: null,
      extraBedAdult: null, extraBedChild: null, extraBedShared: null,
    });
    this.cd.markForCheck();
  }

  closeModal() {
    this.close.emit();
  }

  onSubmit() {
    if (this.roomForm.valid) {
      const data: Record<string, unknown> = { ...this.roomForm.value };
      if (this.editIndex !== null) {
        data['id'] = this.editIndex;
      }
      this.save.emit(data);
      this.resetForm();
    } else {
      this.roomForm.markAllAsTouched();
    }
  }
}
