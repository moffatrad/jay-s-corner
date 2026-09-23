import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { OrderService } from "../../core/services/order.service";
import { Order } from "../../core/models/models";
import { CurrencyPipe } from "../../shared/pipes/currency.pipe";
import { ProfileTabsComponent } from "../../shared/components/profile-tabs.component";

@Component({
  selector: "app-account-orders",
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ProfileTabsComponent],
  templateUrl: "./account-orders.component.html",
})
export class AccountOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.orderService.mine().subscribe({
      next: (res) => {
        this.orders.set(res.orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
