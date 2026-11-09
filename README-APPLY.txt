# StoreGrid live enquiry integration patch

## Files
- `api/enquiries.js`: public POST endpoint; validates and saves enquiries in Supabase.
- `api/admin/enquiries.js`: lowercase-path copy of the admin API; verifies confirmed admin email.
- `script.js`: preserves existing website interactions and submits the enquiry form to `/api/enquiries`.

## Apply to the repository
1. Copy `api/enquiries.js` into the repository at `api/enquiries.js`.
2. Copy `api/admin/enquiries.js` into the repository at `api/admin/enquiries.js`.
3. Replace the repository's `script.js` with this `script.js`.
4. Delete the old capital-A path `Api/admin/enquiries.js` after confirming the lowercase copy exists.
5. In `index.html`, update the consent checkbox to:
   `<label class="consent"><input type="checkbox" name="consent" value="yes" required> <span>I agree to be contacted about this enquiry and understand this is a pre-launch interest form.</span></label>`
6. Add this honeypot field immediately before the consent label:
   `<label class="website-field" aria-hidden="true">Leave this field empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label>`
   Add this CSS to `styles.css` to hide it accessibly:
   `.website-field{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important;}`
7. Replace the old demo disclaimer with:
   `<p class="form-disclaimer">Your enquiry is submitted securely. Our team will contact you using the details provided.</p>`
8. Commit to `main` and wait for Vercel deployment.

## Vercel environment variables
Already configured:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`

For email notifications, add these server-only variables:
- `RESEND_API_KEY`
- `MAIL_FROM` (a sender address on a domain verified with Resend)
- `NOTIFY_EMAIL` (your notification recipient; can be the admin email)

If email variables are not configured, enquiries are still saved; API returns `emailNotification: "not_configured"`.
Email failures do not undo saved enquiries.

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in browser code.
