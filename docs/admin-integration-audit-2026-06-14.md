# MIO Beauty Admin Integration Audit

Date: 2026-06-14

## Executive status

Production is **degraded and not fully approved**.

The application build and route checks pass, but the live Supabase schema is behind the repository migrations. A critical production security issue was confirmed: the anon role can read live `orders` and `order_items`.

The repair migration is prepared at:

`supabase/migrations/20260614000000_admin_integration_repair.sql`

It has not been applied to production because no downloadable database administration credential or authenticated admin session was available during the audit.

## Working modules

- Products CRUD: current and legacy optional product columns are supported.
- Product XLSX import/export: code paths compile and validate SKU/category mapping.
- Product image import: SKU matching, optimization, storage upload, and product image assignment are connected.
- Categories CRUD: uses the live category fields successfully.
- Brands CRUD: live table and required fields exist.
- Cart and checkout UI: cart state reaches `/api/checkout`.
- Orders and order items: live legacy schema is supported by the admin order screen and checkout fallback.
- Order status changes: supported for modern and legacy schemas.
- TTN: Excel and printable PDF generation are connected; unauthenticated API access is correctly rejected.
- Banners: live table has required fields, two records are visible, admin CRUD and homepage rendering use the same table.
- Product detail gallery: `product_images` relation is queried with a safe primary-image fallback.
- Reviews storefront: modern and legacy review schemas are now supported.
- Review moderation: modern and legacy admin CRUD/moderation are now supported.
- Dashboard: product, order, customer, and revenue statistics now read complete real datasets with modern/legacy order fallback.
- Navigation: every current menu href has a corresponding page and enters the admin auth flow.
- Security keys: the service-role key remains server-only and is not exposed through `NEXT_PUBLIC_*`.

## Broken or incomplete modules

- Video Highlights: `video_highlights` does not exist in the live Supabase REST schema. Admin CRUD cannot work and homepage rendering is empty.
- Payment status changes: UI support is fixed, but production lacks `orders.payment_status`; the repair migration is required.
- Customer history: production has an orders-to-customers FK, but existing orders were not linked by checkout. New checkout synchronization is fixed in code; historical records still require a database backfill.
- Customers: live anon-visible count is zero while seven orders exist, confirming checkout/customer synchronization was previously disconnected.
- Product/category relation: `products.category_id` exists, but the live PostgREST relationship probe failed. The repair migration adds a non-destructive FK for future writes.
- Product/brand relation: products store brand as text; there is no `brand_id` FK. Existing filtering works, but referential integrity is not enforced.
- Archive orders, cancelled orders, returns, finance pages, prices, services, comments, surveys, leads, report builder, and reports are placeholder screens, not integrated modules.
- Warehouse labels currently route to unrelated existing pages:
  - Закупки -> Products
  - Инвентаризации -> Categories
  - Списания -> Brands
  - Остатки -> Import Images
- `Торговый маркетинг` and `Оборудование` do not exist as top-level navigation modules. The current menu uses `Маркетинг`.

## Live database audit

Confirmed live row counts visible to the anon role:

| Table | Result |
| --- | --- |
| products | 29 |
| categories | 4 |
| brands | 4 |
| banners | 2 |
| orders | 7 |
| order_items | 6 |
| customers | 0 visible |
| reviews | 0 visible |
| product_images | 0 visible |
| video_highlights | missing |

Confirmed live schema drift:

- `products` missing: `usage_ru`, `usage_uz`, `ingredients_ru`, `ingredients_uz`
- `orders` missing modern fields: `order_number`, `customer_phone`, `customer_city`, `customer_address`, `customer_comment`, `payment_status`, `order_status`, `subtotal`, `delivery_price`, `total`
- `order_items` missing: `product_sku`, `product_image`, `price`
- `reviews` missing: `comment`, `active`; legacy `text`, `status` exist
- `product_images` missing: `image_url`, `url`, `path`, `active`
- `video_highlights`: table missing

Confirmed relations:

- `order_items.order_id` -> `orders.id`
- `order_items.product_id` -> `products.id`
- `reviews.product_id` -> `products.id`
- `orders.customer_id` -> `customers.id`

Missing/unconfirmed relation:

- `products.category_id` -> `categories.id`

## Security audit

Critical finding:

- The anon key can read all live orders and order items. This exposes commerce records outside the intended admin boundary.

Prepared fix:

- Enable RLS on commerce/customer tables.
- Revoke all anon privileges from `orders`, `order_items`, and `customers`.
- Preserve authenticated admin access through existing `public.is_admin()` RLS policies.
- Checkout remains functional because it uses the server-only service role.

No RLS policy was disabled or weakened by the code changes.

## Fixes applied in the workspace

- Correct dashboard order count and revenue aggregation.
- Add modern payment-status updates.
- Synchronize customer records after checkout.
- Populate `orders.customer_id` after customer synchronization.
- Add modern/legacy storefront review fallback.
- Add modern/legacy review moderation adapters.
- Repair the master schema route so existing legacy tables receive missing columns.
- Add a dedicated idempotent integration repair migration.
- Add customer and category FK repair.
- Add explicit anon privilege revocation for commerce/customer records.

## Build and route verification

Passed:

- ESLint
- TypeScript
- Next.js production build: 51 routes generated
- Public routes: `/`, `/cart`, `/checkout`, `/favorites`, `/profile`, `/b2b`
- Catalog routes: `/catalog/products`, `/catalog/categories`
- Real product route: HTTP 200
- Real category route: HTTP 200
- All current admin menu routes: expected HTTP 307 to login without a session
- Admin session API: HTTP 401 without credentials
- TTN API: HTTP 401 without credentials
- Schema repair API: HTTP 401 without credentials
- Invalid checkout request: HTTP 400
- Local production server: no 500 responses or crash logs
- Current production domain routes: HTTP 200/307 as expected

Not confirmed:

- Browser console errors, hydration warnings, and chunk-loading behavior. The in-app browser failed to initialize in the local Windows sandbox.
- Authenticated admin write operations against production were not executed to avoid changing live data.
- TTN generation with a real authenticated order was not executed.

## Required production actions

1. Apply `supabase/migrations/20260614000000_admin_integration_repair.sql`.
2. Re-run the anon probes and confirm `orders`, `order_items`, and `customers` are no longer readable.
3. Confirm `video_highlights` and its storage buckets exist.
4. Confirm modern order/payment columns exist.
5. Backfill historical customer links and aggregates if required.
6. Run authenticated smoke tests for product CRUD, review moderation, payment status, banner CRUD, video CRUD, and TTN.
7. Re-run browser console/hydration checks.

## Final production status

**Not ready for final approval.**

Application code and build checks pass. Production database migration and security verification remain mandatory. No commit or push was performed because the requested condition, “only after all tests pass,” has not yet been satisfied.
