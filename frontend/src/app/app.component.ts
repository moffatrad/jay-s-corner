import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { AuthService } from "./core/services/auth.service";
import { CartService } from "./core/services/cart.service";
import { ChatService } from "./core/services/chat.service";
import { ProductService } from "./core/services/product.service";
import { NotificationService } from "./core/services/notification.service";

const RECENT_SEARCHES_KEY = "jc_recent_searches";
const MAX_RECENT_SEARCHES = 6;

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, FormsModule],
  templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
  profileMenuOpen = signal(false);
  searchQuery = "";
  searchFocused = signal(false);
  categories = signal<string[]>([]);
  recentSearches = signal<string[]>(this.loadRecentSearches());

  constructor(
    public auth: AuthService,
    public cart: CartService,
    private chat: ChatService,
    private router: Router,
    private productService: ProductService,
    public notifications: NotificationService
  ) {}

  ngOnInit() {
    this.cart.refresh();
    if (this.auth.isLoggedIn()) {
      this.chat.connect();
      this.notifications.refresh();
    }
    this.productService.categories().subscribe((res) => this.categories.set(res.categories));
  }

  onSearchFocus() {
    this.searchFocused.set(true);
  }

  onSearchBlur() {
    // Delay so a click on a suggestion registers before the panel hides.
    setTimeout(() => this.searchFocused.set(false), 150);
  }

  searchFor(term: string) {
    this.searchQuery = term;
    this.submitSearch();
  }

  goToCategory(category: string) {
    this.searchFocused.set(false);
    this.router.navigate(["/products"], { queryParams: { category } });
  }

  private loadRecentSearches(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveRecentSearch(term: string) {
    const next = [term, ...this.recentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    this.recentSearches.set(next);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable — recent searches just won't persist
    }
  }

  toggleProfileMenu() {
    this.profileMenuOpen.update((v) => !v);
  }

  openProfileMenu() {
    this.profileMenuOpen.set(true);
  }

  closeProfileMenu() {
    this.profileMenuOpen.set(false);
  }

  submitSearch() {
    const q = this.searchQuery.trim();
    this.searchFocused.set(false);
    if (q) this.saveRecentSearch(q);
    this.router.navigate(["/products"], q ? { queryParams: { search: q } } : {});
  }

  logout() {
    this.closeProfileMenu();
    this.chat.disconnect();
    this.cart.clearLocal();
    this.notifications.clear();
    this.auth.logout();
  }
}
