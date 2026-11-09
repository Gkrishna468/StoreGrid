import fs from 'node:fs';

const indexPath = 'index.html';
const scriptPath = 'script.js';
if (!fs.existsSync(indexPath) || !fs.existsSync(scriptPath)) {
  console.error('Run this script from the root of the StoreGrid repository.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');
let js = fs.readFileSync(scriptPath, 'utf8');

const oldConsent = '<label class="consent"><input type="checkbox" required>';
const newConsent = '<label class="consent"><input type="checkbox" name="consent" value="yes" required>';
if (html.includes(oldConsent)) html = html.replace(oldConsent, newConsent);
else if (!html.includes('name="consent"')) throw new Error('Could not locate the enquiry consent checkbox; no index.html changes written.');

const oldDisclaimer = 'Demo website: submissions are not sent to a live database yet. Connect a business email, CRM or backend before publishing.';
const newDisclaimer = 'Your details are submitted securely to StoreGrid for enquiry follow-up. No payment is collected on this website.';
if (html.includes(oldDisclaimer)) html = html.replace(oldDisclaimer, newDisclaimer);

const submitButton = '<button class="button button-dark form-submit" type="submit">Submit enquiry <span>↗</span></button>';
if (html.includes(submitButton) && !html.includes('name="company_website"')) {
  html = html.replace(submitButton, '<div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden"><label>Leave this field empty<input name="company_website" tabindex="-1" autocomplete="off"></label></div>\n        ' + submitButton);
}

const start = js.indexOf('  /* ---------- enquiry form ---------- */');
const end = js.indexOf('  // clear error styling as the user types', start);
if (start < 0 || end < 0) throw new Error('Could not locate the existing form handler; no script.js changes written.');
const replacement = `  /* ---------- live enquiry form ---------- */
  const form = document.getElementById("leadForm");
  const success = document.getElementById("formSuccess");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll("input[required], select[required]").forEach((field) => {
      const bad = !field.checkValidity();
      field.classList.toggle("error", bad);
      if (bad) valid = false;
    });
    if (!valid) { form.querySelector(".error")?.focus(); return; }

    const values = new FormData(form);
    const payload = {
      name: String(values.get("name") || "").trim(),
      phone: String(values.get("phone") || "").trim(),
      email: String(values.get("email") || "").trim(),
      category: String(values.get("category") || "").trim(),
      area: String(values.get("area") || "").trim(),
      duration: String(values.get("duration") || "").trim(),
      message: String(values.get("message") || "").trim(),
      consent: values.get("consent") === "yes",
      company_website: String(values.get("company_website") || "")
    };
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "Submitting…";
    success.style.display = "block";
    success.textContent = "Sending your enquiry securely…";
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not submit your enquiry. Please try again.");
      success.textContent = "Thank you, " + payload.name + ". Your enquiry has been received. Our StoreGrid team will contact you.";
      form.reset();
    } catch (error) {
      success.textContent = error.message || "Something went wrong. Please try again.";
      success.style.background = "#fdf0ed";
      success.style.color = "#8b3428";
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Submit enquiry <span>↗</span>';
    }
    success.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

`;
js = js.slice(0, start) + replacement + js.slice(end);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(scriptPath, js);
console.log('Patched index.html and script.js. Copy the api/, admin.html, admin.css, admin.js, supabase/, vercel.json and .env.example files from this package into the repository root.');
