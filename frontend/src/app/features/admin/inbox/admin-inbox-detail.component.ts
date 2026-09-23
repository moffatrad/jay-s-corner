import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { ConversationService } from "../../../core/services/conversation.service";
import { ChatService } from "../../../core/services/chat.service";
import { AuthService } from "../../../core/services/auth.service";
import { NotificationService } from "../../../core/services/notification.service";
import { UploadService } from "../../../core/services/upload.service";
import { ChatMessage, Conversation, ConversationStatus } from "../../../core/models/models";
import { OrderSummaryCardComponent } from "../../chat/order-summary-card.component";

const STATUS_OPTIONS: ConversationStatus[] = ["NEW", "CONFIRMED", "PAID", "SHIPPED", "COMPLETED"];

@Component({
  selector: "app-admin-inbox-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, OrderSummaryCardComponent],
  templateUrl: "./admin-inbox-detail.component.html",
})
export class AdminInboxDetailComponent implements OnInit, OnDestroy {
  @ViewChild("scrollAnchor") scrollAnchor?: ElementRef<HTMLDivElement>;

  statusOptions = STATUS_OPTIONS;
  conversationId = "";
  conversation = signal<Conversation | null>(null);
  messages = signal<ChatMessage[]>([]);
  loading = signal(true);
  draft = "";
  sending = signal(false);
  updatingStatus = signal(false);
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

  updateStatus(status: ConversationStatus) {
    this.updatingStatus.set(true);
    this.conversationService.updateStatus(this.conversationId, status).subscribe({
      next: (res) => {
        this.conversation.set(res.conversation);
        this.updatingStatus.set(false);
      },
      error: () => this.updatingStatus.set(false),
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }
}
