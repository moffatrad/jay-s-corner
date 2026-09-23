import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ProductService } from "../../../core/services/product.service";
import { Product, ProductAvailability } from "../../../core/models/models";
import { CurrencyPipe } from "../../../shared/pipes/currency.pipe";

type ProductFormModel = {
  id: string | null;
  name: string;
  description: string;
  price: number | null;
  images: string[];
  newImageUrl: string;
  category: string;
  stockQuantity: number | null;
  availability: ProductAvailability;
  isActive: boolean;
};

function emptyForm(): ProductFormModel {
  return {
    id: null,
    name: "",
    description: "",
    price: null,
    images: [],
    newImageUrl: "",
    category: "",
    stockQuantity: 0,
    availability: "READILY_AVAILABLE",
    isActive: true,
  };
}

@Component({
  selector: "app-admin-products",
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: "./admin-products.component.html",
})
export class AdminProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  uploading = signal(false);
  error = signal<string | null>(null);

  form: ProductFormModel = emptyForm();

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.productService.list().subscribe({
      next: (res) => {
        this.products.set(res.products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.form = emptyForm();
    this.error.set(null);
    this.showForm.set(true);
  }

  openEdit(product: Product) {
    this.form = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      images: [...product.images],
      newImageUrl: "",
      category: product.category,
      stockQuantity: product.stockQuantity,
      availability: product.availability,
      isActive: product.isActive,
    };
    this.error.set(null);
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (files.length === 0) return;

    this.uploading.set(true);
    this.error.set(null);
    let remaining = files.length;

    files.forEach((file) => {
      this.productService.uploadImage(file).subscribe({
        next: (res) => {
          this.form.images.push(res.url);
          remaining--;
          if (remaining === 0) this.uploading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.error ?? "Failed to upload image.");
          remaining--;
          if (remaining === 0) this.uploading.set(false);
        },
      });
    });
  }

  addImageUrl() {
    const url = this.form.newImageUrl.trim();
    if (!url) return;
    this.form.images.push(url);
    this.form.newImageUrl = "";
  }

  removeImage(index: number) {
    this.form.images.splice(index, 1);
  }

  save() {
    if (!this.form.name || !this.form.description || this.form.price === null || !this.form.category) {
      this.error.set("Name, description, price and category are required.");
      return;
    }

    const payload = {
      name: this.form.name,
      description: this.form.description,
      price: this.form.price,
      images: this.form.images,
      category: this.form.category,
      stockQuantity: this.form.stockQuantity ?? 0,
      availability: this.form.availability,
      isActive: this.form.isActive,
    };

    this.saving.set(true);
    const req = this.form.id
      ? this.productService.update(this.form.id, payload)
      : this.productService.create(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? "Failed to save product.");
      },
    });
  }

  remove(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    this.productService.delete(product.id).subscribe(() => this.load());
  }
}
