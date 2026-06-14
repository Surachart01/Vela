import { Component, input, output, ChangeDetectionStrategy, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-assistance-fee-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './assistance-fee-modal.html',
  styleUrl: './assistance-fee-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistanceFeeModalComponent {
  isOpen = input<boolean>(false);
  agentName = input<string>('');
  initialEnabled = input<boolean>(true);
  initialAmount = input<number>(1000);

  closeModal = output<void>();
  save = output<{enabled: boolean, amount: number}>();

  private fb = inject(FormBuilder);
  public translationService = inject(TranslationService);
  public t = this.translationService.translations;

  form = this.fb.group({
    enabled: [true],
    amount: [1000]
  });

  constructor() {
    effect(() => {
      // Whenever input changes, we patch the form (e.g. when opening differently)
      this.form.patchValue({
        enabled: this.initialEnabled(),
        amount: this.initialAmount()
      }, { emitEvent: false });
    });
  }

  onSave() {
    this.save.emit({
      enabled: !!this.form.value.enabled,
      amount: Number(this.form.value.amount) || 0
    });
  }
}
