import { Component } from "@angular/core";
import { ProfileTabsComponent } from "../../shared/components/profile-tabs.component";
import { ProfileFormComponent } from "../../shared/components/profile-form.component";

@Component({
  selector: "app-account",
  standalone: true,
  imports: [ProfileTabsComponent, ProfileFormComponent],
  templateUrl: "./account.component.html",
})
export class AccountComponent {}
