# MIO Beauty Production Security Report

Date: 2026-06-12

## Fixes applied

- Replaced the spoofable `mio-admin-auth=1` admin cookie with a server-issued, signed, HttpOnly `mio-admin-session` cookie.
- Added server admin auth endpoints for login, logout, and session verification.
- Added proxy-level admin route enforcement for `/admin` and `/admin/*`.
- Added admin login rate limiting: 3 attempts per 15 minutes per client IP.
- Added checkout rate limiting: 5 requests per 10 minutes per client IP.
- Hardened checkout request validation: JSON-only payloads, payload-size cap, unknown-field rejection, phone-format validation, text sanitization, duplicate-order dampening, and server-side price/product/stock validation.
- Removed sensitive checkout log disclosure for service-role key presence.
- Added production security headers: CSP, HSTS, frame deny, content-type sniffing protection, referrer policy, permissions policy, COOP, and CORP.
- Added `security_audit_logs` migration and owner-only RLS policies for security log visibility.
- Tightened admin access to active `owner` and `admin` rows only.
- Kept the customer storefront public: homepage, catalog, product pages, cart, favorites, and guest checkout are not behind the admin gate.
- Changed admin-user management RLS so only `owner` can create, delete, or change admin users.
- Added an owner-only admin Security page for audit-event review.

## Vulnerabilities found

- Admin access relied on a client-writable cookie in `src/proxy.ts`; any browser could set that cookie and reach protected routes.
- Admin login authorization was verified in client code before this pass.
- Checkout accepted arbitrary JSON fields and had no API-level rate limit.
- Checkout logs exposed whether the service role key was configured.
- Security audit logging was not available as an application table.

## Remaining risks

- Some admin CRUD screens still perform Supabase writes from client components. RLS now provides the real authorization boundary, but the next enterprise step should move these writes behind `/app/api/admin/*` controllers that call `requireAdmin()`.
- MFA enforcement is not fully implemented because Supabase MFA enrollment state must be confirmed against the deployed Auth configuration.
- Turnstile is not wired yet. Add `TURNSTILE_SECRET_KEY` and enforce tokens on login, checkout, reviews, and contact forms before public launch.
- CSP still permits inline/eval script execution for Next.js runtime compatibility. Move to nonce-based CSP after the app is tested under production rendering.
- In-memory rate limiting is per server instance. Use Redis, Upstash, Vercel KV, or Cloudflare WAF rules for distributed production enforcement.

## Required Supabase settings

- Disable public signups in Supabase Auth.
- Create the first owner manually for `admin@miobeauty.shop` in `auth.users`, then add a matching active `admin_users` row with `role = 'owner'`.
- Apply all migrations in `supabase/migrations`, including `20260612002000_enterprise_security_hardening.sql` and `20260612003000_public_shop_admin_lockdown.sql`.
- Verify RLS is enabled on `admin_users`, `products`, `categories`, `banners`, `video_highlights`, `reviews`, `orders`, `order_items`, `site_settings`, and `security_audit_logs`.
- Confirm storage buckets only allow public reads for intended public assets and admin-only writes.

## Required Vercel settings

- Set `ADMIN_SESSION_SECRET` to a strong random value.
- Set `SUPABASE_SERVICE_ROLE_KEY` only as a server-side environment variable.
- Keep only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` public.
- Configure deployment checks to run `npm run build`.

## Required Cloudflare settings

- Enable Turnstile and add site keys to the app.
- Add WAF/rate-limit rules for login, admin APIs, checkout, reviews, and search.
- Enforce HTTPS and keep HSTS enabled.
