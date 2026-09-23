# Jay's Corner

A single-vendor e-commerce web app. Jay (you) is the only seller — customers browse a product
catalog, add items to a cart, and instead of a traditional payment checkout, they submit their
cart as an order request through a built-in real-time chat with you. You reply in the same chat
to confirm details, pricing, and arrange payment/delivery outside the platform.

## Tech stack

- **Frontend**: Angular 19, TypeScript, Angular Router, Tailwind CSS, RxJS, `socket.io-client`.
- **Backend**: Node.js + Express, REST API, Socket.IO for real-time chat.
- **Database**: Neon serverless Postgres, accessed with **Drizzle ORM** (see note below on why
  Drizzle instead of Prisma).
- **Auth**: Email/password with JWTs. One `ADMIN` role (you) and `CUSTOMER` role (everyone else).

### Why Drizzle instead of Prisma

The original spec called for Prisma or Drizzle. This project was built inside a sandboxed
environment whose network policy blocks `binaries.prisma.sh` (the host Prisma downloads its
native query-engine binaries from), so `prisma generate`/`migrate` could not run there at all.
Drizzle ships as pure TypeScript with no native binary to download, so it was used instead — it
gives you the same schema-as-code, type-safe queries, and SQL migration files. If you'd strongly
prefer Prisma, the schema in `backend/src/db/schema.ts` maps directly onto the Prisma schema
described in the original spec and can be ported later.

## Project structure

```
jays-corner/
├── backend/     Express API + Socket.IO chat server + Drizzle schema/migrations
├── frontend/    Angular app
└── README.md    You are here
```

## Prerequisites

- Node.js 20.11+ or 22.12+ (Angular 19 requires one of these — see "A note on Node versions" below)
- A Neon Postgres database (you already have one — see below)

## 1. Database setup (Neon + Drizzle)

You already ran `npx neon@latest init` (or created a project in the Neon console) and have a
connection string that looks like:

```
postgresql://<user>:<password>@<host>/<db>?sslmode=require&channel_binding=require
```

1. `cd backend`
2. Copy the example env file and fill in your real values:
   ```
   cp .env.example .env
   ```
   Then edit `.env` and set `DATABASE_URL` to your Neon connection string. Also set a real
   `JWT_SECRET` (any long random string) and, if you like, change `ADMIN_EMAIL` /
   `ADMIN_PASSWORD` / `ADMIN_NAME` — these become your seller login.
3. Install dependencies:
   ```
   npm install
   ```
4. Generate + apply the migration (this creates all tables in your Neon database):
   ```
   npm run db:generate   # already generated once — only needed again if you change schema.ts
   npm run db:migrate
   ```
   (`db:push` is also available for quick prototyping without migration files, but `migrate` is
   the safer, tracked path.)
5. Seed sample products and your admin/seller account:
   ```
   npm run seed
   ```
   This creates ~19 sample products across Clothing, Electronics, Jewelry, Shoes and Kitchenware,
   plus your admin account (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`). Re-running the seed
   script is safe — it skips products if the table isn't empty, and skips the admin account if it
   already exists.

> **Note on this build environment:** the sandbox this project was built in blocks outbound
> connections to Neon entirely (both the Postgres port and Neon's HTTP API), so steps 4 and 5
> above could not be run from there — only the SQL migration file was generated and checked into
> `backend/drizzle/`. Run `npm run db:migrate` and `npm run seed` yourself once, from your own
> machine; after that everything else in this README works normally.

## 2. Backend

```
cd backend
npm install        # if you haven't already
npm run dev         # starts the API + Socket.IO server on http://localhost:4000, with reload
```

Other scripts:
- `npm run build && npm start` — compiled production run
- `npm run db:studio` — opens Drizzle Studio, a GUI for browsing your Neon data

Health check: `GET http://localhost:4000/api/health` → `{ "ok": true }`

## 3. Frontend

```
cd frontend
npm install         # if you haven't already
npm start           # ng serve, http://localhost:4200
```

The frontend expects the backend at `http://localhost:4000` in development
(`src/environments/environment.ts`). Update `src/environments/environment.prod.ts` with your real
API/Socket.IO URL before building for production (`npm run build`).

## Logging in

- **Customers**: register a new account at `/register`, or use one you've created.
- **You (the seller/admin)**: log in at `/login` with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from
  `backend/.env` (seeded by `npm run seed`). Admin accounts land on `/admin/inbox` after login and
  get the "Admin: Products" / "Admin: Inbox" links in the nav bar.

## How the chat-checkout flow works end to end

1. A customer browses `/products`, opens a product, and clicks **Add to Cart**. Guests get a
   cart tied to a random session id (`localStorage`); logged-in customers get a cart tied to
   their account. Logging in merges any guest-session cart into the account cart
   (`POST /api/cart/sync`).
2. On `/cart`, the customer clicks **Checkout via Chat**. There's no payment page — instead
   `/checkout` calls `POST /api/conversations`, which:
   - creates a `Conversation` between the customer and you (the seller),
   - snapshots the customer's current cart into an `Order` row and an `ORDER_SUMMARY` message,
   - clears the customer's cart,
   - redirects the customer straight into `/chat/:conversationId`.
3. From there it's a normal real-time chat over Socket.IO (`message:send` / `message:receive`),
   with messages persisted to Postgres and reloaded on reconnect. The customer can also revisit
   any past conversation from `/account`.
4. You see every new conversation in `/admin/inbox` (unread indicator = a dot; the list also
   live-updates via `conversation:new` / `conversation:updated` socket events), open one to reply,
   and set a status tag (`New → Confirmed → Paid → Shipped → Completed`) as the order progresses.
   You arrange actual payment and delivery with the customer outside the app (bank transfer, cash,
   a payment link you send manually, etc).

### Where a payment gateway would go later

This version intentionally has no payment integration. If you later want customers to pay inline
instead of arranging it over chat, the natural seam is:
- Backend: add a `POST /api/conversations/:id/payment-intent` endpoint (e.g. wrapping Stripe's
  PaymentIntents API) once an order's price is confirmed in chat, and a webhook endpoint to mark
  the `Order`/`Conversation` status `PAID` automatically.
- Frontend: add a "Pay now" action inside the chat thread (`chat.component.ts`) once the seller
  has confirmed a price, opening Stripe Checkout or Elements.
- The `ConversationStatus` enum already includes `PAID`, and `orders.status` mirrors it, so no
  schema change is needed to represent a paid order — only to automate reaching that state.

## Data model

Implemented in `backend/src/db/schema.ts` (Drizzle) — mirrors the spec:

- `users` — id, name, email, passwordHash, role (`CUSTOMER`/`ADMIN`), shipping address fields, timestamps
- `products` — id, name, description, price, images (array), category, stockQuantity, isActive, timestamps
- `cart_items` — id, userId **or** sessionId (guest cart), productId, quantity
- `conversations` — id, customerId, sellerId, status, lastMessageAt, per-side "last read" timestamps (for unread indicators)
- `messages` — id, conversationId, senderId, type (`TEXT`/`ORDER_SUMMARY`), content, createdAt
- `orders` — id, conversationId (1:1), customerId, items (JSON snapshot), total, status, createdAt

## API endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | Create a customer account |
| POST | `/api/auth/login` | Returns `{ token, user }` |
| GET | `/api/auth/me` | Requires auth |
| PUT | `/api/auth/me` | Update profile / shipping address |
| GET | `/api/products` | Query params: `category`, `minPrice`, `maxPrice`, `inStock`, `search`, `sort` |
| GET | `/api/products/categories` | Distinct category list |
| GET | `/api/products/:id` | |
| POST/PUT/DELETE | `/api/products/:id` | Admin-only |
| GET/POST | `/api/cart` | Guests: send header `x-session-id`. Logged-in: `Authorization: Bearer <token>` |
| POST | `/api/cart/sync` | Merges guest session cart into the logged-in user's cart |
| PUT/DELETE | `/api/cart/:itemId` | |
| POST | `/api/conversations` | "Checkout" — creates a conversation + order summary from the caller's cart |
| GET | `/api/conversations` | Own threads, or every thread if admin |
| GET | `/api/conversations/:id/messages` | Also marks the thread read for the caller's role |
| POST | `/api/conversations/:id/messages` | REST fallback for sending (primary path is the socket event) |
| PUT | `/api/conversations/:id/status` | Admin-only — set `NEW`/`CONFIRMED`/`PAID`/`SHIPPED`/`COMPLETED` |

### Socket.IO events

Connect with `auth: { token: <jwt> }`. Events: `conversation:join`, `conversation:leave`,
`message:send` (ack-based), `message:receive` (broadcast), `conversation:new` (to the admin
room, on checkout), `conversation:updated`, `conversation:status`, `typing`.

## Environment variables

**backend/.env** (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Secret used to sign auth tokens — change this before going live |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `PORT` | API/Socket.IO port, default `4000` |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Used only by `npm run seed` to create your admin account |

**frontend/src/environments/** — `apiUrl` and `socketUrl` per environment (dev vs. prod).

## A note on Node versions

The latest Angular CLI (v22 at time of writing) requires a very recent Node patch version
(`^22.12.0` and specifically `>=22.22.3`). This project was scaffolded with **Angular 19**, which
only requires Node `^18.19.1 || ^20.11.1 || >=22.0.0` — broadly compatible and still a current,
fully-supported major version. If your machine has a newer Node and you want to upgrade to a
newer Angular major later, `ng update` handles that incrementally.

## What's implemented vs. left for you to extend

Implemented end-to-end: product catalog with search/filter/category, cart (guest + logged-in,
merged on login), chat-based checkout, real-time chat with reconnect handling and history, admin
product CRUD, admin inbox with unread indicators and status tags, customer account/profile/order
history, JWT auth with separate customer/admin roles, mobile-first responsive layout.

Reasonable next steps if you keep building: image upload (products currently take image URLs —
wiring up something like Cloudinary or S3 would replace the URL text field in
`admin-products.component`), email notifications on new orders/messages, pagination for large
product catalogs, and the Stripe integration seam described above.
