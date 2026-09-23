import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { isValidPhoneNumber } from "libphonenumber-js";
import { AuthService } from "../../core/services/auth.service";
import { User } from "../../core/models/models";

const DEFAULT_PHONE_COUNTRY = "BW"; // Botswana — used when the number has no country code.

@Component({
  selector: "app-profile-form",
  standalone: true,
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="save()" class="space-y-3 bg-white border border-gray-200 rounded-xl p-5 max-w-lg">
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Name</label>
        <input [(ngModel)]="form.name" name="name" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
        <input [value]="auth.user()?.email" disabled class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Address line 1</label>
        <input [(ngModel)]="form.addressLine1" name="addressLine1" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Address line 2</label>
        <input [(ngModel)]="form.addressLine2" name="addressLine2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">City</label>
          <input [(ngModel)]="form.city" name="city" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Region/Province</label>
          <input [(ngModel)]="form.region" name="region" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Postal code</label>
          <input [(ngModel)]="form.postalCode" name="postalCode" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Country</label>
          <input [(ngModel)]="form.country" name="country" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Phone</label>
        <input [(ngModel)]="form.phone" name="phone" placeholder="+267 71 234 567" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        @if (form.phone && !isPhoneValid) {
          <p class="text-xs text-red-500 mt-1">That doesn't look like a real phone number.</p>
        }
      </div>

      @if (error()) {
        <p class="text-red-600 text-sm">{{ error() }}</p>
      }

      @if (savedMessage()) {
        <p class="text-green-600 text-sm">Saved.</p>
      }

      <button
        type="submit"
        [disabled]="saving() || !isPhoneValid"
        class="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
      >
        {{ saving() ? 'Saving…' : 'Save changes' }}
      </button>
    </form>
  `,
})
export class ProfileFormComponent implements OnInit {
  saving = signal(false);
  savedMessage = signal(false);
  error = signal<string | null>(null);
  form: Partial<User> = {};

  constructor(public auth: AuthService) {}

  get isPhoneValid(): boolean {
    return !this.form.phone || isValidPhoneNumber(this.form.phone, DEFAULT_PHONE_COUNTRY);
  }

  ngOnInit() {
    const user = this.auth.user();
    if (user) {
      this.form = {
        name: user.name,
        addressLine1: user.addressLine1 ?? "",
        addressLine2: user.addressLine2 ?? "",
        city: user.city ?? "",
        region: user.region ?? "",
        postalCode: user.postalCode ?? "",
        country: user.country ?? "",
        phone: user.phone ?? "",
      };
    }
  }

  save() {
    this.error.set(null);
    if (!this.isPhoneValid) {
      this.error.set("Enter a valid phone number, e.g. +267 71 234 567.");
      return;
    }
    this.saving.set(true);
    this.auth.updateProfile(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedMessage.set(true);
        setTimeout(() => this.savedMessage.set(false), 2500);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? "Failed to save changes.");
      },
    });
  }
}
