import { Component, output, inject, ChangeDetectionStrategy, input, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DateInputComponent } from '../../date-input/date-input';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-other-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputComponent],
  templateUrl: './other-modal.html',
  styleUrl: './other-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtherModalComponent implements OnInit {
  private translationService = inject(TranslationService);
  private fb = inject(FormBuilder);

  initialData = input<any>(null);
  minDate = input<string>('');
  public t = this.translationService.translations;
  
  close = output<void>();
  save = output<any>();
  otherForm: FormGroup;

  constructor() {
    this.otherForm = this.fb.group({
      description: ['', Validators.required],
      date: [''],
      cost: [0],
      totalPrice: ['', Validators.required],
      remarks: ['']
    });

    effect(() => {
      const d = this.initialData();
      if (d) {
        this.otherForm.patchValue(d);
      } else {
        this.otherForm.reset({ cost: 0, totalPrice: '' });
      }
    });
  }

  ngOnInit() {}

  errorMessage = signal<string | null>(null);

  onSave() {
    if (this.otherForm.valid) {
      this.errorMessage.set(null);
      this.save.emit(this.otherForm.getRawValue());
    } else {
      this.errorMessage.set('Please fill in all required fields.');
      this.otherForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
        }
      }, 100);
    }
  }

  onClose() {
    this.close.emit();
  }
}
