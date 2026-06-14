import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-add-hotel-contact-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-hotel-contact-modal.html',
  styleUrl: './add-hotel-contact-modal.css'
})
export class AddHotelContactModalComponent {
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  public t = this.translationService.translations;

  @Input() isOpen = false;
  @Input() set contactData(data: any | null) {
    if (data) {
      this.contactForm.patchValue(data);
      this.editIndex = data.id !== undefined ? data.id : null;
    } else {
      this.contactForm.reset();
      this.editIndex = null;
    }
  }

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  editIndex: number | null = null;

  contactForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    email: [''],
    telephone: ['']
  });

  closeModal() {
    this.close.emit();
  }

  errorMessage: string | null = null;

  onSubmit() {
    if (this.contactForm.valid) {
      this.errorMessage = null;
      const data = { ...this.contactForm.value };
      if (this.editIndex !== null) {
        data.id = this.editIndex;
      }
      this.save.emit(data);
      this.contactForm.reset();
    } else {
      this.errorMessage = 'Please fill in all required fields.';
      this.contactForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
        }
      }, 100);
    }
  }
}
