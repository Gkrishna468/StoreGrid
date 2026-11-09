# StoreGrid secure enquiry integration

This package is for **Gkrishna468/StoreGrid only**. It does not contain or modify HireNestOS.

## Included

- `api/enquiries.js`: validates and stores enquiries server-side, applies database-backed rate limiting, and sends a best-effort Resend notification.
- `api/admin/enquiries.js`: server-side admin API. It validates the Supabase access token and exact administrator email before reading/updating enquiries.
- `admin.html`, `admin.css`, `admin.js`: private OTP-login dashboard with search, status filter and status updates.
- `supabase/schema.sql`: database-backed rate-limit table and RPC function. It leaves the existing enquiry table and denial policies in place.
- `vercel.json`: baseline security headers.
- `apply-storegrid-patch.mjs`: safely patches the current enquiry form and front-end submit handler.

## Apply to the repository

1. Extract this package into a temporary folder.
2. Copy its `api/`, `admin.html`, `admin.css`, `admin.js`, `supabase/`, `vercel.json` and `.env.example` into the **root of the StoreGrid repository**. Merge folders if prompted; do not overwrite the existing `index.html`, `script.js` or `styles.css` with files from this package (none are included).
3. From the StoreGrid repository root, run `node apply-storegrid-patch.mjs` (copy this script to the root first). It updates the existing `index.html` and `script.js` while preserving the rest of the design.
4. Run the SQL in `supabase/schema.sql` in the StoreGrid Supabase SQL Editor.
5. Configure the environment variables below in the StoreGrid Vercel project, for Production, Preview and Development as appropriate.
6. Deploy StoreGrid and test the form and `/admin.html`.

## Vercel environment variables

Set these directly in Vercel. **Never paste the service-role key into chat or commit it to GitHub.**

- `SUPABASE_URL`: `https://qziqopbavffhwtbatgxp.supabase.co`
- `SUPABASE_ANON_KEY`: the Supabase publishable key already provided by the owner
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Project Settings → API Keys → secret/service_role key
- `ADMIN_EMAIL`: `gopalkrishna.sv46@gmail.com`
- `NOTIFY_EMAIL`: `gopalkrishna.sv46@gmail.com`
- `RESEND_API_KEY`: from the Resend dashboard
- `MAIL_FROM`: a sender address on a domain verified in Resend, e.g. `StoreGrid <enquiries@yourdomain.com>`
- `RATE_LIMIT_SECRET`: a long random secret (at least 32 random bytes)

Do not set the service-role key as a `NEXT_PUBLIC_` variable or put it in `admin.js`.

## Supabase Auth settings

- Enable Email OTP / magic-link sign-in.
- Disable public sign-ups if the project is intended only for the pre-created administrator account.
- Ensure `gopalkrishna.sv46@gmail.com` exists as an Auth user (invite/create it in Supabase Auth first).
- Add the deployed StoreGrid origin and `https://YOUR-STOREGRID-DOMAIN/admin.html` to Auth URL Configuration → Redirect URLs.
- The API independently checks the authenticated email against `ADMIN_EMAIL`; the browser-side email check is only a convenience, not the security boundary.

## Resend setup

Verify the sending domain in Resend, then set `MAIL_FROM` to an address on that verified domain. Enquiry storage succeeds even if email delivery is temporarily unavailable; the API response reports the notification state.

## Test checklist

1. Submit a valid enquiry with consent; expect HTTP 201 and one row in `storegrid_enquiries`.
2. Check the notification email.
3. Open `/admin.html`, request the magic link, and sign in as the authorised email.
4. Confirm the dashboard lists the enquiry and status changes persist.
5. Sign out; `/api/admin/enquiries` without a valid bearer token must return 401.
6. Verify anonymous direct `SELECT` remains denied by RLS.

The dashboard is not a substitute for a full security review. Before broad public launch, add monitoring/alerting, data-retention rules and a privacy notice, and test the deployed configuration.
