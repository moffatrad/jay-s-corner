import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ConversationService } from "../../core/services/conversation.service";
import { Conversation } from "../../core/models/models";
import { CurrencyPipe } from "../../shared/pipes/currency.pipe";
import { ProfileTabsComponent } from "../../shared/components/profile-tabs.component";

@Component({
  selector: "app-account-messages",
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, ProfileTabsComponent],
  templateUrl: "./account-messages.component.html",
})
export class AccountMessagesComponent implements OnInit {
  conversations = signal<Conversation[]>([]);
  loading = signal(true);

  constructor(private conversationService: ConversationService) {}

  ngOnInit() {
    this.conversationService.list().subscribe({
      next: (res) => {
        this.conversations.set(res.conversations);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
