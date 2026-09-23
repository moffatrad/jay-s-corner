import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { ConversationService } from "../../core/services/conversation.service";
import { ChatService } from "../../core/services/chat.service";
import { AuthService } from "../../core/services/auth.service";
import { NotificationService } from "../../core/services/notification.service";
import { UploadService } from "../../core/services/upload.service";
import { ChatMessage, Conversation } from "../../core/models/models";
import { OrderSummaryCardComponent } from "./order-summary-card.component";

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [FormsModule, RouterLink, OrderSummaryCardComponent],
  templateUrl: "./chat.component.html",
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild("scrollAnchor") scrollAnchor?: ElementRef<HTMLDivElement>;

  conversationId = "";
  conversation = signal<Conversation | null>(null);
  messages = signal<ChatMessage[]>([]);
  loading = signal(true);
  draft = "";
  sending = signal(false);
  uploadingImage = signal(false);
  imageError = signal<string | null>(null);

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private conversationService: ConversationService,
    public chat: ChatService,
    public auth: AuthService,
    private notifications: NotificationService,
    private uploadService: UploadService
  ) {
    // Re-join the conversation room whenever the socket (re)connects.
    effect(() => {
      if (this.chat.connected() && this.conversationId) {
        this.chat.joinConversation(this.conversationId);
      }
    });
  }

  ngOnInit() {
    this.conversationId = this.route.snapshot.paramMap.get("conversationId") ?? "";
    this.chat.connect();

    this.conversationService.getMessages(this.conversationId).subscribe({
      next: (res) => {
        this.conversation.set(res.conversation);
        this.messages.set(res.messages);
        this.loading.set(false);
        this.chat.joinConversation(this.conversationId);
        this.scrollToBottom();
        this.notifications.refresh();
      },
      error: () => this.loading.set(false),
    });

    this.subs.push(
      this.chat.messageReceived$.subscribe((msg) => {
        if (msg.conversationId !== this.conversationId) return;
        if (this.messages().some((m) => m.id === msg.id)) return;
        this.messages.update((list) => [...list, msg]);
        this.scrollToBottom();
      })
    );

    this.subs.push(
      this.chat.conversationStatus$.subscribe(({ conversationId, status }) => {
        if (conversationId !== this.conversationId) return;
        this.conversation.update((c) => (c ? { ...c, status: status as Conversation["status"] } : c));
      })
    );
  }

  ngOnDestroy() {
    this.chat.leaveConversation(this.conversationId);
    this.subs.forEach((s) => s.unsubscribe());
  }

  parseOrderSummary(content: string) {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async send() {
    const content = this.draft.trim();
    if (!content || this.sending()) return;
    this.sending.set(true);
    this.draft = "";

    const result = await this.chat.sendMessage(this.conversationId, content);
    if (!result) {
      // Socket unavailable — fall back to REST so the message isn't lost.
      this.conversationService.sendMessageRest(this.conversationId, content).subscribe({
        next: (res) => {
          this.messages.update((list) => [...list, res.message]);
          this.scrollToBottom();
        },
      });
    }
    this.sending.set(false);
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    this.imageError.set(null);
    this.uploadingImage.set(true);
    this.uploadService.uploadImage(file).subscribe({
      next: async (res) => {
        const result = await this.chat.sendMessage(this.conversationId, res.url, "IMAGE");
        if (!result) {
          this.conversationService.sendMessageRest(this.conversationId, res.url, "IMAGE").subscribe({
            next: (r) => {
              this.messages.update((list) => [...list, r.message]);
              this.scrollToBottom();
            },
          });
        }
        this.uploadingImage.set(false);
      },
      error: (err) => {
        this.imageError.set(err?.error?.error ?? "Failed to upload image.");
        this.uploadingImage.set(false);
      },
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }
}
