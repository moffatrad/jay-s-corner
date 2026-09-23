import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { isValidPhoneNumber } from "libphonenumber-js";
import { AuthService } from "../../core/services/auth.service";
import { CartService } from "../../core/services/cart.service";
import { ChatService } from "../../core/services/chat.service";
import { NotificationService } from "../../core/services/notification.service";

const DEFAULT_PHONE_COUNTRY = "BW"; // Botswana — used when the number has no country code.

@Component({
  selector: "app-register",
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: "./register.component.html",
})
export class RegisterComponent {
  name = "";
  email = "";
  password = "";
  phone = "";
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private cart: CartService,
    private chat: ChatService,
    private notifications: NotificationService,
    private router: Router
  ) {}

  get hasMinLength(): boolean {
    return this.password.length >= 8;
  }

  get hasLetter(): boolean {
    return /[a-zA-Z]/.test(this.password);
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.password);
  }

  get hasSymbol(): boolean {
    return /[^a-zA-Z0-9]/.test(this.password);
  }

  get isPasswordStrong(): boolean {
    return this.hasMinLength && this.hasLetter && this.hasNumber && this.hasSymbol;
  }

  get isPhoneValid(): boolean {
    return !!this.phone && isValidPhoneNumber(this.phone, DEFAULT_PHONE_COUNTRY);
  }

  submit() {
    this.error.set(null);
    if (!this.isPasswordStrong) {
      this.error.set("Password must be at least 8 characters and include letters, numbers and a symbol.");
      return;
    }
    if (!this.isPhoneValid) {
      this.error.set("Enter a valid phone number, e.g. +267 71 234 567.");
      return;
    }
    this.loading.set(true);
    this.auth.register(this.name, this.email, this.password, this.phone).subscribe({
      next: () => {
        this.cart.syncAfterLogin().subscribe(() => {
          this.chat.connect();
          this.notifications.refresh();
          this.router.navigate(["/"]);
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? "Registration failed.");
      },
    });
  }
}
