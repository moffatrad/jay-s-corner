import { Component, Input, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Product } from "../../core/models/models";
import { CurrencyPipe } from "../../shared/pipes/currency.pipe";
import { CartService } from "../../core/services/cart.service";

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

@Component({
  selector: "app-product-card",
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <a [routerLink]="['/products', product.id]" class="group flex flex-col">
      <div class="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
        <img
          [src]="product.images[0] ?? 'https://placehold.co/600x800?text=No+Image'"
          [alt]="product.name"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        @if (isNew) {
          <span class="absolute top-2 left-2 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded">
            New
          </span>
        }

        @if (isSoldOut) {
          <div class="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span class="bg-gray-900 text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded">Sold Out</span>
          </div>
        }

        <button
          (click)="quickAdd($event)"
          [disabled]="isSoldOut || adding()"
          aria-label="Add to cart"
          class="absolute bottom-2 right-2 h-9 w-9 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition disabled:hidden"
          [class.bg-brand-600]="added()"
        >
          @if (added()) {
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        </button>
      </div>

      <div class="flex flex-col gap-0.5 pt-2">
        <span class="text-[11px] uppercase tracking-wide text-gray-400 font-medium">{{ product.category }}</span>
        <h3 class="text-sm text-gray-800 line-clamp-2 leading-snug">{{ product.name }}</h3>
        <span class="font-bold text-gray-900 text-sm pt-0.5">{{ product.price | jcCurrency }}</span>
        @if (product.availability === 'BY_ORDER') {
          <span class="text-[11px] font-semibold text-amber-600">By order</span>
        } @else if (!isSoldOut) {
          <span class="text-[11px] font-semibold text-green-600">Readily available</span>
        }
      </div>
    </a>
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  adding = signal(false);
  added = signal(false);

  constructor(private cart: CartService) {}

  get isNew(): boolean {
    const created = new Date(this.product.createdAt).getTime();
    return Date.now() - created < NEW_WINDOW_MS;
  }

  get isSoldOut(): boolean {
    return this.product.availability === "READILY_AVAILABLE" && this.product.stockQuantity <= 0;
  }

  quickAdd(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.adding() || this.isSoldOut) return;
    this.adding.set(true);
    this.cart.add(this.product.id, 1).subscribe({
      next: () => {
        this.adding.set(false);
        this.added.set(true);
        setTimeout(() => this.added.set(false), 1500);
      },
      error: () => this.adding.set(false),
    });
  }
}
