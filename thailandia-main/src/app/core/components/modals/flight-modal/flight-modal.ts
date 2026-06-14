import { Component, ChangeDetectionStrategy, EventEmitter, Output, inject, input, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-flight-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './flight-modal.html',
  styleUrl: './flight-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlightModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  initialData = input<any>(null);
  minDate = input<string>('');

  public translationService = inject(TranslationService);
  public t = this.translationService.translations;

  flightForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.flightForm = this.fb.group({
      flight: [''],
      number: [''],
      flightInOut: [''],
      route: [''],
      dateOfTravel: [''],
      departureTime: [''],
      arrivalTime: [''],
      issuedBy: [''],
      cost: [0],
      remarks: ['']
    });

    // Use effect to patch form when input data changes (necessary due to [hidden] usage)
    effect(() => {
      const d = this.initialData();
      if (d) {
        this.flightForm.patchValue({
          flight: d.flight || '',
          number: d.number || '',
          flightInOut: (d.inOut || '').toLowerCase().includes('in') ? 'in' : 'out',
          route: d.route || '',
          dateOfTravel: d.date || '',
          departureTime: d.edt || '',
          arrivalTime: d.eat || '',
          issuedBy: d.issued || '',
          cost: d.cost || 0,
          remarks: d.remarks || ''
        });
      } else {
        this.flightForm.reset({
          flight: '',
          number: '',
          flightInOut: '',
          route: '',
          dateOfTravel: '',
          departureTime: '',
          arrivalTime: '',
          issuedBy: '',
          cost: 0,
          remarks: ''
        });
      }
    });
  }

  ngOnInit() {
    // Logic moved to effect for reactive updates
  }

  onClose() {
    this.close.emit();
  }

  errorMessage = signal<string | null>(null);

  onSave() {
    if (this.flightForm.valid) {
      this.errorMessage.set(null);
      this.save.emit(this.flightForm.value);
    } else {
      this.errorMessage.set('Please fill in all required fields.');
      this.flightForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
        }
      }, 100);
    }
  }
}
