import { Component, OnInit, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ReviewService } from "../../../core/services/review.service";
import { Review } from "../../../core/models/models";
import { ProfileTabsComponent } from "../../../shared/components/profile-tabs.component";
import { StarRatingComponent } from "../../../shared/components/star-rating.component";

interface ProductGroup {
  productId: string;
  productName: string;
  average: number;
  reviews: Review[];
}

@Component({
  selector: "app-admin-reviews",
  standalone: true,
  imports: [CommonModule, RouterLink, ProfileTabsComponent, StarRatingComponent],
  templateUrl: "./admin-reviews.component.html",
})
export class AdminReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);
  loading = signal(true);

  groups = computed<ProductGroup[]>(() => {
    const byProduct = new Map<string, ProductGroup>();
    for (const r of this.reviews()) {
      const key = r.productId;
      if (!byProduct.has(key)) {
        byProduct.set(key, { productId: key, productName: r.product?.name ?? "Unknown product", average: 0, reviews: [] });
      }
      byProduct.get(key)!.reviews.push(r);
    }
    for (const group of byProduct.values()) {
      group.average = Math.round((group.reviews.reduce((sum, r) => sum + r.rating, 0) / group.reviews.length) * 10) / 10;
    }
    return [...byProduct.values()].sort((a, b) => a.productName.localeCompare(b.productName));
  });

  constructor(private reviewService: ReviewService) {}

  ngOnInit() {
    this.reviewService.all().subscribe({
      next: (res) => {
        this.reviews.set(res.reviews);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
