export type Role = "CUSTOMER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  createdAt: string;
}

export type ProductAvailability = "READILY_AVAILABLE" | "BY_ORDER";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string; // decimal as string from the API
  images: string[];
  category: string;
  stockQuantity: number;
  availability: ProductAvailability;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartLineItem {
  id: string;
  quantity: number;
  product: Product;
  lineTotal: number;
}

export interface Cart {
  items: CartLineItem[];
  subtotal: number;
  itemCount: number;
}

export type ConversationStatus = "NEW" | "CONFIRMED" | "PAID" | "SHIPPED" | "COMPLETED";

export interface OrderSummaryContent {
  items: { productId: string; name: string; price: number; quantity: number; lineTotal: number }[];
  total: number;
}

export type MessageType = "TEXT" | "ORDER_SUMMARY" | "IMAGE";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string; // JSON string when type === ORDER_SUMMARY, an image URL when type === IMAGE
  createdAt: string;
}

export interface Order {
  id: string;
  conversationId: string;
  customerId: string;
  items: OrderSummaryContent["items"];
  total: string;
  status: ConversationStatus;
  createdAt: string;
  customer?: { id: string; name: string; email: string };
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string };
  product?: { id: string; name: string; images: string[] };
}

export interface Conversation {
  id: string;
  customerId: string;
  sellerId: string;
  status: ConversationStatus;
  lastMessageAt: string;
  adminLastReadAt?: string | null;
  customerLastReadAt?: string | null;
  createdAt: string;
  unread?: boolean;
  customer?: { id: string; name: string; email: string };
  order?: Order | null;
}
