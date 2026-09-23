// Jay's Corner — Drizzle ORM schema
// Single-vendor e-commerce: catalog + cart + chat-based checkout.

import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../lib/id";

export const roleEnum = pgEnum("role", ["CUSTOMER", "ADMIN"]);
export const conversationStatusEnum = pgEnum("conversation_status", [
  "NEW",
  "CONFIRMED",
  "PAID",
  "SHIPPED",
  "COMPLETED",
]);
export const messageTypeEnum = pgEnum("message_type", ["TEXT", "ORDER_SUMMARY", "IMAGE"]);
export const productAvailabilityEnum = pgEnum("product_availability", ["READILY_AVAILABLE", "BY_ORDER"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(createId),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("CUSTOMER"),

  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 120 }),
  region: varchar("region", { length: 120 }),
  postalCode: varchar("postal_code", { length: 30 }),
  country: varchar("country", { length: 120 }),
  phone: varchar("phone", { length: 40 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: varchar("code_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumed: boolean("consumed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("otp_codes_user_idx").on(table.userId),
}));

export const products = pgTable("products", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(createId),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  images: text("images").array().notNull().default([]),
  category: varchar("category", { length: 120 }).notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  availability: productAvailabilityEnum("availability").notNull().default("READILY_AVAILABLE"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index("products_category_idx").on(table.category),
}));

export const cartItems = pgTable("cart_items", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 191 }).references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 191 }),
  productId: varchar("product_id", { length: 191 })
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userProductIdx: uniqueIndex("cart_items_user_product_idx").on(table.userId, table.productId),
  sessionProductIdx: uniqueIndex("cart_items_session_product_idx").on(table.sessionId, table.productId),
}));

export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(createId),
  customerId: varchar("customer_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: conversationStatusEnum("status").notNull().default("NEW"),

  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  adminLastReadAt: timestamp("admin_last_read_at"),
  customerLastReadAt: timestamp("customer_last_read_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  customerIdx: index("conversations_customer_idx").on(table.customerId),
  sellerIdx: index("conversations_seller_idx").on(table.sellerId),
}));

export const messages = pgTable("messages", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(createId),
  conversationId: varchar("conversation_id", { length: 191 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: messageTypeEnum("type").notNull().default("TEXT"),
  content: text("content").notNull(), // plain text, or JSON string for ORDER_SUMMARY
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
}));

export const orders = pgTable("orders", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(createId),
  conversationId: varchar("conversation_id", { length: 191 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  items: jsonb("items").notNull(), // [{ productId, name, price, quantity }]
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  status: conversationStatusEnum("status").notNull().default("NEW"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  conversationIdx: uniqueIndex("orders_conversation_idx").on(table.conversationId),
}));

export const reviews = pgTable("reviews", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(createId),
  productId: varchar("product_id", { length: 191 })
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull().default(""),
  images: text("images").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  productCustomerIdx: uniqueIndex("reviews_product_customer_idx").on(table.productId, table.customerId),
  productIdx: index("reviews_product_idx").on(table.productId),
}));

// Relations (for query API ergonomics)
export const usersRelations = relations(users, ({ many }) => ({
  cartItems: many(cartItems),
  conversationsAsCustomer: many(conversations, { relationName: "customerConversations" }),
  conversationsAsSeller: many(conversations, { relationName: "sellerConversations" }),
  messages: many(messages),
  orders: many(orders),
  reviews: many(reviews),
  otpCodes: many(otpCodes),
}));

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  user: one(users, { fields: [otpCodes.userId], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  cartItems: many(cartItems),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  customer: one(users, { fields: [reviews.customerId], references: [users.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  customer: one(users, {
    fields: [conversations.customerId],
    references: [users.id],
    relationName: "customerConversations",
  }),
  seller: one(users, {
    fields: [conversations.sellerId],
    references: [users.id],
    relationName: "sellerConversations",
  }),
  messages: many(messages),
  order: one(orders, { fields: [conversations.id], references: [orders.conversationId] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  conversation: one(conversations, { fields: [orders.conversationId], references: [conversations.id] }),
  customer: one(users, { fields: [orders.customerId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
