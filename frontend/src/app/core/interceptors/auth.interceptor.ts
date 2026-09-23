import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";
import { SessionService } from "../services/session.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const session = inject(SessionService);

  const token = auth.token();
  let headers = req.headers;

  if (token) {
    headers = headers.set("Authorization", `Bearer ${token}`);
  } else {
    // Guests get a stable session id so their cart persists across visits.
    headers = headers.set("x-session-id", session.getSessionId());
  }

  return next(req.clone({ headers }));
};
