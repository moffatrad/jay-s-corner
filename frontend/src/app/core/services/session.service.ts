import { Injectable } from "@angular/core";

const SESSION_KEY = "jc_session_id";

/** Generates and persists a stable anonymous session id for guest carts. */
@Injectable({ providedIn: "root" })
export class SessionService {
  getSessionId(): string {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }
}
