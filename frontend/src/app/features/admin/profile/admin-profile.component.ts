import { Component } from "@angular/core";
import { ProfileTabsComponent } from "../../../shared/components/profile-tabs.component";
import { ProfileFormComponent } from "../../../shared/components/profile-form.component";

@Component({
  selector: "app-admin-profile",
  standalone: true,
  imports: [ProfileTabsComponent, ProfileFormComponent],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Admin</h1>
      <app-profile-tabs />

      <section>
        <h2 class="font-semibold text-gray-900 mb-3">My Profile</h2>
        <app-profile-form />
      </section>
    </div>
  `,
})
export class AdminProfileComponent {}
