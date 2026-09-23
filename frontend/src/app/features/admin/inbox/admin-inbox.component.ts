import { Component, OnInit, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ConversationService } from "../../../core/services/conversation.service";
import { ChatService } from "../../../core/services/chat.service";
import { Conversation } from "../../../core/models/models";
import { CurrencyPipe } from "../../../shared/pipes/currency.pipe";
import { ProfileTabsComponent } from "../../../shared/components/profile-tabs.component";

interface CustomerGroup {
  customerId: string;
  customerName: string;
  customerEmail: string;
  unreadCount: number;
  conversations: Conversation[];
}

@Component({
  selector: "app-admin-inbox",
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, ProfileTabsComponent],
  templateUrl: "./admin-inbox.component.html",
})
export class AdminInboxComponent implements OnInit {
  conversations = signal<Conversation[]>([]);
  loading = signal(true);

  groups = computed<CustomerGroup[]>(() => {
    const byCustomer = new Map<string, CustomerGroup>();
    for (const c of this.conversations()) {
      const key = c.customerId;
      if (!byCustomer.has(key)) {
        byCustomer.set(key, {
          customerId: key,
          customerName: c.customer?.name ?? "Customer",
          customerEmail: c.customer?.email ?? "",
          unreadCount: 0,
          conversations: [],
        });
      }
      const group = byCustomer.get(key)!;
      group.conversations.push(c);
      if (c.unread) group.unreadCount++;
    }
    return [...byCustomer.values()].sort((a, b) => a.customerName.localeCompare(b.customerName));
  });

  constructor(private conversationService: ConversationService, private chat: ChatService) {}

  ngOnInit() {
    this.chat.connect();
    this.load();

    this.chat.conversationNew$.subscribe(() => this.load());
    this.chat.conversationUpdated$.subscribe(() => this.load());
  }

  load() {
    this.conversationService.list().subscribe({
      next: (res) => {
        this.conversations.set(res.conversations);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
