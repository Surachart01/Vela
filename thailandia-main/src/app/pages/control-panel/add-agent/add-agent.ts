import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { AgentApiService } from '../../../core/services/api/agent-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-add-agent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-agent.html',
  styleUrl: './add-agent.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddAgentComponent implements OnInit {
  public location = inject(Location);
  public translationService = inject(TranslationService);
  public t = this.translationService.translations;
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private agentApiService = inject(AgentApiService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  agentId = signal<string | null>(null);

  agentForm = this.fb.group({
    name: ['', Validators.required],
    markup: ['', Validators.required],
    address: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', Validators.required],
    fax: [''],
    deadlineType: ['', Validators.required],
    customDays: [null as number | null]
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const isViewMode = this.route.snapshot.queryParamMap.get('mode') === 'view';

    // Permission Check
    if (id) {
      if (!this.authService.canEdit('cp_agents') && !isViewMode) {
        this.toastService.error('Access Denied: You do not have permission to edit agents.');
        this.router.navigate(['/control-panel/agents']);
        return;
      }
    } else {
      if (!this.authService.canAdd('cp_agents')) {
        this.toastService.error('Access Denied: You do not have permission to add agents.');
        this.router.navigate(['/control-panel/agents']);
        return;
      }
    }

    if (id) {
      this.agentId.set(id);
      this.agentApiService.listAgents().subscribe(agents => {
        const agent = agents.find((a: any) => a.id.toString() === id);
        if (agent) {
          this.agentForm.patchValue({
            name: agent.name,
            markup: agent.markup_group || agent.markup,
            address: agent.address,
            email: agent.email,
            telephone: agent.telephone || agent.tel,
            fax: agent.fax,
            deadlineType: agent.payment_deadline_type || '',
            customDays: agent.payment_deadline_days
          });

          if (isViewMode || !this.authService.canEdit('cp_agents')) {
            this.agentForm.disable();
          }
        }
      });
    }

    this.agentForm.get('deadlineType')?.valueChanges.subscribe(val => {
// ... lines omitted ...
    });
  }

  saveAgent() {
    if (this.agentForm.invalid) {
      this.toastService.error('Please fill in all required fields.');
      this.agentForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.error, .invalid-field, .ng-invalid');
        if (firstInvalidControl) {
          (firstInvalidControl as HTMLElement).focus();
          firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    const agentData = {
      name: this.agentForm.value.name,
      markup_group: this.agentForm.value.markup,
      email: this.agentForm.value.email,
      telephone: this.agentForm.value.telephone,
      address: this.agentForm.value.address,
      fax: this.agentForm.value.fax,
      payment_deadline_type: this.agentForm.value.deadlineType,
      payment_deadline_days: this.agentForm.value.customDays
    };

    const request = this.agentId() 
      ? this.agentApiService.updateAgent(this.agentId()!, agentData)
      : this.agentApiService.createAgent(agentData);

    request.subscribe({
      next: () => {
        this.location.back();
      },
      error: (err: any) => {
        console.error('Error saving agent:', err);
        const msg = err.error?.message || 'Failed to save agent. Please try again.';
        alert(msg);
      }
    });
  }
}
