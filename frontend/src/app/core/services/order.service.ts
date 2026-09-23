import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Order } from "../models/models";

@Injectable({ providedIn: "root" })
export class OrderService {
  constructor(private http: HttpClient) {}

  mine(): Observable<{ orders: Order[] }> {
    return this.http.get<{ orders: Order[] }>(`${environment.apiUrl}/orders/mine`);
  }

  all(): Observable<{ orders: Order[] }> {
    return this.http.get<{ orders: Order[] }>(`${environment.apiUrl}/orders`);
  }
}
