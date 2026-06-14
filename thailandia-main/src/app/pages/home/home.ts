import { Component, inject, signal, effect, computed, viewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateInputComponent } from '../../core/components/date-input/date-input';
import { TranslationService } from '../../core/services/translation.service';
import { HotelApiService } from '../../core/services/api/hotel-api.service';
import { TourApiService } from '../../core/services/api/tour-api.service';
import { ExcursionApiService } from '../../core/services/api/excursion-api.service';
import { TransferApiService } from '../../core/services/api/transfer-api.service';
import { Observable, forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import * as echarts from 'echarts';
import { getUnseenForProvince } from '../../core/data/unseen-thailand';
import { PdfService } from '../../core/services/pdf.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, DateInputComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  private translationService = inject(TranslationService);
  private hotelApi = inject(HotelApiService);
  private tourApi = inject(TourApiService);
  private excursionApi = inject(ExcursionApiService);
  private transferApi = inject(TransferApiService);
  private router = inject(Router);
  private pdfService = inject(PdfService);
  
  public t = this.translationService.translations;

  printItemPdf(item: any) {
    const cat = this.activeCategory();
    const id = item.id;

    if (cat === 'excursions') {
      this.excursionApi.getExcursion(id).subscribe(full => {
        const pdfItem = {
          id: full.id,
          name: full.name,
          city: full.city,
          code: full.code,
          supplier_name: full.supplier_name,
          description: full.description,
          sic_price_adult: full.sic_price_adult,
          sic_price_child: full.sic_price_child,
          valid_days: full.valid_days,
          prices: (full.prices || []).map((p: any) => ({
            dateFrom: p.start_date,
            dateTo: p.end_date,
            pax: p.pax,
            price: p.price
          }))
        };
        this.pdfService.generateItemPdf(pdfItem, 'excursions');
      });

    } else if (cat === 'tours') {
      forkJoin({
        tour: this.tourApi.getTour(id),
        hotels: this.hotelApi.listHotels({ limit: 1000 }),
        excursions: this.excursionApi.listExcursions({ limit: 1000 }),
        transfers: this.transferApi.listTransfers({ limit: 1000 })
      }).subscribe(({ tour, hotels, excursions, transfers }) => {
        let validDays: any = {};
        if (tour.valid_days) {
          try { validDays = typeof tour.valid_days === 'string' ? JSON.parse(tour.valid_days) : tour.valid_days; } catch {}
        }
        const itinerary = (tour.itinerary || []).map((day: any) => ({
          dayNumber: day.dayNumber || day.day || 1,
          description: day.description || day.itinerary || '',
          hotels: (day.hotels || []).map((s: any) => ({
            id: s.id, city: s.city || '',
            from_time: s.from_time || '', to_time: s.to_time || '',
            item_id: String(s.item_id || s.service_id || ''),
            room_type: s.room_type || ''
          })),
          excursions: (day.excursions || []).map((s: any) => ({
            id: s.id, city: s.city || '',
            from_time: s.from_time || '', to_time: s.to_time || '',
            item_id: String(s.item_id || s.service_id || '')
          })),
          transfers: (day.transfers || []).map((s: any) => ({
            id: s.id, city: s.city || '',
            from_time: s.from_time || '', to_time: s.to_time || '',
            item_id: String(s.item_id || s.service_id || '')
          }))
        }));
        const pdfItem = {
          id: tour.id,
          name: tour.name,
          city: tour.city,
          category: tour.category,
          description: tour.description,
          route: tour.route,
          departures: tour.departures,
          validDays,
          itinerary,
          prices: (tour.pricing || []).map((p: any) => ({
            startDate: p.start_date, endDate: p.end_date,
            pax: p.pax,
            singlePrice: p.single_room_price,
            doublePrice: p.double_room_price,
            triplePrice: p.triple_room_price
          })),
          hotelsList: hotels.data,
          excursionsList: excursions.data,
          transfersList: transfers.data
        };
        this.pdfService.generateItemPdf(pdfItem, 'tours');
      });

    } else if (cat === 'transfers') {
      this.transferApi.getTransfer(id).subscribe(full => {
        const pdfItem = {
          id: full.id,
          name: full.name,
          city: full.city,
          transfer_type: full.transfer_type,
          departure: full.departure,
          arrival: full.arrival,
          description: full.description,
          sic_price_adult: full.sic_price_adult,
          sic_price_child: full.sic_price_child,
          prices: (full.pricing || []).map((p: any) => ({
            dateFrom: p.start_date,
            dateTo: p.end_date,
            pax: p.pax,
            price: p.price,
            cost: p.cost
          }))
        };
        this.pdfService.generateItemPdf(pdfItem, 'transfers');
      });
    }
  }

  // Search State
  public activeCategory = signal<'hotels' | 'tours' | 'excursions' | 'transfers'>('hotels');
  public isLoading = signal<boolean>(false);
  public results = signal<any[]>([]);
  
  // Pagination State
  public currentPage = signal<number>(1);
  public totalItems = signal<number>(0);
  public limit = signal<number>(25);

  public totalPages = computed(() => Math.ceil(this.totalItems() / this.limit()));
  
  // Zero-safe startIndex and endIndex
  public startIndex = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.limit() + 1);
  public endIndex = computed(() => Math.min(this.currentPage() * this.limit(), this.totalItems()));

  // Filter State
  public filters = {
    country: signal<string>(''),
    city: signal<string>(''),
    checkIn: signal<string>(''),
    checkOut: signal<string>(''),
    keyword: signal<string>(''),
    transferType: signal<string>('')
  };

  // Dropdown Data
  public countries = signal<string[]>(['Thailand']);
  public cities = signal<string[]>([]);

  // View Mode State
  public viewMode = signal<'map' | 'search'>('map');
  public mapContainer = viewChild<ElementRef>('mapContainer');
  private mapInstance: echarts.ECharts | null = null;
  private geoJsonLoaded = false;

  constructor() {
    // Initial fetch
    this.refreshCities();
    this.onSearch();

    // Re-fetch when page or limit changes
    effect(() => {
      this.limit();
      this.currentPage();
      this.onSearch();
    });

    // Refresh cities and reset page when category changes
    effect(() => {
      this.activeCategory();
      this.currentPage.set(1);
      this.refreshCities();
    });

    // Render ECharts Map when viewMode switches back to map or on init
    effect(() => {
      const mode = this.viewMode();
      const container = this.mapContainer();
      if (mode === 'map' && container) {
        setTimeout(() => this.initEchartsMap(), 100);
      } else if (mode === 'search') {
        if (this.mapInstance) {
          this.mapInstance.dispose();
          this.mapInstance = null;
        }
      }
    });
  }

  async initEchartsMap() {
    const el = this.mapContainer()?.nativeElement;
    if (!el) return;

    if (!this.geoJsonLoaded) {
      try {
        const response = await fetch('assets/thailand.json');
        if (!response.ok) throw new Error('Failed to load GeoJSON');
        const geoJson = await response.json();
        echarts.registerMap('thailand', geoJson);
        this.geoJsonLoaded = true;
      } catch (e) {
        console.error('Map loading error:', e);
        return;
      }
    }

    if (this.mapInstance) {
      this.mapInstance.dispose();
    }

    this.mapInstance = echarts.init(el);
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        triggerOn: 'click', /* Only show tooltip when clicked */
        enterable: true,
        formatter: (params: any) => {
          const provinceName = params.name || 'Thailand';
          const unseenData = getUnseenForProvince(provinceName);
          
          return `
            <div style="width: 240px; border-radius: 12px; overflow: hidden; background: white; color: #2c3e50; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #eee;">
              <img src="${unseenData.image}" style="width: 100%; height: 120px; object-fit: cover; display: block;" />
              <div style="padding: 12px;">
                <strong style="color: var(--primary-orange); letter-spacing: 1px; font-size: 11px; text-transform: uppercase;">Discover</strong>
                <div style="font-size: 16px; font-weight: bold; margin: 4px 0;">${unseenData.title} <span style="font-size: 12px; font-weight: normal; color: #7f8c8d;">(${provinceName})</span></div>
                <div style="font-size: 11px; color: #7f8c8d; white-space: normal; line-height: 1.4;">${unseenData.description}</div>
              </div>
            </div>
          `;
        },
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        padding: 0,
      },
      series: [
        {
          type: 'map',
          map: 'thailand',
          roam: true,
          zoom: 2.2, /* Increased default zoom to make it look larger on start */
          center: [100.5, 13.5], /* Center slightly to focus on Thailand better when zoomed in */
          label: {
            show: true,
            color: '#555',
            fontSize: 9,
          },
          itemStyle: {
            areaColor: '#f3f4f6', 
            borderColor: 'rgba(242, 100, 25, 0.3)', 
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              areaColor: 'rgba(242, 100, 25, 0.1)',
              borderColor: '#f26419',
              borderWidth: 2
            },
            label: {
              show: true,
              color: '#f26419',
              fontWeight: 'bold',
              fontSize: 10
            }
          }
        }
      ]
    };
    
    this.mapInstance.setOption(option);

    // Click handler disabled as per user request to solely rely on click-based popups.
    this.mapInstance.on('click', (params: any) => {
      // The ECharts tooltip handle the popup card on click. We don't jump to Search.
    });
  }

  setCategory(cat: 'hotels' | 'tours' | 'excursions' | 'transfers') {
    this.activeCategory.set(cat);
    this.viewMode.set('search');
  }

  goToMap() {
    this.viewMode.set('map');
  }

  onFilterSearch() {
    this.currentPage.set(1);
    this.onSearch();
  }

  onSearch() {
    this.isLoading.set(true);
    const cat = this.activeCategory();
    const filterObj = {
      country: this.filters.country(),
      city: this.filters.city(),
      search: this.filters.keyword(),
      limit: this.limit(),
      page: this.currentPage(),
      ...(cat === 'transfers' && this.filters.transferType() ? { type: this.filters.transferType() } : {})
    };

    let obs: Observable<{ data: any[]; total: number }> | undefined;
    switch(cat) {
      case 'hotels': obs = this.hotelApi.listHotels(filterObj); break;
      case 'tours': obs = this.tourApi.listTours(filterObj); break;
      case 'excursions': obs = this.excursionApi.listExcursions(filterObj); break;
      case 'transfers': obs = this.transferApi.listTransfers(filterObj); break;
    }

    if (obs) {
      obs.subscribe({
        next: (res) => {
          this.results.set(res.data);
          this.totalItems.set(res.total);
          this.isLoading.set(false);
        },
        error: (err: any) => {
          console.error('Search error:', err);
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }

  refreshCities() {
    this.hotelApi.getCities().subscribe(cities => {
      this.cities.set(cities);
    });
  }

  // Pagination Helpers
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1); // Ellipsis
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (current < total - 2) pages.push(-1); // Ellipsis
      pages.push(total);
    }
    return pages;
  }

  viewItem(item: any) {
    const cat = this.activeCategory();
    let route = '';
    
    switch(cat) {
      case 'hotels':     route = '/home/view/hotel'; break;
      case 'tours':      route = '/home/view/tour'; break;
      case 'excursions': route = '/home/view/excursion'; break;
      case 'transfers':  route = '/home/view/transfer'; break;
    }

    if (route) {
      this.router.navigate([route, item.id], { queryParams: { mode: 'view' } });
    }
  }
}
