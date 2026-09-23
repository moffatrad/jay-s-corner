import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgTemplateOutlet } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { ProductService } from "../../core/services/product.service";
import { Product } from "../../core/models/models";
import { ProductCardComponent } from "./product-card.component";

@Component({
  selector: "app-products",
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, ProductCardComponent],
  templateUrl: "./products.component.html",
})
export class ProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<string[]>([]);
  loading = signal(true);

  categorySectionOpen = signal(true);
  priceSectionOpen = signal(true);
  mobileFiltersOpen = signal(false);

  filters = {
    category: "",
    search: "",
    minPrice: null as number | null,
    maxPrice: null as number | null,
    inStock: false,
    sort: "" as "" | "price_asc" | "price_desc" | "name_asc",
  };

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(private productService: ProductService, private route: ActivatedRoute) {}

  ngOnInit() {
    const categoryParam = this.route.snapshot.queryParamMap.get("category");
    if (categoryParam) this.filters.category = categoryParam;
    const searchParam = this.route.snapshot.queryParamMap.get("search");
    if (searchParam) this.filters.search = searchParam;

    this.productService.categories().subscribe((res) => this.categories.set(res.categories));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.productService
      .list({
        category: this.filters.category || undefined,
        search: this.filters.search || undefined,
        minPrice: this.filters.minPrice ?? undefined,
        maxPrice: this.filters.maxPrice ?? undefined,
        inStock: this.filters.inStock || undefined,
        sort: this.filters.sort || undefined,
      })
      .subscribe({
        next: (res) => {
          this.products.set(res.products);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearchChange() {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 350);
  }

  resetFilters() {
    this.filters = { category: "", search: "", minPrice: null, maxPrice: null, inStock: false, sort: "" };
    this.load();
  }

  toggleMobileFilters() {
    this.mobileFiltersOpen.update((v) => !v);
  }
}
