import { Injectable, computed, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { User } from "../models/models";

const TOKEN_KEY = "jc_token";
const USER_KEY = "jc_user";

interface AuthResponse {
  token: string;
  user: User;
}

export interface OtpChallenge {
  pendingToken: string;
  expiresInSeconds: number;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly userSignal = signal<User | null>(this.readStoredUser());
  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = computed(() => this.userSignal());
  readonly token = computed(() => this.tokenSignal());
  readonly isLoggedIn = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === "ADMIN");

  constructor(private http: HttpClient, private router: Router) {}

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private persist(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.tokenSignal.set(res.token);
    this.userSignal.set(res.user);
  }

  register(name: string, email: string, password: string, phone: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, { name, email, password, phone })
      .pipe(tap((res) => this.persist(res)));
  }

  /** Step 1 of login: password check. On success the server emails a code instead of returning a JWT. */
  login(email: string, password: string): Observable<OtpChallenge> {
    return this.http.post<OtpChallenge>(`${environment.apiUrl}/auth/login`, { email, password });
  }

  /** Step 2 of login: exchanges the pending token + emailed code for the real session. */
  verifyOtp(pendingToken: string, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/verify-otp`, { pendingToken, code })
      .pipe(tap((res) => this.persist(res)));
  }

  resendOtp(pendingToken: string): Observable<OtpChallenge> {
    return this.http.post<OtpChallenge>(`${environment.apiUrl}/auth/resend-otp`, { pendingToken });
  }

  updateProfile(payload: Partial<User>): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${environment.apiUrl}/auth/me`, payload).pipe(
      tap((res) => {
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.userSignal.set(res.user);
      })
    );
  }

  refreshMe(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${environment.apiUrl}/auth/me`).pipe(
      tap((res) => {
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.userSignal.set(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.router.navigate(["/login"]);
  }
}
