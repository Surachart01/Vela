import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { MarkupApiService } from '../../../core/services/api/markup-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-markups',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './markups.html',
  styleUrl: './markups.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarkupsComponent implements OnInit {
  private translationService = inject(TranslationService);
  private markupApiService = inject(MarkupApiService);
  private cd = inject(ChangeDetectorRef);
  public authService = inject(AuthService);
  public t = this.translationService.translations;

  searchQuery = signal('');
  itemsPerPage = signal(25);

  markupsList = signal<any[]>([]);

  ngOnInit() {
    this.loadMarkups();
  }

  loadMarkups() {
    this.markupApiService.listMarkups().subscribe(markups => {
      this.markupsList.set(markups);
      this.cd.markForCheck();
    });
  }

  // Map DB unit value to display label
  private displayUnit(unit: string | null | undefined): string {
    if (unit === 'flat rate') return 'THB';
    return unit || '%';
  }

  filteredMarkups = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.markupsList().filter((m: any) => 
      (m.markup_group || m.groupName || '').toLowerCase().includes(query)
    ).map((m: any) => ({
      ...m,
      displayGroup: m.markup_group || m.groupName || m.name,
      displayHotel: 'Range-based',
      displayExcursion: `${m.excursion_markup || m.excursionMarkupValue || 0} ${this.displayUnit(m.excursion_markup_unit || m.excursionMarkupUnit)}`,
      displayTour: `${m.tour_markup || m.tourMarkupValue || 0} ${this.displayUnit(m.tour_markup_unit || m.tourMarkupUnit)}`,
      displayTransfer: `${m.transfer_markup || m.transferMarkupValue || 0} ${this.displayUnit(m.transfer_markup_unit || m.transferMarkupUnit)}`
    }));
  });

  totalItems = computed(() => this.filteredMarkups().length);

  deleteMarkup(id: number) {
    if (confirm('Are you sure you want to delete this markup group?')) {
      this.markupApiService.deleteMarkup(id).subscribe(() => {
        this.loadMarkups();
      });
    }
  }
}
