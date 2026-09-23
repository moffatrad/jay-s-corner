import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { Cart } from "../models/models";

const EMPTY_CART: Cart = { items: [], subtotal: 0, itemCount: 0 };

@Injectable({ providedIn: "root" })
export class CartService {
  private readonly cartSignal = signal<Cart>(EMPTY_CART);
  readonly cart = this.cartSignal.asReadonly();

  constructor(private http: HttpClient) {}

  refresh() {
    this.http.get<Cart>(`${environment.apiUrl}/cart`).subscribe({
      next: (cart) => this.cartSignal.set(cart),
      error: () => this.cartSignal.set(EMPTY_CART),
    });
  }

  add(productId: string, quantity = 1) {
    return this.http
      .post<Cart>(`${environment.apiUrl}/cart`, { productId, quantity })
      .pipe(tap((cart) => this.cartSignal.set(cart)));
  }

  updateQuantity(itemId: string, quantity: number) {
    return this.http
      .put<Cart>(`${environment.apiUrl}/cart/${itemId}`, { quantity })
      .pipe(tap((cart) => this.cartSignal.set(cart)));
  }

  remove(itemId: string) {
    return this.http
      .delete<Cart>(`${environment.apiUrl}/cart/${itemId}`)
      .pipe(tap((cart) => this.cartSignal.set(cart)));
  }

  /** Called right after login to merge any guest-session cart into the user's cart. */
  syncAfterLogin() {
    return this.http
      .post<Cart>(`${environment.apiUrl}/cart/sync`, {})
      .pipe(tap((cart) => this.cartSignal.set(cart)));
  }

  clearLocal() {
    this.cartSignal.set(EMPTY_CART);
  }
}
