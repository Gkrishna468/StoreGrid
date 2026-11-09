STOREGRID FIX — APPLY TO THE EXISTING REPOSITORY

1. In index.html, apply the exact checkbox correction in FIX-IN-INDEX.html.txt.
2. Replace the repository's admin.js with this ZIP's admin.js.
3. Append the contents of admin-details.css.txt to the END of admin.css.
4. Do not replace script.js or change the website design. Your current script.js already sends the consent field as "yes" when the checkbox is correctly named.
5. Commit all three changes to the StoreGrid repository's main branch and wait for Vercel to show Ready.
6. Open the public website and hard-refresh with Ctrl+Shift+R. Submit one test enquiry.
7. Open /admin.html, sign in, and refresh. Expand "View complete enquiry" to see all submitted fields.

The existing api/enquiries.js inserts all submitted enquiry fields into Supabase. The existing api/admin/enquiries.js uses select=* and returns all columns to the authenticated admin. The updated admin.js displays those columns in an expandable detail section.

Do not expose Supabase service-role/secret keys in browser files. Keep the single-admin server-side authorization in place.
