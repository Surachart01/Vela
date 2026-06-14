import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DateInputComponent } from '../../../core/components/date-input/date-input';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-activities',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DateInputComponent],
  templateUrl: './activities.html',
  styleUrl: './activities.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivitiesComponent {
  private translationService = inject(TranslationService);
  public t = this.translationService.translations;

  activeTab = signal<'overview' | 'log' | 'users' | 'popular'>('overview');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');

  setTab(tab: 'overview' | 'log' | 'users' | 'popular') {
    this.activeTab.set(tab);
  }

  // ── Data ──
  entityData = [
    { label:'QUOTATION', count:11, badgeClass:'badge-quotation', fillClass:'fill-or',  pct:100 },
    { label:'EXCURSION',  count:4,  badgeClass:'badge-excursion', fillClass:'fill-teal', pct:36  },
    { label:'TRANSFER',   count:4,  badgeClass:'badge-transfer',  fillClass:'fill-purple',pct:36 },
    { label:'HOTEL',      count:3,  badgeClass:'badge-hotel',     fillClass:'fill-blue', pct:27  },
    { label:'BOOKING',     count:1,  badgeClass:'badge-booking',    fillClass:'fill-amber',pct:9   },
    { label:'TOUR',       count:1,  badgeClass:'badge-tour',      fillClass:'fill-pink', pct:9   },
    { label:'AGENT',      count:1,  badgeClass:'badge-agent',     fillClass:'fill-emerald',pct:9 },
    { label:'USER',       count:1,  badgeClass:'badge-user',      fillClass:'fill-red',  pct:9   },
  ];

  actionData = [
    { label:'view',      count:17, badgeClass:'badge-view',      fillClass:'fill-blue',   pct:100 },
    { label:'search',    count:7,  badgeClass:'badge-search',    fillClass:'fill-cyan',   pct:41  },
    { label:'create',    count:5,  badgeClass:'badge-create',    fillClass:'fill-emerald',pct:29  },
    { label:'update',    count:3,  badgeClass:'badge-update',    fillClass:'fill-amber',  pct:18  },
    { label:'calculate', count:3,  badgeClass:'badge-calculate', fillClass:'fill-purple', pct:18  },
    { label:'generate_pdf',count:2,badgeClass:'badge-generate',  fillClass:'fill-or',     pct:12  },
    { label:'delete',    count:1,  badgeClass:'badge-delete',    fillClass:'fill-red',    pct:6   },
  ];

  tableData = [
    { entity:'QUOTATION', eBadge:'badge-quotation', action:'view',   aBadge:'badge-view',   count:10, users:3, time:'21m ago' },
    { entity:'EXCURSION', eBadge:'badge-excursion', action:'view',   aBadge:'badge-view',   count:3,  users:1, time:'42m ago' },
    { entity:'HOTEL',     eBadge:'badge-hotel',     action:'search', aBadge:'badge-search', count:2,  users:2, time:'0m ago'  },
    { entity:'BOOKING',   eBadge:'badge-booking',   action:'view',   aBadge:'badge-view',   count:1,  users:1, time:'40m ago' },
    { entity:'QUOTATION', eBadge:'badge-quotation', action:'create', aBadge:'badge-create', count:1,  users:1, time:'1h ago'  },
    { entity:'TOUR',      eBadge:'badge-tour',      action:'search', aBadge:'badge-search', count:1,  users:1, time:'55m ago' },
    { entity:'TRANSFER',  eBadge:'badge-transfer',  action:'create', aBadge:'badge-create', count:1,  users:1, time:'4h ago'  },
    { entity:'TRANSFER',  eBadge:'badge-transfer',  action:'search', aBadge:'badge-search', count:1,  users:1, time:'47m ago' },
    { entity:'TRANSFER',  eBadge:'badge-transfer',  action:'update', aBadge:'badge-update', count:1,  users:1, time:'4h ago'  },
    { entity:'TRANSFER',  eBadge:'badge-transfer',  action:'view',   aBadge:'badge-view',   count:1,  users:1, time:'48m ago' },
    { entity:'AGENT',     eBadge:'badge-agent',     action:'view',   aBadge:'badge-view',   count:1,  users:1, time:'38m ago' },
    { entity:'USER',      eBadge:'badge-user',      action:'update', aBadge:'badge-update', count:1,  users:1, time:'5m ago'  },
    { entity:'EXCURSION', eBadge:'badge-excursion', action:'search', aBadge:'badge-search', count:1,  users:1, time:'1h ago'  },
  ];

  logData = [
    { id:1, user:'vtadmin',      agent:'Vera Thailandia Online',           entity:'QUOTATION', eBadge:'badge-quotation', entityName:'Quotation List',                        action:'view',   aBadge:'badge-view',   ts:'2026-03-21 13:01' },
    { id:2, user:'vtadmin',      agent:'Vera Thailandia Online',           entity:'HOTEL',     eBadge:'badge-hotel',     entityName:'Hotel List',                             action:'search', aBadge:'badge-search', ts:'2026-03-21 13:00' },
    { id:3, user:'Bangkok Agent',agent:'VeraThailandia Test',              entity:'QUOTATION', eBadge:'badge-quotation', entityName:'Q2025JUL174E5B(Mr. LIGORIO ANG...)',     action:'view',   aBadge:'badge-view',   ts:'2026-03-21 12:57' },
    { id:4, user:'vtadmin',      agent:'Vera Thailandia Online',           entity:'EXCURSION', eBadge:'badge-excursion', entityName:'Bang Nam Phueng Market + Chatuchak…',   action:'search', aBadge:'badge-search', ts:'2026-03-21 12:53' },
    { id:5, user:'Oltremare',    agent:'Oltremare/Caleidoscopio Tour Op.', entity:'TRANSFER',  eBadge:'badge-transfer',  entityName:'Transfer List',                          action:'view',   aBadge:'badge-view',   ts:'2026-03-21 12:07' },
    { id:6, user:'Bangkok Agent',agent:'VeraThailandia Test',              entity:'HOTEL',     eBadge:'badge-hotel',     entityName:'Akara Hotel Bangkok',                   action:'view',   aBadge:'badge-view',   ts:'2026-03-21 12:03' },
    { id:7, user:'vtadmin',      agent:'Vera Thailandia Online',           entity:'BOOKING',    eBadge:'badge-booking',    entityName:'BOOKING #5',                              action:'view',   aBadge:'badge-view',   ts:'2026-03-21 11:22' },
    { id:8, user:'Oltremare',    agent:'Oltremare/Caleidoscopio Tour Op.', entity:'QUOTATION', eBadge:'badge-quotation', entityName:'Q2025MAR22OKLX(Ms. VINCI FEDER...)',     action:'view',   aBadge:'badge-view',   ts:'2026-03-21 11:33' },
    { id:9, user:'vtadmin',      agent:'Vera Thailandia Online',           entity:'QUOTATION', eBadge:'badge-quotation', entityName:'Q2025JUL174E5B(Mr. LIGORIO ANG...)',     action:'create', aBadge:'badge-create', ts:'2026-03-21 12:01' },
    { id:10,user:'Bangkok Agent',agent:'VeraThailandia Test',              entity:'TOUR',      eBadge:'badge-tour',      entityName:'Tour List',                              action:'search', aBadge:'badge-search', ts:'2026-03-21 12:07' },
  ];

  usersData = [
    { user:'vtadmin',       agent:'Vera Thailandia Online',           total:14, unique:14, topEntity:'QUOTATION', topEntityBadge:'badge-quotation', topAction:'view', topActionBadge:'badge-view', last:'5m ago' },
    { user:'Bangkok Agent', agent:'VeraThailandia Test',              total:10, unique:10, topEntity:'QUOTATION', topEntityBadge:'badge-quotation', topAction:'view', topActionBadge:'badge-view', last:'5m ago' },
    { user:'Oltremare',     agent:'Oltremare/Caleidoscopio Tour Op.', total:4,  unique:4,  topEntity:'QUOTATION', topEntityBadge:'badge-quotation', topAction:'view', topActionBadge:'badge-view', last:'55m ago'},
  ];

  popularData = [
    { type:'TRANSFER',  tBadge:'badge-transfer',  name:'Transfer List',                               count:2, users:2, last:'55m ago' },
    { type:'QUOTATION', tBadge:'badge-quotation', name:'Q2025MAR22OKLX(Ms. VINCI FEDER...)',           count:2, users:2, last:'29m ago' },
    { type:'HOTEL',     tBadge:'badge-hotel',     name:'Hotel List',                                   count:2, users:2, last:'8m ago'  },
    { type:'QUOTATION', tBadge:'badge-quotation', name:'Q2025JUL174E5B(Mr. LIGORIO ANG...)',           count:2, users:2, last:'5m ago'  },
    { type:'EXCURSION', tBadge:'badge-excursion', name:'Bang Nam Phueng Market + Chatuchak Market SIC With ISG', count:1, users:1, last:'49m ago'},
    { type:'HOTEL',     tBadge:'badge-hotel',     name:'Akara Hotel Bangkok',                          count:1, users:1, last:'1h ago'  },
    { type:'BOOKING',    tBadge:'badge-booking',    name:'Booking #5',                                    count:1, users:1, last:'48m ago' },
    { type:'QUOTATION', tBadge:'badge-quotation', name:'Quotation List',                               count:1, users:1, last:'1h ago'  },
  ];

}
