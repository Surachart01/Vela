import { Component, ChangeDetectionStrategy, inject, signal, input, output, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './payment-modal.html',
  styleUrl: './payment-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentModalComponent implements OnInit {
  public translationService = inject(TranslationService);
  private fb = inject(FormBuilder);
  public t = this.translationService.translations;

  paymentData = input<any>(null);
  
  close = output<void>();
  save = output<any>();

  paymentForm: FormGroup;
  finalCost = signal(0);
  previousPaid = signal(0);
  balance = signal(0);

  constructor() {
    this.paymentForm = this.fb.group({
      amount_paid: [0, [Validators.required, Validators.min(0)]],
      penalty_cost: [0, [Validators.min(0)]],
      remarks: ['']
    });

    effect(() => {
      const data = this.paymentData();
      if (data) {
        this.finalCost.set(Number(data.finalCost || data.final_amount) || 0);
        this.previousPaid.set(Number(data.amtPaid || data.amount_paid) || 0);
        
        // Default amount to pay is the remaining balance
        const currentBalance = this.finalCost() - this.previousPaid();
        this.balance.set(currentBalance);
        
        this.paymentForm.patchValue({
          amount_paid: currentBalance > 0 ? currentBalance : 0,
          penalty_cost: Number(data.penalty || data.penalty_cost) || 0,
          remarks: data.remarks || ''
        });
      }
    });
  }

  ngOnInit() {}

  errorMessage = signal<string | null>(null);

  onSave() {
    if (this.paymentForm.valid) {
      this.errorMessage.set(null);
      const formValue = this.paymentForm.getRawValue();
      
      // Calculate cumulative amount paid
      const totalAmountPaid = this.previousPaid() + Number(formValue.amount_paid);
      
      this.save.emit({
        amount_paid: totalAmountPaid,
        penalty_cost: formValue.penalty_cost,
        remarks: formValue.remarks
      });
    } else {
      this.errorMessage.set('Please fill in all required fields.');
      this.paymentForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
        }
      }, 100);
    }
  }
}
