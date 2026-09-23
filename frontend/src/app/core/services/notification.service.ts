import { Injectable, signal } from "@angular/core";
import { merge } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { ChatService } from "./chat.service";
import { ConversationService } from "./conversation.service";
import { AuthService } from "./auth.service";

/** Tracks the caller's unread chat-conversation count, live, for both customers and the admin. */
@Injectable({ providedIn: "root" })
export class NotificationService {
  readonly unreadCount = signal(0);

  constructor(
    private conversationService: ConversationService,
    private chat: ChatService,
    private auth: AuthService
  ) {
    merge(
      this.chat.messageReceived$,
      this.chat.conversationNew$,
      this.chat.conversationUpdated$,
      this.chat.conversationStatus$
    )
      .pipe(debounceTime(300))
      .subscribe(() => this.refresh());
  }

  refresh() {
    if (!this.auth.isLoggedIn()) {
      this.unreadCount.set(0);
      return;
    }
    this.conversationService.list().subscribe({
      next: (res) => this.unreadCount.set(res.conversations.filter((c) => c.unread).length),
      error: () => {},
    });
  }

  clear() {
    this.unreadCount.set(0);
  }
}
