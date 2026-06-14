import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CountryApiService } from '../../../core/services/api/country-api.service';
import { CityApiService } from '../../../core/services/api/city-api.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-countries',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './countries.html',
  styleUrl: './countries.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CountriesComponent implements OnInit {
  private countryApi = inject(CountryApiService);
  private cityApi = inject(CityApiService);
  public masterData = inject(MasterDataService);
  private translationService = inject(TranslationService);
  private fb = inject(FormBuilder);

  public t = this.translationService.translations;
  countries = this.masterData.countries;
  citiesDb = this.masterData.citiesDb;

  // --- Country Form ---
  countryForm: FormGroup;
  editCountryId = signal<number | null>(null);
  isSavingCountry = signal(false);

  // --- City Form ---
  cityForm: FormGroup;
  editCityId = signal<number | null>(null);
  isSavingCity = signal(false);

  constructor() {
    this.countryForm = this.fb.group({
      name: ['', Validators.required],
      code: ['']
    });

    this.cityForm = this.fb.group({
      name: ['', Validators.required],
      country_id: [null]
    });
  }

  ngOnInit() {
    this.masterData.refresh().subscribe();
  }

  // --- Country CRUD ---
  onEditCountry(country: any) {
    this.editCountryId.set(country.id);
    this.countryForm.patchValue({ name: country.name, code: country.code });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDeleteCountry(id: number) {
    if (confirm('Are you sure you want to delete this country?')) {
      this.countryApi.deleteCountry(id).subscribe(() => this.masterData.refresh().subscribe());
    }
  }

  onSubmitCountry() {
    if (this.countryForm.invalid) return;
    this.isSavingCountry.set(true);
    const data = this.countryForm.value;
    const id = this.editCountryId();
    const obs = id ? this.countryApi.updateCountry(id, data) : this.countryApi.addCountry(data);
    obs.subscribe({
      next: () => { this.resetCountryForm(); this.masterData.refresh().subscribe(); },
      error: () => this.isSavingCountry.set(false),
      complete: () => this.isSavingCountry.set(false)
    });
  }

  resetCountryForm() {
    this.editCountryId.set(null);
    this.countryForm.reset();
  }

  // --- City CRUD ---
  onEditCity(city: any) {
    this.editCityId.set(city.id);
    this.cityForm.patchValue({ name: city.name, country_id: city.country_id });
    window.scrollTo({ top: document.getElementById('city-section')?.offsetTop ?? 0, behavior: 'smooth' });
  }

  onDeleteCity(id: number) {
    if (confirm('Are you sure you want to delete this city?')) {
      this.cityApi.deleteCity(id).subscribe(() => this.masterData.refresh().subscribe());
    }
  }

  onSubmitCity() {
    if (this.cityForm.invalid) return;
    this.isSavingCity.set(true);
    const data = this.cityForm.value;
    const id = this.editCityId();
    const obs = id ? this.cityApi.updateCity(id, data) : this.cityApi.addCity(data);
    obs.subscribe({
      next: () => { this.resetCityForm(); this.masterData.refresh().subscribe(); },
      error: () => this.isSavingCity.set(false),
      complete: () => this.isSavingCity.set(false)
    });
  }

  resetCityForm() {
    this.editCityId.set(null);
    this.cityForm.reset();
  }
}
