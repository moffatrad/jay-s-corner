import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { ChatMessage, Conversation, ConversationStatus, MessageType } from "../models/models";

@Injectable({ providedIn: "root" })
export class ConversationService {
  constructor(private http: HttpClient) {}

  /** "Checkout" — creates a conversation seeded with an order-summary message from the caller's cart. */
  checkout(): Observable<{ conversation: Conversation; message: ChatMessage }> {
    return this.http.post<{ conversation: Conversation; message: ChatMessage }>(
      `${environment.apiUrl}/conversations`,
      {}
    );
  }

  list(): Observable<{ conversations: Conversation[] }> {
    return this.http.get<{ conversations: Conversation[] }>(`${environment.apiUrl}/conversations`);
  }

  getMessages(conversationId: string): Observable<{ conversation: Conversation; messages: ChatMessage[] }> {
    return this.http.get<{ conversation: Conversation; messages: ChatMessage[] }>(
      `${environment.apiUrl}/conversations/${conversationId}/messages`
    );
  }

  sendMessageRest(
    conversationId: string,
    content: string,
    type: MessageType = "TEXT"
  ): Observable<{ message: ChatMessage }> {
    return this.http.post<{ message: ChatMessage }>(
      `${environment.apiUrl}/conversations/${conversationId}/messages`,
      { content, type }
    );
  }

  updateStatus(conversationId: string, status: ConversationStatus): Observable<{ conversation: Conversation }> {
    return this.http.put<{ conversation: Conversation }>(
      `${environment.apiUrl}/conversations/${conversationId}/status`,
      { status }
    );
  }
}
