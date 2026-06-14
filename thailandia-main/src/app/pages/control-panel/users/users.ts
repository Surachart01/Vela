import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { UserApiService } from '../../../core/services/api/user-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent implements OnInit {
  private translationService = inject(TranslationService);
  private userApiService = inject(UserApiService);
  public authService = inject(AuthService);
  public t = this.translationService.translations;

  searchQuery = signal('');
  itemsPerPage = signal(25);

  usersList = signal<any[]>([]);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userApiService.listUsers().subscribe(users => {
      this.usersList.set(users);
    });
  }

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.usersList().filter((u: any) => 
      u.username.toLowerCase().includes(query) || 
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.agent_name && u.agent_name.toLowerCase().includes(query))
    );
  });

  get displayUsers() {
    return this.filteredUsers().map(u => ({
      ...u,
      name: u.username,
      agent: u.agent_name || 'N/A'
    }));
  }

  totalItems = computed(() => this.filteredUsers().length);

  deleteUser(id: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userApiService.deleteUser(id).subscribe(() => {
        this.loadUsers();
      });
    }
  }
}
