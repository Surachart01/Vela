import { Component, Input, forwardRef, signal, computed, inject, input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-input',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="date-input-container" [class.disabled]="disabled()" (click)="onOverlayClick()">
      <div class="display-overlay">
        @if (value()) {
          <span class="date-text">{{ value() | date:'dd/MM/yyyy' }}</span>
        } @else {
          <span class="placeholder">{{ placeholder }}</span>
        }
        <i class="fa-regular fa-calendar picker-icon"></i>
      </div>
      <input 
        #picker
        type="date" 
        [value]="value()" 
        [min]="min()"
        [max]="max()"
        (input)="onInputChange($event)"
        (blur)="onTouched()"
        [disabled]="disabled()"
        class="hidden-native-picker"
      >
    </div>
  `,
  styleUrl: './date-input.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true
    }
  ]
})
export class DateInputComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'dd/mm/yyyy';
  min = input<string>('');
  max = input<string>('');

  value = signal<string>('');
  disabled = signal<boolean>(false);

  @ViewChild('picker') pickerElement!: ElementRef<HTMLInputElement>;

  onChange: any = () => {};
  onTouched: any = () => {};

  onOverlayClick() {
    if (this.disabled()) return;
    
    const input = this.pickerElement.nativeElement;
    
    // Most modern way
    if ('showPicker' in HTMLInputElement.prototype) {
      try {
        input.showPicker();
      } catch (e) {
        input.click();
      }
    } else {
      input.click();
    }
  }

  onInputChange(event: any) {
    const val = event.target.value;
    this.value.set(val);
    this.onChange(val);
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
