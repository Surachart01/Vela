import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { SupplierApiService } from '../../../core/services/api/supplier-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { MasterDataService } from '../../../core/services/master-data.service';

@Component({
  selector: 'app-add-supplier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-supplier.html',
  styleUrl: './add-supplier.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddSupplierComponent implements OnInit {
  private fb = inject(FormBuilder);
  private location = inject(Location);
  private translationService = inject(TranslationService);
  private supplierApiService = inject(SupplierApiService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  public masterData = inject(MasterDataService);
  public t = this.translationService.translations;
  public countries = this.masterData.countries;
  supplierForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    country: ['Thailand', Validators.required],
    location: ['', Validators.required],
    description: [''],
    // Service Types
    serviceTransfers: [false],
    serviceExcursions: [false],
    serviceTours: [false],
    // Policy
    cancellationDays: [3, [Validators.required, Validators.min(-1)]],
    paymentDays: [1, [Validators.required, Validators.min(0)]]
  });

  editId = signal<number | null>(null);
  isEditMode = computed(() => this.editId() !== null);
  viewOnly = signal(false);

  ngOnInit() {
    // Load countries if not yet loaded
    if (this.masterData.countries().length === 0) {
      this.masterData.refresh().subscribe();
    }

    const id = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    const pageId = 'cp_suppliers';
    const hasAddPerm = this.authService.canAdd(pageId);
    const hasEditPerm = this.authService.canEdit(pageId);

    if (mode === 'view' || (id && !hasEditPerm)) {
      this.viewOnly.set(true);
      this.supplierForm.disable();
    }

    if (!id && !hasAddPerm) {
      this.toastService.error('You do not have permission to add new suppliers');
      this.goBack();
      return;
    }

    if (id) {
      const numericId = Number(id);
      this.editId.set(numericId);
      this.loadSupplier(numericId);
    }
  }

  loadSupplier(id: number) {
    this.supplierApiService.getSupplier(id).subscribe({
      next: (supplier) => {
        // Handle both DB schema (booleans) and potential array/string fallback
        let isTransfers = supplier.offers_transfers === true;
        let isExcursions = supplier.offers_excursions === true;
        let isTours = supplier.offers_tours === true;

        if (!isTransfers && !isExcursions && !isTours) {
          const rawServices = supplier.services || supplier.service_types || [];
          let services: string[] = [];
          if (Array.isArray(rawServices)) {
            services = rawServices;
          } else if (typeof rawServices === 'string') {
            try {
              services = JSON.parse(rawServices);
            } catch {
              services = rawServices.split(',').map((s: string) => s.trim());
            }
          }
          const hasService = (type: string) => services.some(s => s.toLowerCase() === type.toLowerCase());
          isTransfers = hasService('Transfers');
          isExcursions = hasService('Excursions');
          isTours = hasService('Tours');
        }

        this.supplierForm.patchValue({
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone || supplier.telephone || '',
          country: supplier.country || 'Thailand',
          location: supplier.location,
          description: supplier.description,
          serviceTransfers: isTransfers,
          serviceExcursions: isExcursions,
          serviceTours: isTours,
          cancellationDays: supplier.cancellation_days ?? 3,
          paymentDays: supplier.payment_days ?? 1
        });
      },
      error: (err) => {
        console.error('Error loading supplier:', err);
        this.toastService.error('Failed to load supplier details');
      }
    });
  }

  policyPreview = computed(() => {
    const cancel = this.supplierForm.get('cancellationDays')?.value as number;
    const payment = this.supplierForm.get('paymentDays')?.value as number;
    
    let cancelText = '';
    if (cancel === -1) {
      cancelText = 'No cancellation allowed.';
    } else {
      cancelText = `Cancellation allowed until ${cancel} days before travel.`;
    }
    
    let paymentText = '';
    if (payment === 0) {
      paymentText = 'Payment due on travel date.';
    } else {
      paymentText = `Payment due ${payment} day${payment > 1 ? 's' : ''} before travel.`;
    }
    
    return `Cancellation: ${cancelText} | Payment: ${paymentText}`;
  });

  goBack() {
    this.location.back();
  }

  saveSupplier() {
    if (this.supplierForm.valid) {
      const fv = this.supplierForm.getRawValue();
      const supplierData = {
        name: fv.name,
        email: fv.email,
        phone: fv.phone,
        telephone: fv.phone,
        country: fv.country,
        location: fv.location,
        description: fv.description,
        offers_transfers: fv.serviceTransfers,
        offers_excursions: fv.serviceExcursions,
        offers_tours: fv.serviceTours,
        services: [
          ...(fv.serviceTransfers ? ['Transfers'] : []),
          ...(fv.serviceExcursions ? ['Excursions'] : []),
          ...(fv.serviceTours ? ['Tours'] : [])
        ],
        cancellation_days: fv.cancellationDays,
        payment_days: fv.paymentDays
      };

      const id = this.editId();
      const request$ = id 
        ? this.supplierApiService.updateSupplier(id, supplierData)
        : this.supplierApiService.createSupplier(supplierData);

      request$.subscribe({
        next: () => {
          this.toastService.success(id ? 'Supplier updated successfully' : 'Supplier created successfully');
          this.goBack();
        },
        error: (err: any) => {
          console.error('Error saving supplier:', err);
          alert('Failed to save supplier');
        }
      });
    } else {
      this.supplierForm.markAllAsTouched();
    }
  }
}
