/* main.js — Joseph Amani Muhombo */

document.documentElement.classList.add("js");

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // =========================
  // NAV (Hamburger) + A11y
  // =========================
  const toggle = $(".nav-toggle");
  const menu = $("#navMenu");
  const navLinks = menu ? $$(".nav-links a", menu) : [];
  const DESKTOP_BREAKPOINT = 720;

  const bodyScroll = {
    lock() { document.body.style.overflow = "hidden"; },
    unlock() { document.body.style.overflow = ""; },
  };

  let lastFocusedEl = null;

  const getFocusable = (rootEl) =>
    $$(
      `a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]),
       select:not([disabled]), [tabindex]:not([tabindex="-1"])`,
      rootEl
    ).filter((el) => el.offsetParent !== null);

  const setOpen = (open) => {
    if (!toggle || !menu) return;

    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    menu.classList.toggle("is-open", open);

    if (open) {
      lastFocusedEl = document.activeElement;
      bodyScroll.lock();
      requestAnimationFrame(() => navLinks[0]?.focus?.());
    } else {
      bodyScroll.unlock();
      (lastFocusedEl && lastFocusedEl.focus) ? lastFocusedEl.focus() : toggle.focus();
      lastFocusedEl = null;
    }
  };

  const isOpen = () => toggle?.getAttribute("aria-expanded") === "true";

  if (toggle && menu) {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", () => setOpen(!isOpen()));

    document.addEventListener("click", (e) => {
      if (!isOpen()) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;

      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      if (e.key === "Tab") {
        const focusables = getFocusable(menu);
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    menu.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) setOpen(false);
    });

    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > DESKTOP_BREAKPOINT && isOpen()) setOpen(false);
      },
      { passive: true }
    );

    window.addEventListener("hashchange", () => {
      if (isOpen()) setOpen(false);
    });

    const path = location.pathname.split("/").pop() || "index.html";
    navLinks.forEach((a) => {
      const href = (a.getAttribute("href") || "").split("#")[0];
      if (href === path) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  // =========================
  // Reveal on scroll
  // =========================
  const revealEls = $$(".reveal");
  if (revealEls.length) {
    if (prefersReduced) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }
  }

  // =========================
  // Back to Top
  // =========================
  let backToTopBtn = $(".back-to-top");
  if (!backToTopBtn) {
    backToTopBtn = document.createElement("button");
    backToTopBtn.className = "back-to-top";
    backToTopBtn.type = "button";
    backToTopBtn.setAttribute("aria-label", "Retour en haut");
    backToTopBtn.innerHTML = "↑";
    document.body.appendChild(backToTopBtn);
  }

  const updateBackToTop = () => {
    backToTopBtn.classList.toggle("is-visible", window.scrollY > 350);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateBackToTop();
      ticking = false;
    });
  };

  updateBackToTop();
  window.addEventListener("scroll", onScroll, { passive: true });

  backToTopBtn.addEventListener("click", () => {
    if (prefersReduced) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // =========================
  // Contact form (FormSubmit compatible)
  // =========================
  const form = $("#contactForm");
  const statusEl = $("#formStatus");
  const DRAFT_KEY = "portfolio_contact_draft_v1";

  const setStatus = (msg, type = "info") => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.dataset.type = type;
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Si on revient sur la page après _next (contact.html), on nettoie le draft
  // (évite que l'ancien message reste sauvegardé)
  try {
    if (location.pathname.endsWith("contact.html")) {
      // Nettoyage simple (pas intrusif)
      // Tu peux commenter ces 2 lignes si tu veux garder le draft même après envoi
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch {}

  if (form && statusEl) {
    const nomEl = $("#nom", form);
    const emailEl = $("#email", form);
    const sujetEl = $("#sujet", form);
    const messageEl = $("#message", form);

    const loadDraft = () => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (nomEl && d.nom) nomEl.value = d.nom;
        if (emailEl && d.email) emailEl.value = d.email;
        if (sujetEl && d.sujet) sujetEl.value = d.sujet;
        if (messageEl && d.message) messageEl.value = d.message;
      } catch {}
    };

    const saveDraft = () => {
      try {
        const draft = {
          nom: nomEl?.value?.trim() || "",
          email: emailEl?.value?.trim() || "",
          sujet: sujetEl?.value?.trim() || "",
          message: messageEl?.value?.trim() || "",
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {}
    };

    loadDraft();

    const liveCheck = () => {
      const nom = nomEl?.value?.trim() || "";
      const email = emailEl?.value?.trim() || "";
      const sujet = sujetEl?.value?.trim() || "";
      const message = messageEl?.value?.trim() || "";

      if (!nom || !email || !sujet || !message) {
        setStatus("Remplissez tous les champs pour envoyer.", "info");
        return false;
      }
      if (!validateEmail(email)) {
        setStatus("Email invalide : vérifiez le format.", "error");
        return false;
      }
      setStatus("Formulaire prêt ✅", "success");
      return true;
    };

    ["input", "change"].forEach((evt) => {
      form.addEventListener(evt, () => {
        saveDraft();
        liveCheck();
      });
    });

    form.addEventListener("submit", (e) => {
      const ok = liveCheck();

      // ❌ Si invalide → on bloque l’envoi
      if (!ok) {
        e.preventDefault();
        return;
      }

      // ✅ Si valide → on laisse FormSubmit envoyer réellement
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.85";
      }

      setStatus("Envoi en cours... (vérifiez ensuite votre boîte mail) ⏳", "info");

      // On garde le draft au cas où l'utilisateur revient en arrière,
      // mais tu peux le supprimer ici si tu préfères :
      // localStorage.removeItem(DRAFT_KEY);
    });

    liveCheck();
  }
})();