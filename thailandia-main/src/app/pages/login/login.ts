import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslationService } from '../../core/services/translation.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  public translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  public t = this.translationService.translations;
  public errorMessage = signal<string | null>(null);
  public isLoading = signal(false);
  public showPassword = signal(false);

  loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false]
  });

  ngOnInit() {
    this.loadRememberedUser();
    this.initializeGoogleLogin();
  }

  private loadRememberedUser() {
    const savedUser = localStorage.getItem('remember_user');
    console.log('[LoginComponent] loadRememberedUser(): found =>', savedUser);
    if (savedUser) {
      this.loginForm.patchValue({
        username: savedUser,
        rememberMe: true
      });
    }
  }

  private saveRememberedUser() {
    const { username, rememberMe } = this.loginForm.value;
    if (rememberMe && username) {
      localStorage.setItem('remember_user', username);
    } else {
      localStorage.removeItem('remember_user');
    }
  }

  private initializeGoogleLogin() {
    // We can't initialize until the script is loaded in index.html
    // and we have a valid Client ID.
    // @ts-ignore
    if (typeof google !== 'undefined') {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', // Placeholder
        callback: this.handleGoogleLogin.bind(this)
      });
    }
  }

  onGoogleLogin() {
    // @ts-ignore
    if (typeof google !== 'undefined') {
      // @ts-ignore
      google.accounts.id.prompt();
    } else {
      this.errorMessage.set('Google Login is not available at the moment.');
    }
  }

  handleGoogleLogin(response: any) {
    console.log('Google Login Response:', response);
    this.isLoading.set(true);
    // Here we would call authService.googleLogin(response.credential)
    // For now, we'll just show a message since we don't have a backend yet.
    setTimeout(() => {
       this.isLoading.set(false);
       this.errorMessage.set('Google Login requires a valid Client ID and Backend support. Please check the documentation.');
    }, 1000);
  }

  onSubmit(event: Event) {
    event.preventDefault();
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.loginForm.getRawValue();
    this.saveRememberedUser();

    this.authService.login(username!, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate([this.authService.getFirstAccessibleRoute()]);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Please check your credentials.');
      }
    });
  }
}
