import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";

/** Uploads an image file to the backend and resolves it to an absolute URL. Used for product photos and chat attachments. */
@Injectable({ providedIn: "root" })
export class UploadService {
  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);
    return this.http
      .post<{ url: string }>(`${environment.apiUrl}/uploads`, formData)
      .pipe(map((res) => ({ url: `${environment.socketUrl}${res.url}` })));
  }
}
