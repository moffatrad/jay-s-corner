import { Injectable, signal } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { Subject } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthService } from "./auth.service";
import { ChatMessage, MessageType } from "../models/models";

@Injectable({ providedIn: "root" })
export class ChatService {
  private socket: Socket | null = null;

  readonly connected = signal(false);
  readonly messageReceived$ = new Subject<ChatMessage>();
  readonly conversationNew$ = new Subject<{ conversationId: string; customerId: string; total: number }>();
  readonly conversationUpdated$ = new Subject<{ conversationId: string }>();
  readonly conversationStatus$ = new Subject<{ conversationId: string; status: string }>();
  readonly typing$ = new Subject<{ conversationId: string; userId: string; isTyping: boolean }>();

  constructor(private auth: AuthService) {}

  connect() {
    if (this.socket?.connected) return;
    const token = this.auth.token();
    if (!token) return;

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on("connect", () => this.connected.set(true));
    this.socket.on("disconnect", () => this.connected.set(false));
    this.socket.on("message:receive", (msg: ChatMessage) => this.messageReceived$.next(msg));
    this.socket.on("conversation:new", (payload: any) => this.conversationNew$.next(payload));
    this.socket.on("conversation:updated", (payload: any) => this.conversationUpdated$.next(payload));
    this.socket.on("conversation:status", (payload: any) => this.conversationStatus$.next(payload));
    this.socket.on("typing", (payload: any) => this.typing$.next(payload));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  joinConversation(conversationId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(false);
      this.socket.emit("conversation:join", conversationId, (ok: boolean) => resolve(ok));
    });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit("conversation:leave", conversationId);
  }

  sendMessage(conversationId: string, content: string, type: MessageType = "TEXT"): Promise<ChatMessage | null> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(null);
      this.socket.emit(
        "message:send",
        { conversationId, content, type },
        (ok: boolean, data?: ChatMessage) => resolve(ok ? data ?? null : null)
      );
    });
  }

  setTyping(conversationId: string, isTyping: boolean) {
    this.socket?.emit("typing", { conversationId, isTyping });
  }
}
