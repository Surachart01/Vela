import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { OtherChargeApiService } from '../../../core/services/api/other-charge-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-add-other-charge',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-other-charge.html',
  styleUrl: './add-other-charge.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddOtherChargeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private location = inject(Location);
  private translationService = inject(TranslationService);
  private otherChargeApiService = inject(OtherChargeApiService);
  private route = inject(ActivatedRoute);
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  
  public t = this.translationService.translations;

  chargeId = signal<string | null>(null);

  chargeForm = this.fb.group({
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0)]],
    type: ['', Validators.required]
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const isViewMode = this.route.snapshot.queryParamMap.get('mode') === 'view';

    // Permission Check
    if (id) {
      if (!this.authService.canEdit('cp_other_charges') && !isViewMode) {
        this.toastService.error('Access Denied: You do not have permission to edit other charges.');
        this.goBack();
        return;
      }
    } else {
      if (!this.authService.canAdd('cp_other_charges')) {
        this.toastService.error('Access Denied: You do not have permission to add other charges.');
        this.goBack();
        return;
      }
    }

    if (id) {
      this.chargeId.set(id);
      this.otherChargeApiService.getOtherCharge(id).subscribe(charge => {
        this.chargeForm.patchValue({
          description: charge.description,
          amount: charge.amount,
          type: charge.chargetype || charge.type
        });

        if (isViewMode || !this.authService.canEdit('cp_other_charges')) {
          this.chargeForm.disable();
        }

        this.cd.markForCheck();
      });
    }
  }

  goBack() {
    this.location.back();
  }

  saveCharge() {
    console.log('Attempting to save charge...', this.chargeForm.value);
    if (this.chargeForm.invalid) {
      console.warn('Form is invalid:', this.chargeForm.errors);
      this.toastService.error('Please fill in all required fields');
      this.chargeForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.error, .invalid-field, .ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
          firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    const formVal = this.chargeForm.value;
    const payload = {
      description: formVal.description,
      amount: formVal.amount,
      chargetype: formVal.type
    };

    const id = this.chargeId();
    if (id) {
      this.otherChargeApiService.updateOtherCharge(id, payload).subscribe({
        next: () => this.goBack(),
        error: (err) => {
          console.error('Error updating charge:', err);
          alert('Failed to update charge');
        }
      });
    } else {
      this.otherChargeApiService.createOtherCharge(payload).subscribe({
        next: () => this.goBack(),
        error: (err) => {
          console.error('Error creating charge:', err);
          alert('Failed to create charge');
        }
      });
    }
  }
}
