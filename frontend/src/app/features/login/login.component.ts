import { Component, OnDestroy, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { CartService } from "../../core/services/cart.service";
import { ChatService } from "../../core/services/chat.service";
import { NotificationService } from "../../core/services/notification.service";

const RESEND_COOLDOWN_SECONDS = 30;

@Component({
  selector: "app-login",
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: "./login.component.html",
})
export class LoginComponent implements OnDestroy {
  step = signal<"credentials" | "code">("credentials");

  email = "";
  password = "";
  code = "";

  pendingToken = "";
  error = signal<string | null>(null);
  loading = signal(false);
  resendCooldown = signal(0);
  resendMessage = signal<string | null>(null);

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private auth: AuthService,
    private cart: CartService,
    private chat: ChatService,
    private notifications: NotificationService,
    private router: Router
  ) {}

  ngOnDestroy() {
    this.stopCooldown();
  }

  submitCredentials() {
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.pendingToken = res.pendingToken;
        this.code = "";
        this.step.set("code");
        this.startCooldown();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? "Login failed. Check your email and password.");
      },
    });
  }

  submitCode() {
    if (!this.code.trim()) return;
    this.error.set(null);
    this.loading.set(true);
    this.auth.verifyOtp(this.pendingToken, this.code.trim()).subscribe({
      next: () => {
        this.cart.syncAfterLogin().subscribe(() => {
          this.chat.connect();
          this.notifications.refresh();
          this.router.navigate(this.auth.isAdmin() ? ["/admin/inbox"] : ["/"]);
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? "That code didn't work. Please try again.");
      },
    });
  }

  resendCode() {
    if (this.resendCooldown() > 0) return;
    this.error.set(null);
    this.resendMessage.set(null);
    this.auth.resendOtp(this.pendingToken).subscribe({
      next: (res) => {
        this.pendingToken = res.pendingToken;
        this.resendMessage.set("A new code is on its way.");
        this.startCooldown();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? "Couldn't resend the code. Please try again shortly.");
      },
    });
  }

  backToCredentials() {
    this.step.set("credentials");
    this.password = "";
    this.code = "";
    this.pendingToken = "";
    this.error.set(null);
    this.resendMessage.set(null);
    this.stopCooldown();
  }

  private startCooldown() {
    this.stopCooldown();
    this.resendCooldown.set(RESEND_COOLDOWN_SECONDS);
    this.cooldownTimer = setInterval(() => {
      const next = this.resendCooldown() - 1;
      if (next <= 0) {
        this.resendCooldown.set(0);
        this.stopCooldown();
      } else {
        this.resendCooldown.set(next);
      }
    }, 1000);
  }

  private stopCooldown() {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}
