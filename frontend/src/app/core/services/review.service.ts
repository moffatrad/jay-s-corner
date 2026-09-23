import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Review } from "../models/models";

export interface ProductReviewsResponse {
  reviews: Review[];
  average: number;
  count: number;
}

@Injectable({ providedIn: "root" })
export class ReviewService {
  constructor(private http: HttpClient) {}

  forProduct(productId: string): Observable<ProductReviewsResponse> {
    return this.http.get<ProductReviewsResponse>(`${environment.apiUrl}/reviews/product/${productId}`);
  }

  mine(): Observable<{ reviews: Review[] }> {
    return this.http.get<{ reviews: Review[] }>(`${environment.apiUrl}/reviews/mine`);
  }

  all(): Observable<{ reviews: Review[] }> {
    return this.http.get<{ reviews: Review[] }>(`${environment.apiUrl}/reviews`);
  }

  upsert(productId: string, rating: number, comment: string, images: string[] = []): Observable<{ review: Review }> {
    return this.http.post<{ review: Review }>(`${environment.apiUrl}/reviews`, { productId, rating, comment, images });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/reviews/${id}`);
  }
}
