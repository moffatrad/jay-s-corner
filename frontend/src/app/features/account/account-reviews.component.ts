import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ReviewService } from "../../core/services/review.service";
import { UploadService } from "../../core/services/upload.service";
import { Review } from "../../core/models/models";
import { ProfileTabsComponent } from "../../shared/components/profile-tabs.component";
import { StarRatingComponent } from "../../shared/components/star-rating.component";

@Component({
  selector: "app-account-reviews",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProfileTabsComponent, StarRatingComponent],
  templateUrl: "./account-reviews.component.html",
})
export class AccountReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);
  loading = signal(true);
  editingId = signal<string | null>(null);
  editRating = 0;
  editComment = "";
  editImages: string[] = [];
  saving = signal(false);
  uploadingImage = signal(false);
  imageError = signal<string | null>(null);

  constructor(private reviewService: ReviewService, private uploadService: UploadService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.reviewService.mine().subscribe({
      next: (res) => {
        this.reviews.set(res.reviews);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  startEdit(review: Review) {
    this.editingId.set(review.id);
    this.editRating = review.rating;
    this.editComment = review.comment;
    this.editImages = [...review.images];
    this.imageError.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (files.length === 0) return;

    this.imageError.set(null);
    this.uploadingImage.set(true);
    let remaining = files.length;

    files.forEach((file) => {
      this.uploadService.uploadImage(file).subscribe({
        next: (res) => {
          this.editImages.push(res.url);
          remaining--;
          if (remaining === 0) this.uploadingImage.set(false);
        },
        error: (err) => {
          this.imageError.set(err?.error?.error ?? "Failed to upload image.");
          remaining--;
          if (remaining === 0) this.uploadingImage.set(false);
        },
      });
    });
  }

  removeImage(index: number) {
    this.editImages.splice(index, 1);
  }

  saveEdit(review: Review) {
    if (this.editRating < 1) return;
    this.saving.set(true);
    this.reviewService.upsert(review.productId, this.editRating, this.editComment, this.editImages).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingId.set(null);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(review: Review) {
    if (!confirm("Delete this review?")) return;
    this.reviewService.delete(review.id).subscribe(() => this.load());
  }
}
