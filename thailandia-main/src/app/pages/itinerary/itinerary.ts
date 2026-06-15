import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateInputComponent } from '../../core/components/date-input/date-input';
import { TranslationService } from '../../core/services/translation.service';
import { ItineraryService } from '../../core/services/itinerary.service';

@Component({
  selector: 'app-itinerary',
  imports: [CommonModule, FormsModule, DateInputComponent],
  templateUrl: './itinerary.html',
  styleUrl: './itinerary.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItineraryComponent implements OnInit {
  public translationService = inject(TranslationService);
  public t = this.translationService.translations;
  public itineraryService = inject(ItineraryService);

  // Helpers for filter persistence
  private getSavedFilter(key: string, defaultValue: string): string {
    const saved = sessionStorage.getItem(`itinerary_${key}`);
    return saved !== null ? saved : defaultValue;
  }

  searchQuery = signal('');
  dateFrom = signal('');
  dateTo = signal('');

  hasActiveFilters = signal(false);

  constructor() {
    effect(() => {
      sessionStorage.setItem('itinerary_search', this.searchQuery());
    });
    effect(() => {
      sessionStorage.setItem('itinerary_dateFrom', this.dateFrom());
    });
    effect(() => {
      sessionStorage.setItem('itinerary_dateTo', this.dateTo());
    });
  }

  ngOnInit() {
    this.searchQuery.set(this.getSavedFilter('search', ''));
    this.dateFrom.set(this.getSavedFilter('dateFrom', ''));
    this.dateTo.set(this.getSavedFilter('dateTo', ''));
    this.checkFilters();
  }

  checkFilters() {
    this.hasActiveFilters.set(
      this.searchQuery().trim() !== '' ||
      this.dateFrom() !== '' ||
      this.dateTo() !== ''
    );
  }

  resetFilters() {
    this.searchQuery.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.hasActiveFilters.set(false);
    sessionStorage.removeItem('itinerary_search');
    sessionStorage.removeItem('itinerary_dateFrom');
    sessionStorage.removeItem('itinerary_dateTo');
  }
  
  onSearch() {
    this.checkFilters();
  }
}
