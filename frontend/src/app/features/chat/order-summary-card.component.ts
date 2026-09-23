import { Component, Input } from "@angular/core";
import { CurrencyPipe } from "../../shared/pipes/currency.pipe";
import { OrderSummaryContent } from "../../core/models/models";

@Component({
  selector: "app-order-summary-card",
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    @if (summary) {
      <div class="bg-white border border-brand-200 rounded-xl p-4 max-w-sm shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">Order Summary</p>
        <ul class="divide-y divide-gray-100">
          @for (item of summary.items; track item.productId) {
            <li class="py-2 flex justify-between text-sm gap-3">
              <span class="text-gray-700">{{ item.name }} × {{ item.quantity }}</span>
              <span class="font-medium text-gray-900 shrink-0">{{ item.lineTotal | jcCurrency }}</span>
            </li>
          }
        </ul>
        <div class="flex justify-between pt-2 mt-1 border-t border-gray-200 font-bold text-gray-900">
          <span>Total</span>
          <span>{{ summary.total | jcCurrency }}</span>
        </div>
      </div>
    }
  `,
})
export class OrderSummaryCardComponent {
  @Input() summary: OrderSummaryContent | null = null;
}
