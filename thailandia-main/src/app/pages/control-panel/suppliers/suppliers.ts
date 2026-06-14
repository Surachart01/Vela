import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { SupplierApiService } from '../../../core/services/api/supplier-api.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersComponent implements OnInit {
  private translationService = inject(TranslationService);
  private supplierApiService = inject(SupplierApiService);
  public authService = inject(AuthService);
  public t = this.translationService.translations;

  searchQuery = signal('');
  itemsPerPage = signal(25);

  suppliersList = signal<any[]>([]);

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.supplierApiService.listSuppliers().subscribe(suppliers => {
      this.suppliersList.set(suppliers);
    });
  }

  filteredSuppliers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.suppliersList().filter((s: any) => 
      s.name.toLowerCase().includes(query) || 
      (s.email && s.email.toLowerCase().includes(query))
    );
  });

  totalItems = computed(() => this.filteredSuppliers().length);

  deleteSupplier(id: number) {
    if (confirm('Are you sure you want to delete this supplier?')) {
      this.supplierApiService.deleteSupplier(id).subscribe(() => {
        this.loadSuppliers();
      });
    }
  }
}
