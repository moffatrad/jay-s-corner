import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { OrderService } from "../../../core/services/order.service";
import { Order } from "../../../core/models/models";
import { CurrencyPipe } from "../../../shared/pipes/currency.pipe";
import { ProfileTabsComponent } from "../../../shared/components/profile-tabs.component";

@Component({
  selector: "app-admin-orders",
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ProfileTabsComponent],
  templateUrl: "./admin-orders.component.html",
})
export class AdminOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.orderService.all().subscribe({
      next: (res) => {
        this.orders.set(res.orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
