import { Component, OnInit, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { ConversationService } from "../../core/services/conversation.service";
import { CartService } from "../../core/services/cart.service";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./checkout.component.html",
})
export class CheckoutComponent implements OnInit {
  error = signal<string | null>(null);
  loading = signal(true);

  constructor(
    private conversationService: ConversationService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.conversationService.checkout().subscribe({
      next: (res) => {
        this.cartService.refresh();
        this.router.navigate(["/chat", res.conversation.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? "Something went wrong starting your order chat.");
      },
    });
  }
}
