import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { AgentApiService } from '../../../core/services/api/agent-api.service';
import { AssistanceFeeModalComponent } from '../../../core/components/modals/assistance-fee-modal/assistance-fee-modal';
import { AuthService } from '../../../core/services/auth.service';

interface Agent {
  id?: number;
  name: string;
  markup_group?: string;
  markup?: string;
  email: string;
  telephone?: string;
  tel?: string;
  address: string;
  assistanceFeeEnabled: boolean;
  feeAmount: number;
}

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, RouterModule, AssistanceFeeModalComponent],
  templateUrl: './agents.html',
  styleUrl: './agents.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentsComponent implements OnInit {
  private translationService = inject(TranslationService);
  private agentApiService = inject(AgentApiService);
  public authService = inject(AuthService);
  public t = this.translationService.translations;

  agentsList = signal<Agent[]>([]);

  ngOnInit() {
    this.loadAgents();
  }

  loadAgents() {
    this.agentApiService.listAgents().subscribe(agents => {
      const sortedAgents = agents.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      this.agentsList.set(sortedAgents);
      this.filteredAgents.set(sortedAgents);
    });
  }

  filteredAgents = signal<Agent[]>([]);

  isFeeModalOpen = signal(false);
  activeAgentForFee = signal<Agent | null>(null);

  filterAgents(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.filteredAgents.set(this.agentsList());
      return;
    }
    this.filteredAgents.set(
      this.agentsList().filter(a => 
        (a.name?.toLowerCase().includes(q)) ||
        (a.email?.toLowerCase().includes(q)) ||
        (a.telephone?.toLowerCase().includes(q)) ||
        (a.markup_group?.toLowerCase().includes(q))
      )
    );
  }

  openFeeModal(agent: Agent) {
    this.activeAgentForFee.set(agent);
    this.isFeeModalOpen.set(true);
  }

  closeFeeModal() {
    this.isFeeModalOpen.set(false);
    this.activeAgentForFee.set(null);
  }

  handleFeeSave(data: { enabled: boolean, amount: number }) {
    const agent = this.activeAgentForFee();
    if (agent) {
      // Update in local state (simulating API call as there is no specific fee update endpoint in agentController.js)
      const updatedAgents = this.agentsList().map(a => {
        if (a.name === agent.name) {
          return { ...a, assistanceFeeEnabled: data.enabled, feeAmount: data.amount };
        }
        return a;
      });
      this.agentsList.set(updatedAgents);
      this.filteredAgents.set(updatedAgents);
    }
    this.closeFeeModal();
  }

  deleteAgent(id: number | string) {
    if (confirm(`Are you sure you want to delete this agent?`)) {
      this.agentApiService.deleteAgent(id).subscribe(() => {
        this.loadAgents();
      });
    }
  }
}
