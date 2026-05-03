# Shared Platform — HTTP API Reference

Backend: NestJS (`equipment-rental-api`). This document lists **only routes that exist in the codebase** (controllers under `src/**/*.controller.ts`).

---

## Base URL and versioning

- There is **no global route prefix** (no `/api` in `main.ts`).
- Default port: **`process.env.PORT`**, falling back to **`3000`** if unset.

```text
BASE_URL = http://localhost:3000
```

Example: current user profile → `GET http://localhost:3000/users/me`

CORS: enabled with `origin: true` (reflects request `Origin`).

---

## Authentication and global guards

### JWT (Microsoft Entra External ID – compatible stack)

- **`JwtAuthGuard` is registered globally** in `AppModule` (`APP_GUARD`).
- Most routes require a valid **Bearer access token** validated by Passport strategy `azure-b2c-jwt` (`passport-jwt` + `jwks-rsa`).
- Routes marked **`@Public()`** skip JWT (see Health and Stripe webhook).

**Header (when auth is required):**

```http
Authorization: Bearer <access_token>
```

On first authenticated request, `UsersService.ensureFromJwt()` **creates or loads** a `users` row keyed by `oid` / `sub` from the token.

### App roles (platform admin)

Some routes additionally use **`RolesGuard`** and require JWT claim-driven `roles` to include **`platform_admin`** (see `AppRole.PlatformAdmin` / token claim `platform_admin`).

### Business membership

Many mutations require the user to be a **member of a business** with sufficient **business role** (`owner` > `admin` > `manager` > `member`). Failures typically return **403** with messages like `Not a member of this business` or `Insufficient business role`.

---

## Error responses

All HTTP errors are shaped by `AllExceptionsFilter`:

```json
{
  "statusCode": 401,
  "path": "/users/me",
  "message": "Unauthorized",
  "timestamp": "2026-05-03T12:00:00.000Z"
}
```

- **`message`** may be a **string** or an **object** (e.g. Nest validation errors).
- Validation (`ValidationPipe`) failures are usually **400** with a structured `message` payload.

Example (validation, illustrative):

```json
{
  "statusCode": 400,
  "path": "/equipment",
  "message": {
    "statusCode": 400,
    "message": ["businessId must be a UUID"],
    "error": "Bad Request"
  },
  "timestamp": "2026-05-03T12:00:00.000Z"
}
```

Common status codes used by this API:

| Code | Meaning |
|------|---------|
| 200 | Success (GET/PATCH/POST returning body) |
| 201 | *(Not explicitly used; creates often return 200 with body)* |
| 400 | Bad request / validation / business rule (e.g. supplier not on Stripe Connect) |
| 401 | Missing or invalid JWT |
| 403 | Forbidden (not a business member, insufficient role, rental participant denied) |
| 404 | Resource not found (sometimes used to hide existence) |
| 409 | Conflict (invalid state transition) |
| 500 | Unhandled error |

---

## Domain: Health

### `GET /health`

| | |
|---|---|
| **Auth** | **No** (`@Public()`) |
| **Description** | Liveness / service identity check. |

**Response 200**

```json
{
  "status": "ok",
  "service": "equipment-rental-api"
}
```

---

## Domain: Users / session

### `GET /users/me`

| | |
|---|---|
| **Auth** | **Yes** — Bearer JWT |
| **Description** | Returns the **internal** user row after `ensureFromJwt` (creates user from token if missing). |

**Response 200**

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "email": "renter@example.com",
  "displayName": "renter"
}
```

**401** — Invalid or missing token.

---

## Domain: Businesses

All routes: **`JWT required`**.

### `POST /businesses`

Creates a business (verification **`pending`**), adds caller as **`owner`**.

**Body** (`CreateBusinessDto`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `legalName` | string | Yes | 2–300 chars |
| `taxId` | string | No | Max 64 chars |

**Example**

```json
{
  "legalName": "Acme Tool Rentals LLC",
  "taxId": "12-3456789"
}
```

**Response 200** — `Business` entity (camelCase), e.g.:

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "legalName": "Acme Tool Rentals LLC",
  "taxId": "12-3456789",
  "verificationStatus": "pending",
  "stripeConnectAccountId": null,
  "createdAt": "2026-05-03T12:00:00.000Z",
  "updatedAt": "2026-05-03T12:00:00.000Z",
  "deletedAt": null
}
```

---

### `GET /businesses/mine`

Lists businesses the current user belongs to.

**Response 200** — array of `Business`:

```json
[
  {
    "id": "22222222-2222-4222-8222-222222222222",
    "legalName": "Acme Tool Rentals LLC",
    "taxId": "12-3456789",
    "verificationStatus": "pending",
    "stripeConnectAccountId": null,
    "createdAt": "2026-05-03T12:00:00.000Z",
    "updatedAt": "2026-05-03T12:00:00.000Z",
    "deletedAt": null
  }
]
```

---

### `GET /businesses/:id`

**Path parameters:** `id` — business UUID.

**Description** — Business detail; caller must be a **member** of that business.

**Response 200** — `Business` object (as above).

**403 / 404** — Not a member or business missing.

---

### `POST /businesses/:id/members`

**Path parameters:** `id` — business UUID.

**Description** — Adds or updates a member; caller must be at least **admin** on the business.

**Body** (`AddMemberDto`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | UUID | Yes | Existing user id |
| `role` | string | Yes | `owner` \| `admin` \| `manager` \| `member` |

**Example**

```json
{
  "userId": "33333333-3333-4333-8333-333333333333",
  "role": "manager"
}
```

**Response 200** — `BusinessUser` membership row (serialized with TypeORM defaults, includes `id`, `userId`, `businessId`, `role`, timestamps).

---

## Domain: Equipment (tools / listings)

All routes: **`JWT required`**.

### `GET /equipment`

| | |
|---|---|
| **Auth** | **Yes** — Bearer JWT |
| **Description** | Paginated list of **`active`** equipment listings (`listingStatus === "active"`, not soft-deleted). |

**Query parameters** (`ListEquipmentQueryDto`):

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page index, integer ≥ 1 |
| `limit` | number | `10` | Page size, 1–50 |
| `businessId` | UUID | — | Filter by owning business |
| `minPrice` | number | — | Minimum `dailyRateCents` (≥ 0) |
| `maxPrice` | number | — | Maximum `dailyRateCents` (≥ 0) |

**Example request**

```http
GET /equipment?page=1&limit=10&minPrice=1000&maxPrice=5000
Authorization: Bearer <access_token>
```

**Response 200**

```json
{
  "data": [
    {
      "id": "44444444-4444-4444-8444-444444444444",
      "title": "Power Drill",
      "description": "High torque cordless kit.",
      "dailyRateCents": 2500,
      "currency": "USD",
      "listingStatus": "active",
      "images": [
        {
          "id": "55555555-5555-4555-8555-555555555555",
          "blobPath": "https://example.com/image.jpg",
          "sortOrder": 0
        }
      ],
      "business": {
        "id": "22222222-2222-4222-8222-222222222222",
        "legalName": "Acme Tool Rentals LLC"
      }
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 42
}
```

**401** — Missing or invalid JWT.

**400** — Invalid query params (e.g. `limit` above 50, invalid `businessId`, non-numeric `page`).

---

### `POST /equipment`

**Description** — Create listing. Caller must be at least **manager** on `businessId`. New listings default to **`listingStatus: "draft"`** (see `EquipmentService.create`).

**Body** (`CreateEquipmentDto`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `businessId` | UUID | Yes | Owning business |
| `title` | string | Yes | 2–300 chars |
| `description` | string | No | Max 2000 chars |
| `dailyRateCents` | number | Yes | Integer ≥ 0 |
| `currency` | string | No | 3-letter, e.g. `USD` |

**Example**

```json
{
  "businessId": "22222222-2222-4222-8222-222222222222",
  "title": "Power Drill",
  "description": "High torque cordless kit.",
  "dailyRateCents": 2500,
  "currency": "USD"
}
```

**Response 200** — `Equipment`:

```json
{
  "id": "44444444-4444-4444-8444-444444444444",
  "businessId": "22222222-2222-4222-8222-222222222222",
  "title": "Power Drill",
  "description": "High torque cordless kit.",
  "dailyRateCents": 2500,
  "currency": "USD",
  "listingStatus": "draft",
  "createdAt": "2026-05-03T12:00:00.000Z",
  "updatedAt": "2026-05-03T12:00:00.000Z",
  "deletedAt": null
}
```

---

### `GET /equipment/:id`

**Path parameters:** `id` — equipment UUID.

**Description** — Detail view with **`images`** and **`business`** relations loaded.

**Response 200**

```json
{
  "id": "44444444-4444-4444-8444-444444444444",
  "businessId": "22222222-2222-4222-8222-222222222222",
  "title": "Power Drill",
  "description": "High torque cordless kit.",
  "dailyRateCents": 2500,
  "currency": "USD",
  "listingStatus": "active",
  "createdAt": "2026-05-03T12:00:00.000Z",
  "updatedAt": "2026-05-03T12:00:00.000Z",
  "deletedAt": null,
  "images": [
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "equipmentId": "44444444-4444-4444-8444-444444444444",
      "blobPath": "https://example.blob/container/path.jpg",
      "sortOrder": 0,
      "createdAt": "2026-05-03T12:00:00.000Z",
      "updatedAt": "2026-05-03T12:00:00.000Z"
    }
  ],
  "business": {
    "id": "22222222-2222-4222-8222-222222222222",
    "legalName": "Acme Tool Rentals LLC",
    "taxId": "12-3456789",
    "verificationStatus": "verified",
    "stripeConnectAccountId": "acct_123",
    "createdAt": "2026-05-03T12:00:00.000Z",
    "updatedAt": "2026-05-03T12:00:00.000Z",
    "deletedAt": null
  }
}
```

**404** — Not found.

---

### `PATCH /equipment/:id`

**Description** — Update listing; caller must be at least **manager** on owning business.

**Body** (`UpdateEquipmentDto` — all optional):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | 2–300 chars |
| `description` | string | No | Max 2000 |
| `dailyRateCents` | number | No | ≥ 0 |
| `listingStatus` | enum | No | `draft` \| `active` \| `paused` \| `archived` |

**Example (publish listing)**

```json
{
  "listingStatus": "active"
}
```

**Response 200** — Updated `Equipment`.

---

### `DELETE /equipment/:id`

**Description** — Soft-delete; caller must be at least **admin** on owning business.

**Response 200**

```json
{
  "ok": true
}
```

---

### `POST /equipment/:id/images/sas?query`

**Description** — Issue a short-lived **upload URL** and **`blobPath`** for direct blob upload (see `BlobStorageService`). Caller must be at least **manager**.

**Query parameters** (`SasUploadQueryDto`):

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `extension` | string | Yes | 1–8 chars, e.g. `jpg` |

Example: `POST /equipment/444.../images/sas?extension=jpg`

**Response 200**

```json
{
  "uploadUrl": "https://...",
  "blobPath": "equipment/2026/05/abc123.jpg"
}
```

---

### `POST /equipment/:id/images`

**Description** — Registers an uploaded image on the listing after upload to `blobPath`. Caller must be at least **manager**.

**Body** (`RegisterImageDto`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blobPath` | string | Yes | From SAS response |
| `sortOrder` | number | No | Integer, default `0` |

**Example**

```json
{
  "blobPath": "equipment/2026/05/abc123.jpg",
  "sortOrder": 0
}
```

**Response 200** — `EquipmentImage` row.

---

## Domain: Rentals

Controllers: `RentalsController` and `RentalConditionsController` both use `@Controller('rentals')`.

All routes: **`JWT required`** unless noted.

### `POST /rentals`

**Description** — Create rental in **`pending`** state. Caller must belong to **`renterBusinessId`**. Equipment must be **`active`**, supplier business **`verified`**, and renter ≠ supplier.

**Body** (`CreateRentalDto`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `equipmentId` | UUID | Yes | Item to rent |
| `renterBusinessId` | UUID | Yes | Renting org |
| `startAt` | ISO date | Yes | Rental start |
| `endAt` | ISO date | Yes | Rental end (must be after start) |
| `depositAmountCents` | number | No | **Accepted by DTO validation only**; **`RentalsService.create` does not read or persist this field** (use `POST /payments/rentals/:rentalId/intents` for deposit sizing). |

**Example**

```json
{
  "equipmentId": "44444444-4444-4444-8444-444444444444",
  "renterBusinessId": "66666666-6666-4666-8666-666666666666",
  "startAt": "2026-05-10T08:00:00.000Z",
  "endAt": "2026-05-13T17:00:00.000Z"
}
```

**Response 200** — `Rental` (without expanded relations on create):

```json
{
  "id": "77777777-7777-4777-8777-777777777777",
  "equipmentId": "44444444-4444-4444-8444-444444444444",
  "renterBusinessId": "66666666-6666-4666-8666-666666666666",
  "supplierBusinessId": "22222222-2222-4222-8222-222222222222",
  "startAt": "2026-05-10T08:00:00.000Z",
  "endAt": "2026-05-13T17:00:00.000Z",
  "status": "pending",
  "totalAmountCents": 10000,
  "currency": "USD",
  "cancellationReason": null,
  "createdAt": "2026-05-03T12:00:00.000Z",
  "updatedAt": "2026-05-03T12:00:00.000Z",
  "deletedAt": null
}
```

**400** — Not active, supplier not verified, self-rental, etc.  
**404** — Equipment not found.

---

### `GET /rentals/:id`

**Description** — Rental detail for a participant (**renter** or **supplier** business member). Loads `equipment`, both businesses, `payments`, `deposits`, `deliveries`.

**Response 200** — `Rental` with nested objects (illustrative):

```json
{
  "id": "77777777-7777-4777-8777-777777777777",
  "equipmentId": "44444444-4444-4444-8444-444444444444",
  "renterBusinessId": "66666666-6666-4666-8666-666666666666",
  "supplierBusinessId": "22222222-2222-4222-8222-222222222222",
  "startAt": "2026-05-10T08:00:00.000Z",
  "endAt": "2026-05-13T17:00:00.000Z",
  "status": "confirmed",
  "totalAmountCents": 10000,
  "currency": "USD",
  "cancellationReason": null,
  "equipment": { "id": "44444444-4444-4444-8444-444444444444", "title": "Power Drill" },
  "renterBusiness": { "id": "66666666-6666-4666-8666-666666666666", "legalName": "Metro Builders" },
  "supplierBusiness": { "id": "22222222-2222-4222-8222-222222222222", "legalName": "Acme Tool Rentals LLC" },
  "payments": [],
  "deposits": [],
  "deliveries": [],
  "createdAt": "2026-05-03T12:00:00.000Z",
  "updatedAt": "2026-05-03T12:00:00.000Z",
  "deletedAt": null
}
```

**403** — Not a participant.

---

### `POST /rentals/:id/complete`

**Description** — Supplier-side completion: requires **`manager`** on **supplier** business; rental must be **`active`**. Sets **`completed`**.

**Response 200** — Updated `Rental`.

**409** — If not active.

---

### `POST /rentals/:id/cancel`

**Description** — Cancel if status **`pending`** or **`confirmed`**. Caller must be **`manager`** on the business indicated by `side`.

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Stored as cancellation reason |
| `side` | string | Yes | `renter` \| `supplier` |

**Example**

```json
{
  "reason": "Customer requested cancellation",
  "side": "renter"
}
```

**Response 200** — Updated `Rental` with `status: "cancelled"`.

---

### `POST /rentals/:id/activate`

| | |
|---|---|
| **Auth** | **JWT + `platform_admin`** (`RolesGuard`) |
| **Description** — Moves **`confirmed`** → **`active`**. |

**Response 200** — Updated `Rental`.

**403** — Insufficient role.

---

### `POST /rentals/:rentalId/conditions`

**Description** — Upsert pre/post inspection notes for `before` / `after` phase. Allowed when rental is **`confirmed`**, **`active`**, or **`completed`**. Participant must be member (**`member`**+ on either side).

**Body** (`UpsertConditionDto`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rentalId` | UUID | Yes | Must match path |
| `phase` | string | Yes | `before` \| `after` |
| `notes` | string | No | |

**Example**

```json
{
  "rentalId": "77777777-7777-4777-8777-777777777777",
  "phase": "before",
  "notes": "Minor scuffs on housing."
}
```

**Response 200** — `EquipmentCondition` row.

---

### `POST /rentals/:rentalId/conditions/images/sas`

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phase` | string | Yes | `before` \| `after` |
| `extension` | string | Yes | File extension for SAS |

**Response 200** — `{ "uploadUrl": "...", "blobPath": "..." }`

---

### `POST /rentals/:rentalId/conditions/images`

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phase` | string | Yes | `before` \| `after` |
| `blobPath` | string | Yes | From SAS |

**Response 200** — `ConditionImage` row.

---

## Domain: Payments (Stripe PaymentIntents, not Checkout Sessions)

### Important: there is no “Checkout Session” route

Payments use **Stripe Payment Intents**. The API returns **`clientSecret`** values for **Stripe.js** / mobile SDKs. **Success handling** is primarily driven by **webhooks** updating `payments` / `deposits` and advancing rental state.

All controller routes below: **`JWT required`**.

---

### `POST /payments/rentals/:rentalId/intents`

**Description** — Creates a **main rental** PaymentIntent (captures per service configuration) and optionally a **deposit** PaymentIntent (manual capture). Caller must be **`member`**+ on **renter** business. Supplier must have **`stripeConnectAccountId`**.

**Path parameters:** `rentalId` — UUID.

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `depositAmountCents` | number | No | If omitted, service defaults to ~**20%** of rental total when creating deposit |

**Example**

```json
{
  "depositAmountCents": 5000
}
```

**Response 200**

```json
{
  "rentalPayment": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
  },
  "deposit": {
    "clientSecret": "pi_yyy_secret_yyy",
    "paymentIntentId": "pi_yyy"
  }
}
```

`deposit` may be **omitted** when deposit amount resolves to zero.

**400** — Supplier not onboarded to Connect (`Supplier is not onboarded to Stripe Connect`).  
**404** — Rental not found.

---

### `POST /payments/rentals/:rentalId/settle`

**Description** — Post-completion settlement: **captures** rental charges if still capturable; **cancels** held deposit authorizations (happy path). Caller must be **`manager`**+ on **supplier** business.

**Response 200**

```json
{
  "ok": true
}
```

---

### `POST /payments/webhook/stripe` *(server-to-server)*

| | |
|---|---|
| **Auth** | **No JWT** (`@Public()`). Uses **Stripe signing secret** (`Stripe-Signature` header). |
| **Description** | Processes Stripe events (`payment_intent.succeeded`, `payment_intent.amount_capturable_updated`, `payment_intent.payment_failed`, …). |

**Headers**

```http
Stripe-Signature: t=...,v1=...
Content-Type: application/json
```

**Raw body** must be preserved (see `main.ts` — raw parser mounted on this path before `express.json()`).

**Response 200**

```json
{
  "received": true
}
```

**400** — Missing secret or signature.

> **Frontend note:** Browsers do **not** call this endpoint. Configure the URL in the Stripe Dashboard for your deployed API.

---

## Domain: Deliveries

All routes: **`JWT required`**.

### `GET /deliveries/rental/:rentalId`

Lists delivery rows for a rental if caller participates on renter or supplier side.

**Response 200** — `Delivery[]`:

```json
[
  {
    "id": "88888888-8888-4888-8888-888888888888",
    "rentalId": "77777777-7777-4777-8777-777777777777",
    "status": "scheduled",
    "scheduledAt": null,
    "deliveredAt": null,
    "trackingReference": null,
    "notes": null,
    "proofBlobPath": null,
    "createdAt": "2026-05-03T12:00:00.000Z",
    "updatedAt": "2026-05-03T12:00:00.000Z"
  }
]
```

---

### `PATCH /deliveries/:id/status`

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | Yes | `scheduled` \| `in_transit` \| `delivered` \| `returned` \| `failed` |

**Example**

```json
{
  "status": "delivered"
}
```

**Description** — Supplier-side (`member`+ on supplier). Sets `deliveredAt` when status is **`delivered`**.

**Response 200** — Updated `Delivery`.

---

### `POST /deliveries/:id/proof/sas`

**Body:**

```json
{
  "extension": "jpg"
}
```

**Response 200** — `{ "uploadUrl", "blobPath" }` (supplier **`member`+**).

---

### `POST /deliveries/:id/proof`

**Body:**

```json
{
  "blobPath": "deliveries/2026/05/proof.jpg"
}
```

**Response 200** — Updated `Delivery` with `proofBlobPath` set.

---

## Domain: Disputes

All routes: **`JWT required`**.

### `POST /disputes`

**Body:**

| Field | Type | Required |
|-------|------|----------|
| `rentalId` | UUID | Yes |
| `subject` | string | Yes |
| `description` | string | Yes |

**Example**

```json
{
  "rentalId": "77777777-7777-4777-8777-777777777777",
  "subject": "Equipment damage disagreement",
  "description": "Renter reports crack in casing after return."
}
```

**Response 200** — `Dispute` (`status: "open"`).

**404** — If not a participant, rental pending, etc. (service masks some cases as 404).

---

### `POST /disputes/:id/evidence/sas`

**Body:** `{ "extension": "jpg" }` — raiser only.

**Response 200** — `{ "uploadUrl", "blobPath" }`.

---

### `POST /disputes/:id/evidence`

**Body:**

| Field | Type | Required |
|-------|------|----------|
| `blobPath` | string | Yes |
| `description` | string | No |

**Response 200** — `DisputeEvidence`.

---

### `POST /disputes/:id/resolve`

| | |
|---|---|
| **Auth** | **JWT + `platform_admin`** |
| **Body** | `status`: `resolved` \| `rejected`; `resolutionNotes`: string |

**Example**

```json
{
  "status": "resolved",
  "resolutionNotes": "Deposit split 50/50 per policy."
}
```

**Response 200** — Updated `Dispute`.

**403** — Non-admin.

---

## Domain: Reviews

All routes: **`JWT required`** (class-scoped guard).

### `POST /reviews`

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rentalId` | UUID | Yes | |
| `rating` | number | Yes | 1–5 (DB `tinyint`) |
| `comment` | string | No | |

**Example**

```json
{
  "rentalId": "77777777-7777-4777-8777-777777777777",
  "rating": 5,
  "comment": "Great equipment and pickup experience."
}
```

**Description** — Renter-side only (must be member of renter business). Rental must be **`completed`**. Upserts if reviewer already reviewed this rental.

**Response 200** — `Review`:

```json
{
  "id": "99999999-9999-4999-8999-999999999999",
  "rentalId": "77777777-7777-4777-8777-777777777777",
  "reviewerUserId": "11111111-1111-4111-8111-111111111111",
  "rating": 5,
  "comment": "Great equipment and pickup experience.",
  "createdAt": "2026-05-03T12:00:00.000Z",
  "updatedAt": "2026-05-03T12:00:00.000Z"
}
```

---

### `GET /reviews/rental/:rentalId`

**Description** — Lists reviews for a rental (still requires JWT because the controller is guarded).

**Response 200** — `Review[]`.

---

## Frontend flow guides

### 1) Fetch all tools

1. Obtain Entra access token; optionally call `GET /users/me` to provision the user.
2. Call **`GET /equipment`** with `Authorization: Bearer …` and optional `page`, `limit`, `businessId`, `minPrice`, `maxPrice`.
3. Use `data` for the current page; `total` with `limit` for pagination UI.

For a single listing, use **`GET /equipment/:id`** (full entity + nested `business`).

### 2) View tool details

1. Obtain Entra access token; ensure user exists via `GET /users/me`.
2. `GET /equipment/{id}` with `Authorization` header.
3. Render `title`, `description`, `dailyRateCents`, `currency`, `listingStatus`, `images[].blobPath`, and supplier info from `business`.

### 3) Create listing (supplier)

1. `POST /businesses` (or reuse existing business); note `verificationStatus` may need to be **`verified`** server-side for renters to book.
2. `POST /equipment` with `businessId`, rates, etc. (creates **`draft`**).
3. Optional images: `POST /equipment/{id}/images/sas?extension=jpg` → upload to `uploadUrl` → `POST /equipment/{id}/images` with `blobPath`.
4. `PATCH /equipment/{id}` with `{ "listingStatus": "active" }` to go live.

### 4) Start rental

1. Renter business must exist; user must be a member (`POST /businesses`, `GET /businesses/mine`).
2. `POST /rentals` with `equipmentId`, `renterBusinessId`, `startAt`, `endAt`. (Deposit amounts are configured when creating Stripe intents, not on this call.)
3. Response includes `id`, `status: "pending"`, `totalAmountCents`.

### 5) Pay with Stripe (Payment Intents — not Checkout)

1. `POST /payments/rentals/{rentalId}/intents` with optional `{ "depositAmountCents": … }`.
2. Use **Stripe.js** `stripe.confirmCardPayment(rentalPayment.clientSecret, …)` (and similarly for deposit if returned).
3. **`deposit`** uses manual capture flow; webhook events update **`deposits`** / **`payments`** and may call `markConfirmed` when main + deposit rules satisfied.
4. Poll or subscribe: `GET /rentals/{id}` until `status` becomes **`confirmed`** (and `deliveries` stub may appear).

### 6) Payment success

- **Client:** Stripe confirms payment; `payment_intent.succeeded` fires on Stripe’s side.
- **Server:** `POST /payments/webhook/stripe` validates signature and updates rows; rental may move to **`confirmed`**.
- **Frontend:** After `confirmCardPayment` resolves, still verify **`GET /rentals/:id`** for authoritative `status` and nested `payments` / `deposits`.

### 7) Complete rental (supplier)

1. Platform admin may call `POST /rentals/{id}/activate` to transition **`confirmed` → `active`**.
2. Supplier manager: `POST /rentals/{id}/complete` when **`active`**.

---

## Quick index (method + path)

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/users/me` |
| POST | `/businesses` |
| GET | `/businesses/mine` |
| GET | `/businesses/:id` |
| POST | `/businesses/:id/members` |
| GET | `/equipment` |
| POST | `/equipment` |
| GET | `/equipment/:id` |
| PATCH | `/equipment/:id` |
| DELETE | `/equipment/:id` |
| POST | `/equipment/:id/images/sas` |
| POST | `/equipment/:id/images` |
| POST | `/rentals` |
| GET | `/rentals/:id` |
| POST | `/rentals/:id/complete` |
| POST | `/rentals/:id/cancel` |
| POST | `/rentals/:id/activate` |
| POST | `/rentals/:rentalId/conditions` |
| POST | `/rentals/:rentalId/conditions/images/sas` |
| POST | `/rentals/:rentalId/conditions/images` |
| POST | `/payments/rentals/:rentalId/intents` |
| POST | `/payments/rentals/:rentalId/settle` |
| POST | `/payments/webhook/stripe` |
| GET | `/deliveries/rental/:rentalId` |
| PATCH | `/deliveries/:id/status` |
| POST | `/deliveries/:id/proof/sas` |
| POST | `/deliveries/:id/proof` |
| POST | `/disputes` |
| POST | `/disputes/:id/evidence/sas` |
| POST | `/disputes/:id/evidence` |
| POST | `/disputes/:id/resolve` |
| POST | `/reviews` |
| GET | `/reviews/rental/:rentalId` |

---

*Generated from repository source: controllers, DTOs, entities, and global guards as of the documented revision.*
