/* ============================================================
   StoreGrid — interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---------- sticky header state ---------- */
  const header = document.getElementById("siteHeader");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  menuButton?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "×" : "☰";
  });
  nav?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton?.setAttribute("aria-expanded", "false");
      if (menuButton) menuButton.textContent = "☰";
    })
  );

  /* ---------- reveal-on-scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- animated counters ---------- */
  const formatIN = (n) => n.toLocaleString("en-IN");
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        counterObserver.unobserve(el);
        const target = parseInt(el.dataset.count, 10);
        const duration = 1600;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = formatIN(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".counter").forEach((el) => counterObserver.observe(el));

  /* ---------- active nav link highlight ---------- */
  const sections = ["solutions", "how", "why", "pricing", "partners"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const navLinks = [...document.querySelectorAll(".nav a")];
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id)
        );
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector(".faq-q");
    const panel = item.querySelector(".faq-a");
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((other) => {
        other.classList.remove("open");
        other.querySelector(".faq-a").style.maxHeight = null;
        other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        panel.style.maxHeight = panel.scrollHeight + "px";
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- preselect enquiry category from card links ---------- */
  document.querySelectorAll("[data-category]").forEach((link) =>
    link.addEventListener("click", () => {
      const select = document.getElementById("category");
      if (select) select.value = link.dataset.category;
    })
  );

  /* ---------- live enquiry form submission ---------- */
  const form = document.getElementById("leadForm");
  const success = document.getElementById("formSuccess");
  const submitButton = form?.querySelector('button[type="submit"]');

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    let valid = true;
    form.querySelectorAll("input[required], select[required]").forEach((field) => {
      const bad = !field.checkValidity();
      field.classList.toggle("error", bad);
      if (bad) valid = false;
    });

    if (!valid) {
      form.querySelector(".error")?.focus();
      success.style.display = "block";
      success.textContent = "Please check the required fields and try again.";
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      area: String(formData.get("area") || "").trim(),
      duration: String(formData.get("duration") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      consent: formData.get("consent") === "yes",
      website: String(formData.get("website") || "").trim()
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.innerHTML;
      submitButton.textContent = "Submitting...";
    }
    success.style.display = "block";
    success.textContent = "Submitting your enquiry securely...";

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !(result.ok === true || result.success === true)) {
        throw new Error(result.error || "We couldn't submit your enquiry. Please try again.");
      }

      const customerName = payload.name;
      form.reset();
      success.textContent =
        `Thank you, ${customerName}. Your enquiry has been received. Our team will contact you soon.`;
      success.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      success.textContent = error.message || "Submission failed. Please try again.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = submitButton.dataset.originalText || "Submit enquiry";
      }
    }
  });

  // Clear error styling as the user edits fields.
  form?.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => field.classList.remove("error"));
    field.addEventListener("change", () => field.classList.remove("error"));
  });

  /* ---------- footer year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
