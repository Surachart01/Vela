import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { MasterDataService } from '../services/master-data.service';
import { TripApiService } from '../services/api/trip-api.service';
import { of } from 'rxjs';

export const masterDataResolver: ResolveFn<any> = () => {
  return inject(MasterDataService).refresh();
};

export const tripResolver: ResolveFn<any> = (route) => {
  const id = route.paramMap.get('id');
  if (!id) return of(null);
  return inject(TripApiService).getTrip(id);
};
