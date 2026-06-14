import { Injectable, signal } from '@angular/core';

export interface Itinerary {
  id: string;
  agent: string;
  agent_name?: string;
  user_name?: string;
  staffName?: string;
  quotationRef: string;
  clientName: string;
  tripStartDate: string;
  pax: number;
  telephone: string;
  bookingRef: string;
  status: string;
  finalCost: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItineraryService {
  public itineraries = signal<Itinerary[]>([]); // Start empty to match "0 approved itineraries"

  saveItinerary(itinerary: Itinerary) {
    this.itineraries.update(items => [itinerary, ...items]);
  }
}
