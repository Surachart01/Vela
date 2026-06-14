import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
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
export class ItineraryComponent {
  public translationService = inject(TranslationService);
  public t = this.translationService.translations;
  public itineraryService = inject(ItineraryService);

  searchQuery = signal('');
  dateFrom = signal('');
  dateTo = signal('');

  hasActiveFilters = signal(false);

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
  }
  
  onSearch() {
    this.checkFilters();
  }
}
