import { Component, HostListener, OnInit, signal } from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ProductService } from "../../core/services/product.service";
import { CartService } from "../../core/services/cart.service";
import { ReviewService } from "../../core/services/review.service";
import { AuthService } from "../../core/services/auth.service";
import { UploadService } from "../../core/services/upload.service";
import { Product, Review } from "../../core/models/models";
import { CurrencyPipe } from "../../shared/pipes/currency.pipe";
import { StarRatingComponent } from "../../shared/components/star-rating.component";

@Component({
  selector: "app-product-detail",
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe, StarRatingComponent],
  templateUrl: "./product-detail.component.html",
})
export class ProductDetailComponent implements OnInit {
  product = signal<Product | null>(null);
  loading = signal(true);
  activeImage = signal(0);
  lightboxOpen = signal(false);
  quantity = 1;
  addedMessage = signal(false);

  reviews = signal<Review[]>([]);
  reviewAverage = signal(0);
  reviewCount = signal(0);
  loadingReviews = signal(true);
  myReviewRating = 0;
  myReviewComment = "";
  myReviewImages: string[] = [];
  savingReview = signal(false);
  reviewSaved = signal(false);
  uploadingReviewImage = signal(false);
  reviewImageError = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private reviewService: ReviewService,
    private uploadService: UploadService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) return;
    this.productService.get(id).subscribe({
      next: (res) => {
        this.product.set(res.product);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadReviews(id);
  }

  loadReviews(productId: string) {
    this.loadingReviews.set(true);
    this.reviewService.forProduct(productId).subscribe({
      next: (res) => {
        this.reviews.set(res.reviews);
        this.reviewAverage.set(res.average);
        this.reviewCount.set(res.count);
        this.loadingReviews.set(false);

        const mine = res.reviews.find((r) => r.customerId === this.auth.user()?.id);
        if (mine) {
          this.myReviewRating = mine.rating;
          this.myReviewComment = mine.comment;
          this.myReviewImages = [...mine.images];
        }
      },
      error: () => this.loadingReviews.set(false),
    });
  }

  onReviewImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (files.length === 0) return;

    this.reviewImageError.set(null);
    this.uploadingReviewImage.set(true);
    let remaining = files.length;

    files.forEach((file) => {
      this.uploadService.uploadImage(file).subscribe({
        next: (res) => {
          this.myReviewImages.push(res.url);
          remaining--;
          if (remaining === 0) this.uploadingReviewImage.set(false);
        },
        error: (err) => {
          this.reviewImageError.set(err?.error?.error ?? "Failed to upload image.");
          remaining--;
          if (remaining === 0) this.uploadingReviewImage.set(false);
        },
      });
    });
  }

  removeReviewImage(index: number) {
    this.myReviewImages.splice(index, 1);
  }

  submitReview() {
    const product = this.product();
    if (!product || this.myReviewRating < 1) return;
    this.savingReview.set(true);
    this.reviewService.upsert(product.id, this.myReviewRating, this.myReviewComment, this.myReviewImages).subscribe({
      next: () => {
        this.savingReview.set(false);
        this.reviewSaved.set(true);
        setTimeout(() => this.reviewSaved.set(false), 2500);
        this.loadReviews(product.id);
      },
      error: () => this.savingReview.set(false),
    });
  }

  setActiveImage(i: number) {
    this.activeImage.set(i);
  }

  openLightbox(i: number) {
    this.activeImage.set(i);
    this.lightboxOpen.set(true);
  }

  closeLightbox() {
    this.lightboxOpen.set(false);
  }

  nextImage() {
    const images = this.product()?.images ?? [];
    if (images.length === 0) return;
    this.activeImage.set((this.activeImage() + 1) % images.length);
  }

  prevImage() {
    const images = this.product()?.images ?? [];
    if (images.length === 0) return;
    this.activeImage.set((this.activeImage() - 1 + images.length) % images.length);
  }

  @HostListener("document:keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (!this.lightboxOpen()) return;
    if (event.key === "ArrowRight") this.nextImage();
    if (event.key === "ArrowLeft") this.prevImage();
    if (event.key === "Escape") this.closeLightbox();
  }

  get totalPrice(): number {
    const product = this.product();
    if (!product) return 0;
    return Number(product.price) * this.quantity;
  }

  get isSoldOut(): boolean {
    const p = this.product();
    return !!p && p.availability === "READILY_AVAILABLE" && p.stockQuantity <= 0;
  }

  incrementQty() {
    const p = this.product();
    if (!p) return;
    if (p.availability === "BY_ORDER") {
      this.quantity++;
      return;
    }
    if (this.quantity < p.stockQuantity) this.quantity++;
  }

  decrementQty() {
    if (this.quantity > 1) this.quantity--;
  }

  addToCart() {
    const product = this.product();
    if (!product) return;
    this.cartService.add(product.id, this.quantity).subscribe(() => {
      this.addedMessage.set(true);
      setTimeout(() => this.addedMessage.set(false), 2500);
    });
  }
}
