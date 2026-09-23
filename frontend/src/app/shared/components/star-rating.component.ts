import { Component, EventEmitter, Input, Output, signal } from "@angular/core";

@Component({
  selector: "app-star-rating",
  standalone: true,
  template: `
    <div class="flex items-center gap-0.5" (mouseleave)="hoverRating.set(0)">
      @for (star of [1, 2, 3, 4, 5]; track star) {
        <button
          type="button"
          [disabled]="!interactive"
          (click)="onSelect(star)"
          (mouseenter)="interactive && hoverRating.set(star)"
          [attr.aria-label]="'Rate ' + star + ' out of 5'"
          class="p-0 leading-none"
          [class.cursor-pointer]="interactive"
          [class.cursor-default]="!interactive"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            [class]="sizeClass"
            [attr.fill]="star <= (hoverRating() || rating) ? '#f59e0b' : 'none'"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="#f59e0b"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.385a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
        </button>
      }
    </div>
  `,
})
export class StarRatingComponent {
  @Input() rating = 0;
  @Input() interactive = false;
  @Input() size: "sm" | "md" | "lg" = "sm";
  @Output() ratingChange = new EventEmitter<number>();

  hoverRating = signal(0);

  get sizeClass(): string {
    return { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[this.size];
  }

  onSelect(star: number) {
    if (!this.interactive) return;
    this.ratingChange.emit(star);
  }
}
