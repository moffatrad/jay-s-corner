import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Product, ProductAvailability } from "../models/models";
import { UploadService } from "./upload.service";

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
  sort?: "price_asc" | "price_desc" | "name_asc";
}

export interface ProductInput {
  name: string;
  description: string;
  price: number | string;
  images: string[];
  category: string;
  stockQuantity: number;
  availability: ProductAvailability;
  isActive: boolean;
}

@Injectable({ providedIn: "root" })
export class ProductService {
  constructor(private http: HttpClient, private uploadService: UploadService) {}

  list(filters: ProductFilters = {}): Observable<{ products: Product[] }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<{ products: Product[] }>(`${environment.apiUrl}/products`, { params });
  }

  categories(): Observable<{ categories: string[] }> {
    return this.http.get<{ categories: string[] }>(`${environment.apiUrl}/products/categories`);
  }

  get(id: string): Observable<{ product: Product }> {
    return this.http.get<{ product: Product }>(`${environment.apiUrl}/products/${id}`);
  }

  create(payload: ProductInput): Observable<{ product: Product }> {
    return this.http.post<{ product: Product }>(`${environment.apiUrl}/products`, payload);
  }

  update(id: string, payload: ProductInput): Observable<{ product: Product }> {
    return this.http.put<{ product: Product }>(`${environment.apiUrl}/products/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/products/${id}`);
  }

  uploadImage(file: File): Observable<{ url: string }> {
    return this.uploadService.uploadImage(file);
  }
}
