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

  /* ---------- enquiry form ---------- */
  const form = document.getElementById("leadForm");
  const success = document.getElementById("formSuccess");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    // lightweight inline validation
    let valid = true;
    form.querySelectorAll("input[required], select[required]").forEach((field) => {
      const bad = !field.checkValidity();
      field.classList.toggle("error", bad);
      if (bad) valid = false;
    });
    if (!valid) {
      form.querySelector(".error")?.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    success.style.display = "block";
    success.textContent =
      "Thanks, " + data.name + ". Your " + data.category.toLowerCase() +
      " enquiry has been prepared. This demo does not transmit or store your details yet — connect a secure backend or CRM before accepting live enquiries.";
    form.reset();
    success.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // clear error styling as the user types
  form?.querySelectorAll("input, select").forEach((field) =>
    field.addEventListener("input", () => field.classList.remove("error"))
  );

  /* ---------- footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
