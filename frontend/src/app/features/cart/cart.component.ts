import { Component, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CartService } from "../../core/services/cart.service";
import { CurrencyPipe } from "../../shared/pipes/currency.pipe";

@Component({
  selector: "app-cart",
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: "./cart.component.html",
})
export class CartComponent implements OnInit {
  constructor(public cartService: CartService) {}

  ngOnInit() {
    this.cartService.refresh();
  }

  updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    this.cartService.updateQuantity(itemId, quantity).subscribe();
  }

  remove(itemId: string) {
    this.cartService.remove(itemId).subscribe();
  }
}
