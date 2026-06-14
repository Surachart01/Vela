import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { UserApiService } from '../../../core/services/api/user-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AgentApiService } from '../../../core/services/api/agent-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-user.html',
  styleUrl: './add-user.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddUserComponent implements OnInit {
  private fb = inject(FormBuilder);
  private location = inject(Location);
  private translationService = inject(TranslationService);
  private userApiService = inject(UserApiService);
  private agentApiService = inject(AgentApiService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public t = this.translationService.translations;

  agents = signal<any[]>([]);

  userId = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  userForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['', Validators.required],
    agent: ['', Validators.required],
    password: [''],
    confirmPassword: ['']
  });

  pageTitle = computed(() => {
    return this.userId() 
      ? (this.t()['user.editTitle'] || 'Edit User Account') 
      : (this.t()['user.createTitle'] || 'Create New User Account');
  });

  submitBtnText = computed(() => {
    return this.userId() 
      ? (this.t()['user.btnUpdate'] || 'Update Account') 
      : (this.t()['user.btnSave'] || 'Create Account');
  });

  ngOnInit() {
    this.loadAgents();
    const id = this.route.snapshot.paramMap.get('id');
    const isViewMode = this.route.snapshot.queryParamMap.get('mode') === 'view';

    // Permission Check
    if (id) {
      if (!this.authService.canEdit('cp_users') && !isViewMode) {
        this.toastService.error('Access Denied: You do not have permission to edit users.');
        this.router.navigate(['/control-panel/users']);
        return;
      }
    } else {
      if (!this.authService.canAdd('cp_users')) {
        this.toastService.error('Access Denied: You do not have permission to add users.');
        this.router.navigate(['/control-panel/users']);
        return;
      }
    }

    if (id) {
      this.userId.set(id);
      this.userApiService.getUser(id).subscribe(user => {
        this.userForm.patchValue({
          username: user.username,
          email: user.email,
          role: user.role,
          agent: user.agent_id?.toString() || ''
        });

        if (isViewMode || !this.authService.canEdit('cp_users')) {
          this.userForm.disable();
        }

        // Remove password requirement when editing
        this.userForm.get('password')?.clearValidators();
        this.userForm.get('password')?.updateValueAndValidity();
      });
    } else {
      // Set validators if creating
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  loadAgents() {
    this.agentApiService.listAgents().subscribe(data => {
      this.agents.set(data);
    });
  }

  goBack() {
    this.location.back();
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(v => !v);
  }

  saveUser() {
    if (this.userForm.valid) {
      const rawValue = this.userForm.getRawValue();
      const userData: any = {
        username: rawValue.username,
        email: rawValue.email,
        role: rawValue.role,
        agent_id: rawValue.agent
      };

      if (rawValue.password) {
        userData.password = rawValue.password;
      }

      const request = this.userId()
        ? this.userApiService.updateUser(this.userId()!, userData)
        : this.userApiService.createUser(userData);

      request.subscribe({
        next: () => {
          this.toastService.success(this.userId() ? 'User updated successfully' : 'User created successfully');
          this.router.navigate(['/control-panel/users']);
        },
        error: (err: any) => {
          console.error('Error saving user:', err);
          const msg = err.error?.message || 'Failed to save user';
          this.toastService.error(msg);
        }
      });
    } else {
      this.userForm.markAllAsTouched();
    }
  }
}
