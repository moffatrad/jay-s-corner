import { Component, computed } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-profile-tabs",
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-gray-200 mb-6">
      @for (tab of tabs(); track tab.link) {
        <a
          [routerLink]="tab.link"
          routerLinkActive="border-gray-900 text-gray-900"
          [routerLinkActiveOptions]="{ exact: tab.exact }"
          class="shrink-0 px-4 py-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-800 transition"
        >
          {{ tab.label }}
        </a>
      }
    </nav>
  `,
})
export class ProfileTabsComponent {
  constructor(private auth: AuthService) {}

  tabs = computed(() => {
    if (this.auth.isAdmin()) {
      return [
        { label: "My Profile", link: "/admin/profile", exact: true },
        { label: "Orders", link: "/admin/orders", exact: true },
        { label: "Messages", link: "/admin/inbox", exact: false },
        { label: "Reviews", link: "/admin/reviews", exact: true },
      ];
    }
    return [
      { label: "My Profile", link: "/account", exact: true },
      { label: "Orders", link: "/account/orders", exact: true },
      { label: "Messages", link: "/account/messages", exact: true },
      { label: "Reviews", link: "/account/reviews", exact: true },
    ];
  });
}
