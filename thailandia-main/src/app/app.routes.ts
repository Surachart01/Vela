import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { masterDataResolver, tripResolver } from './core/resolvers/data.resolvers';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'home',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'home' },
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent)
  },
  // View-only routes accessible from Home page (no Control Panel permission needed)
  {
    path: 'home/view/hotel/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'home' },
    loadComponent: () => import('./pages/control-panel/add-hotel/add-hotel').then(m => m.AddHotelComponent)
  },
  {
    path: 'home/view/tour/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'home' },
    loadComponent: () => import('./pages/control-panel/add-tour/add-tour').then(m => m.AddTourComponent)
  },
  {
    path: 'home/view/excursion/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'home' },
    loadComponent: () => import('./pages/control-panel/add-excursion/add-excursion').then(m => m.AddExcursionComponent)
  },
  {
    path: 'home/view/transfer/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'home' },
    loadComponent: () => import('./pages/control-panel/add-transfer/add-transfer').then(m => m.AddTransferComponent)
  },
  {
    path: 'quotation',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'quotation' },
    loadComponent: () => import('./pages/quotation/quotation').then(m => m.QuotationComponent)
  },
  {
    path: 'add-quotation',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'quotation' },
    loadComponent: () => import('./pages/add-quotation/add-quotation').then(m => m.AddQuotationComponent),
    resolve: { masterData: masterDataResolver }
  },
  {
    path: 'add-quotation/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'quotation' },
    loadComponent: () => import('./pages/add-quotation/add-quotation').then(m => m.AddQuotationComponent),
    resolve: { trip: tripResolver, masterData: masterDataResolver }
  },
  {
    path: 'control-panel/bookings',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_bookings' },
    loadComponent: () => import('./pages/control-panel/bookings/bookings').then(m => m.BookingsComponent)
  },
  {
    path: 'control-panel/add-booking',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_bookings' }, // Part of bookings access
    loadComponent: () => import('./pages/add-quotation/add-quotation').then(m => m.AddQuotationComponent),
    resolve: { masterData: masterDataResolver }
  },
  {
    path: 'control-panel/add-booking/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_bookings' },
    loadComponent: () => import('./pages/add-quotation/add-quotation').then(m => m.AddQuotationComponent),
    resolve: { trip: tripResolver, masterData: masterDataResolver }
  },
  {
    path: 'control-panel/activities',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_activities' },
    loadComponent: () => import('./pages/control-panel/activities/activities').then(m => m.ActivitiesComponent)
  },
  {
    path: 'control-panel/agents',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_agents' },
    loadComponent: () => import('./pages/control-panel/agents/agents').then(m => m.AgentsComponent)
  },
  {
    path: 'control-panel/hotels',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_hotels' },
    loadComponent: () => import('./pages/control-panel/hotels/hotels').then(m => m.HotelsComponent)
  },
  {
    path: 'control-panel/add-hotel',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_hotels' },
    loadComponent: () => import('./pages/control-panel/add-hotel/add-hotel').then(m => m.AddHotelComponent)
  },
  {
    path: 'control-panel/add-hotel/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_hotels' },
    loadComponent: () => import('./pages/control-panel/add-hotel/add-hotel').then(m => m.AddHotelComponent)
  },
  {
    path: 'control-panel/excursions',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_excursions' },
    loadComponent: () => import('./pages/control-panel/excursions/excursions').then(m => m.ExcursionsComponent)
  },
  {
    path: 'control-panel/add-excursion',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_excursions' },
    loadComponent: () => import('./pages/control-panel/add-excursion/add-excursion').then(m => m.AddExcursionComponent)
  },
  {
    path: 'control-panel/add-excursion/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_excursions' },
    loadComponent: () => import('./pages/control-panel/add-excursion/add-excursion').then(m => m.AddExcursionComponent)
  },
  {
    path: 'control-panel/markups',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'superadmin'], pageId: 'cp_markups' },
    loadComponent: () => import('./pages/control-panel/markups/markups').then(m => m.MarkupsComponent)
  },
  {
    path: 'control-panel/add-markup',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'superadmin'], pageId: 'cp_markups' },
    loadComponent: () => import('./pages/control-panel/add-markup/add-markup').then(m => m.AddMarkupComponent)
  },
  {
    path: 'control-panel/add-markup/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'superadmin'], pageId: 'cp_markups' },
    loadComponent: () => import('./pages/control-panel/add-markup/add-markup').then(m => m.AddMarkupComponent)
  },
  {
    path: 'control-panel/users',
    redirectTo: 'settings',
    pathMatch: 'full'
  },
  {
    path: 'control-panel/add-user',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['superadmin'], pageId: 'cp_users' },
    loadComponent: () => import('./pages/control-panel/add-user/add-user').then(m => m.AddUserComponent)
  },
  {
    path: 'control-panel/add-user/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['superadmin'], pageId: 'cp_users' },
    loadComponent: () => import('./pages/control-panel/add-user/add-user').then(m => m.AddUserComponent)
  },
  {
    path: 'control-panel/suppliers',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_suppliers' },
    loadComponent: () => import('./pages/control-panel/suppliers/suppliers').then(m => m.SuppliersComponent)
  },
  {
    path: 'control-panel/add-supplier',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_suppliers' },
    loadComponent: () => import('./pages/control-panel/add-supplier/add-supplier').then(m => m.AddSupplierComponent)
  },
  {
    path: 'control-panel/add-supplier/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_suppliers' },
    loadComponent: () => import('./pages/control-panel/add-supplier/add-supplier').then(m => m.AddSupplierComponent)
  },
  {
    path: 'control-panel/other-charges',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_other_charges' },
    loadComponent: () => import('./pages/control-panel/other-charges/other-charges').then(m => m.OtherChargesComponent)
  },
  {
    path: 'control-panel/add-other-charge',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_other_charges' },
    loadComponent: () => import('./pages/control-panel/add-other-charge/add-other-charge').then(m => m.AddOtherChargeComponent)
  },
  {
    path: 'control-panel/add-other-charge/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_other_charges' },
    loadComponent: () => import('./pages/control-panel/add-other-charge/add-other-charge').then(m => m.AddOtherChargeComponent)
  },
  {
    path: 'control-panel/add-agent',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'superadmin'], pageId: 'cp_agents' },
    loadComponent: () => import('./pages/control-panel/add-agent/add-agent').then(m => m.AddAgentComponent)
  },
  {
    path: 'control-panel/add-agent/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'superadmin'], pageId: 'cp_agents' },
    loadComponent: () => import('./pages/control-panel/add-agent/add-agent').then(m => m.AddAgentComponent)
  },
  {
    path: 'payment',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'payment' },
    loadComponent: () => import('./pages/payment/payment').then(m => m.PaymentComponent)
  },
  {
    path: 'itinerary',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'itinerary' },
    loadComponent: () => import('./pages/itinerary/itinerary').then(m => m.ItineraryComponent)
  },
  {
    path: 'control-panel/transfers',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_transfers' },
    loadComponent: () => import('./pages/control-panel/transfers/transfers').then(m => m.TransfersComponent)
  },
  {
    path: 'control-panel/add-transfer',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_transfers' },
    loadComponent: () => import('./pages/control-panel/add-transfer/add-transfer').then(m => m.AddTransferComponent)
  },
  {
    path: 'control-panel/add-transfer/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_transfers' },
    loadComponent: () => import('./pages/control-panel/add-transfer/add-transfer').then(m => m.AddTransferComponent)
  },
  {
    path: 'control-panel/tools',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_tools' },
    loadComponent: () => import('./pages/control-panel/tools/tools').then(m => m.ToolsComponent)
  },
  {
    path: 'control-panel/tours',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_tours' },
    loadComponent: () => import('./pages/control-panel/tours/tours').then(m => m.ToursComponent)
  },
  {
    path: 'control-panel/add-tour',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_tours' },
    loadComponent: () => import('./pages/control-panel/add-tour/add-tour').then(m => m.AddTourComponent)
  },
  {
    path: 'control-panel/add-tour/:id',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_tours' },
    loadComponent: () => import('./pages/control-panel/add-tour/add-tour').then(m => m.AddTourComponent)
  },
  {
    path: 'control-panel/countries',
    canActivate: [authGuard, roleGuard],
    data: { pageId: 'cp_countries' },
    loadComponent: () => import('./pages/control-panel/countries/countries').then(m => m.CountriesComponent)
  },
  {
    path: 'analytics',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'superadmin'], pageId: 'analytics' },
    loadComponent: () => import('./pages/analytics/analytics').then(m => m.AnalyticsComponent)
  },
  {
    path: 'settings',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['superadmin'], pageId: 'settings' },
    loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/notifications/notifications').then(m => m.NotificationsComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
