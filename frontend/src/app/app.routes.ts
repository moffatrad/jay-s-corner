import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { adminGuard } from "./core/guards/admin.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./features/products/products.component").then((m) => m.ProductsComponent),
  },
  {
    path: "products",
    loadComponent: () => import("./features/products/products.component").then((m) => m.ProductsComponent),
  },
  {
    path: "products/:id",
    loadComponent: () =>
      import("./features/product-detail/product-detail.component").then((m) => m.ProductDetailComponent),
  },
  {
    path: "cart",
    loadComponent: () => import("./features/cart/cart.component").then((m) => m.CartComponent),
  },
  {
    path: "checkout",
    canActivate: [authGuard],
    loadComponent: () => import("./features/checkout/checkout.component").then((m) => m.CheckoutComponent),
  },
  {
    path: "chat/:conversationId",
    canActivate: [authGuard],
    loadComponent: () => import("./features/chat/chat.component").then((m) => m.ChatComponent),
  },
  {
    path: "login",
    loadComponent: () => import("./features/login/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "register",
    loadComponent: () => import("./features/register/register.component").then((m) => m.RegisterComponent),
  },
  {
    path: "account",
    canActivate: [authGuard],
    loadComponent: () => import("./features/account/account.component").then((m) => m.AccountComponent),
  },
  {
    path: "account/orders",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/account/account-orders.component").then((m) => m.AccountOrdersComponent),
  },
  {
    path: "account/messages",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/account/account-messages.component").then((m) => m.AccountMessagesComponent),
  },
  {
    path: "account/reviews",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/account/account-reviews.component").then((m) => m.AccountReviewsComponent),
  },
  {
    path: "admin/profile",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/profile/admin-profile.component").then((m) => m.AdminProfileComponent),
  },
  {
    path: "admin/orders",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/orders/admin-orders.component").then((m) => m.AdminOrdersComponent),
  },
  {
    path: "admin/reviews",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/reviews/admin-reviews.component").then((m) => m.AdminReviewsComponent),
  },
  {
    path: "admin/products",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/products/admin-products.component").then((m) => m.AdminProductsComponent),
  },
  {
    path: "admin/inbox",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/inbox/admin-inbox.component").then((m) => m.AdminInboxComponent),
  },
  {
    path: "admin/inbox/:conversationId",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/inbox/admin-inbox-detail.component").then((m) => m.AdminInboxDetailComponent),
  },
  { path: "**", redirectTo: "" },
];
