import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { OtherChargeApiService } from '../../../core/services/api/other-charge-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-other-charges',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './other-charges.html',
  styleUrl: './other-charges.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtherChargesComponent implements OnInit {
  private translationService = inject(TranslationService);
  private otherChargeApiService = inject(OtherChargeApiService);
  private cd = inject(ChangeDetectorRef);
  public authService = inject(AuthService);
  public t = this.translationService.translations;

  searchQuery = signal('');
  itemsPerPage = signal(25);

  chargesList = signal<any[]>([]);

  ngOnInit() {
    this.loadOtherCharges();
  }

  loadOtherCharges() {
    this.otherChargeApiService.listOtherCharges().subscribe(data => {
      this.chargesList.set(data);
      this.cd.markForCheck();
    });
  }

  filteredCharges = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.chargesList().filter((c: any) => 
      (c.description || '').toLowerCase().includes(query)
    ).map((c: any) => ({
      ...c,
      displayType: c.chargetype || c.type || 'N/A'
    }));
  });

  totalItems = computed(() => this.filteredCharges().length);

  deleteCharge(id: number | string) {
    if (confirm('Are you sure you want to delete this charge?')) {
      this.otherChargeApiService.deleteOtherCharge(id).subscribe(() => {
        this.loadOtherCharges();
        this.cd.markForCheck();
      });
    }
  }
}
