# REST API overview

All routes except `GET /health` and `POST /payments/webhook/stripe` expect `Authorization: Bearer <JWT>`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/users/me` | Current user profile (sync from B2C) |
| POST | `/businesses` | Create business (caller becomes owner) |
| GET | `/businesses/mine` | List caller’s businesses |
| GET | `/businesses/:id` | Business detail (member) |
| POST | `/businesses/:id/members` | Add/update member role |
| POST | `/equipment` | Create listing |
| GET | `/equipment/:id` | Public-style listing with images |
| PATCH | `/equipment/:id` | Update listing |
| DELETE | `/equipment/:id` | Soft-delete listing |
| POST | `/equipment/:id/images/sas` | SAS URL for image upload |
| POST | `/equipment/:id/images` | Register image blob path |
| POST | `/rentals` | Create rental (`pending`) |
| GET | `/rentals/:id` | Rental detail (renter or supplier) |
| POST | `/rentals/:id/complete` | Complete rental (supplier manager+) |
| POST | `/rentals/:id/cancel` | Cancel (`renter` or `supplier` side) |
| POST | `/rentals/:id/activate` | Mark `active` (platform admin JWT; or call from an internal worker) |
| POST | `/rentals/:rentalId/conditions` | Upsert before/after inspection |
| POST | `/rentals/:rentalId/conditions/images/sas` | SAS for condition photo |
| POST | `/rentals/:rentalId/conditions/images` | Register condition image |
| POST | `/payments/rentals/:rentalId/intents` | Create Stripe PaymentIntents (rent + deposit) |
| POST | `/payments/rentals/:rentalId/settle` | After completion: capture/cancel holds |
| POST | `/payments/webhook/stripe` | Stripe webhook (signature verified) |
| GET | `/deliveries/rental/:rentalId` | List deliveries for rental |
| PATCH | `/deliveries/:id/status` | Update delivery status |
| POST | `/deliveries/:id/proof/sas` | SAS for proof-of-delivery image |
| POST | `/deliveries/:id/proof` | Attach proof blob path |
| POST | `/disputes` | Open dispute |
| POST | `/disputes/:id/evidence/sas` | SAS for evidence |
| POST | `/disputes/:id/evidence` | Register evidence file |
| POST | `/disputes/:id/resolve` | Admin resolve/reject |
| POST | `/reviews` | Create/update renter review |
| GET | `/reviews/rental/:rentalId` | List reviews |

## Rental lifecycle (API-level)

1. `POST /rentals` → `pending`.
2. `POST /payments/rentals/:id/intents` → Stripe client confirms payment; webhook moves rental to `confirmed` when **main payment succeeded** and any **deposit authorization is held** (`requires_capture`).
3. `POST /rentals/:id/activate` (or scheduler) → `active` when pickup/start rules are satisfied.
4. `POST /rentals/:id/complete` → `completed`; then `POST /payments/rentals/:id/settle` to capture/releasedeposit.
