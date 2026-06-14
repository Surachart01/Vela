import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../core/services/translation.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tools.html',
  styleUrl: './tools.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolsComponent {
  private translationService = inject(TranslationService);
  public t = this.translationService.translations;

  selectedCurrency = signal('THB - Thai Baht');

  toolCategories = [
    { key: 'hotels', icon: 'fa-hotel', color: '#ff7f50' },
    { key: 'transfers', icon: 'fa-van-shuttle', color: '#3498db' },
    { key: 'excursions', icon: 'fa-bag-shopping', color: '#e74c3c' },
    { key: 'tours', icon: 'fa-compass', color: '#f1c40f' }
  ];

  onDownloadTemplate(cat: string) {
    console.log('Downloading template for:', cat);
  }

  onExportData(cat: string) {
    console.log('Exporting data for:', cat);
  }

  onImportData(cat: string) {
    console.log('Importing data for:', cat);
  }
}
