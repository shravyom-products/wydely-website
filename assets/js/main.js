/**
 * Wydely — main.js
 *
 * Modules:
 *  1. DOM helpers
 *  2. Navbar (scroll + smooth-scroll)
 *  3. GSAP + ScrollTrigger animations (fade, slide, stagger — reverse on scroll-up)
 *  4. Counter animation (Intersection Observer, re-triggers on re-entry)
 *  5. Swiper carousel (autoplay, loop, responsive, pause-on-hover)
 *  6. "Book a Demo" modal form validation
 *  7. Modal reset on close
 *  8. Footer year
 */

'use strict';

/* ─── 1. DOM HELPERS ───────────────────────────────────────── */

/**
 * Shorthand for document.querySelector.
 * @param {string} sel  CSS selector
 * @param {Element|Document} [ctx=document]
 * @returns {Element|null}
 */
const $ = (sel, ctx = document) => ctx.querySelector(sel);

/**
 * Shorthand for document.querySelectorAll (returns real Array).
 * @param {string} sel  CSS selector
 * @param {Element|Document} [ctx=document]
 * @returns {Element[]}
 */
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));


/* ─── BOOT ─────────────────────────────────────────────────── */

/**
 * All scripts are loaded with `defer`, so they execute in document order
 * before DOMContentLoaded fires — meaning Bootstrap, GSAP, ScrollTrigger,
 * and Swiper are all available when this file runs.
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFlipAnimation();
  initSwiper();
  initFormValidation();
  initModalReset();
  setCurrentYear();

  // GSAP is always available at this point (defer order), but guard anyway
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    initAnimations();
    // Refresh after Swiper has altered layout heights
    ScrollTrigger.refresh();
  } else {
    // Graceful fallback — reveal everything without animation
    $$('[data-animate]').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    initCounters(); // still run counters via IntersectionObserver
  }

  // Re-refresh on bfcache restore (e.g. browser back button)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });
});


/* ─── 2. NAVBAR ────────────────────────────────────────────── */

function initNavbar() {
  const nav = $('#mainNav');
  if (!nav) return;

  // Add/remove .scrolled class for glass effect
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 48);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load in case page starts mid-scroll

  // ── Mobile full-page menu ──
  const menuEl = $('#navbarNav');
  const toggle = $('#menuToggle');
  const closeBtn = $('#menuClose');

  const openMenu = () => {
    menuEl.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  };

  const closeMenu = () => {
    menuEl.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };

  toggle?.addEventListener('click', () => {
    menuEl.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  closeBtn?.addEventListener('click', closeMenu);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });

  // Smooth-scroll for in-page anchor links
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const target = $(href);
      if (!target) return;

      e.preventDefault();
      closeMenu();

      const offset = nav.offsetHeight + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ── Active nav-link on scroll ──
  const navLinks = $$('a.nav-link[href^="#"]');
  const sectionIds = [...new Set(navLinks.map(l => l.getAttribute('href')).filter(h => h && h !== '#'))];
  const sections = sectionIds.map(id => $(id)).filter(Boolean);

  const setActiveLink = (id) => {
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveLink('#' + entry.target.id);
        }
      });
    },
    {
      rootMargin: `-${(nav.offsetHeight || 70) + 16}px 0px -55% 0px`,
      threshold: 0,
    }
  );

  sections.forEach(sec => observer.observe(sec));
}


/* ─── 3. GSAP + SCROLLTRIGGER ANIMATIONS ──────────────────── */

function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // ── Hero elements: staggered fade-up on page load (no ScrollTrigger)
  const heroEls = $$('[data-animate="hero"]');
  if (heroEls.length) {
    gsap.fromTo(
      heroEls,
      { opacity: 0, y: 36 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.14,
        ease: 'power3.out',
        delay: 0.25,
      }
    );
  }

  // ── Hero visual: slides in from the right
  const heroVisual = $('.hero-visual');
  if (heroVisual) {
    gsap.fromTo(
      heroVisual,
      { opacity: 0, x: 56, scale: 0.96 },
      { opacity: 1, x: 0, scale: 1, duration: 1, ease: 'power3.out', delay: 0.55 }
    );
  }

  // ── Generic fade-up (section headers, slider swiper, etc.)
  $$('[data-animate="fade-up"]').forEach(el => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 48 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
        immediateRender: false,
        scrollTrigger: {
          trigger: el,
          start: 'top 86%',
          end: 'top 40%',
          // play → reverse → play → reverse  (forward + backward scroll)
          toggleActions: 'play none none none',
          invalidateOnRefresh: true,
        },
      }
    );
  });

  // ── Feature cards: staggered within the row
  const featureCards = $$('[data-animate="feature-card"]');
  if (featureCards.length) {
    const row = featureCards[0].closest('.row');
    gsap.fromTo(
      featureCards,
      { opacity: 0, y: 48, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        immediateRender: false,
        scrollTrigger: {
          trigger: row,
          start: 'top 82%',
          end: 'top 28%',
          toggleActions: 'play none none none',
          invalidateOnRefresh: true,
        },
      }
    );
  }

  // ── About image — slide in from left
  $$('[data-animate="slide-left"]').forEach(el => {
    gsap.fromTo(
      el,
      { opacity: 0, x: -56 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: 'power3.out',
        immediateRender: false,
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          end: 'top 36%',
          toggleActions: 'play none none none',
          invalidateOnRefresh: true,
        },
      }
    );
  });

  // ── About content — slide in from right
  $$('[data-animate="slide-right"]').forEach(el => {
    gsap.fromTo(
      el,
      { opacity: 0, x: 56 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: 'power3.out',
        immediateRender: false,
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          end: 'top 36%',
          toggleActions: 'play none none none',
          invalidateOnRefresh: true,
        },
      }
    );
  });

  // ── Counter cards: staggered fade + scale; also boot the number counters
  const counterCards = $$('[data-animate="counter-card"]');
  if (counterCards.length) {
    const row = counterCards[0].closest('.row');

    gsap.fromTo(
      counterCards,
      { opacity: 0, y: 40, scale: 0.92 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        stagger: 0.1,
        ease: 'back.out(1.4)',
        immediateRender: false,
        scrollTrigger: {
          trigger: row,
          start: 'top 82%',
          end: 'top 28%',
          toggleActions: 'play none none none',
          invalidateOnRefresh: true,
        },
      }
    );
  }

  // Counter numbers are handled separately by IntersectionObserver (see §4)
  initCounters();
}


/* ─── 4. COUNTER ANIMATION ─────────────────────────────────── */

function initCounters() {
  const numbers = $$('.stat_number');
  if (!numbers.length) return;

  /**
   * Animate a single counter element from 0 → target.
   * Uses requestAnimationFrame + easeOutQuad for smooth deceleration.
   * Cancels any in-progress animation to prevent overlapping RAF loops.
   */
  const animateCounter = (el) => {
    if (el._rafId) {
      cancelAnimationFrame(el._rafId);
      el._rafId = null;
    }

    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 2000; // ms
    const start = performance.now();

    const easeOutQuad = t => t * (2 - t);

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor(easeOutQuad(progress) * target);
      el.textContent = value.toLocaleString() + suffix;

      if (progress < 1) {
        el._rafId = requestAnimationFrame(tick);
      } else {
        el._rafId = null;
        el.textContent = target.toLocaleString() + suffix;
      }
    };

    el._rafId = requestAnimationFrame(tick);
  };

  /**
   * Each time a .stat_number enters the viewport (≥50% visible),
   * reset to 0 and animate again.  unobserve is NOT called so the
   * animation replays every time the section scrolls into view.
   */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
        } else {
          // Reset display when fully out of view
          const suffix = entry.target.dataset.suffix || '';
          entry.target.textContent = '0' + suffix;
        }
      });
    },
    { threshold: 0.5 }
  );

  numbers.forEach(el => observer.observe(el));
}


/* ─── 5. SWIPER CAROUSEL ───────────────────────────────────── */

function initSwiper() {
  if (typeof Swiper === 'undefined') return;

  new Swiper('.slider-swiper', {
    // Layout
    loop: false,
    centeredSlides: false,
    spaceBetween: 24,
    slidesPerView: 1,
    mousewheel: {
      releaseOnEdges: true, // release scroll back to page at first/last slide
    },
    // Autoplay — pauses on hover via pauseOnMouseEnter
    autoplay: {
      delay: 4800,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },

    // Pagination dots
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },

    // Accessibility labels
    a11y: {
      prevSlideMessage: 'Previous testimonial',
      nextSlideMessage: 'Next testimonial',
    },

    // Responsive breakpoints
    breakpoints: {
      768: {
        slidesPerView: 2,
        centeredSlides: true,
      },
      1024: {
        slidesPerView: 3,
        centeredSlides: false,
      },
      1200: {
        slidesPerView: 4.4,
        centeredSlides: false,
      },
    },
  });
}


/* ─── 5b. FLIP ANIMATION TICKER ───────────────────────────── */

function initFlipAnimation() {
  const container = document.querySelector('.flip_animation');
  if (!container) return;

  const spans = Array.from(container.querySelectorAll('span'));
  if (spans.length < 2) return;

  let current = 0;
  spans[current].classList.add('is-active');

  setInterval(() => {
    const prev = current;
    current = (current + 1) % spans.length;

    // Exit: slide current item upward
    spans[prev].classList.add('is-exit');
    spans[prev].classList.remove('is-active');

    // Enter: slide next item up from below
    spans[current].classList.remove('is-exit');
    spans[current].classList.add('is-active');

    // After transition ends, reset exited span to bottom so it re-enters from below
    setTimeout(() => {
      spans[prev].classList.remove('is-exit');
    }, 460);
  }, 3000);
}


/* ─── 6. FORM VALIDATION ───────────────────────────────────── */

/**
 * Field descriptor shape:
 *   { input: HTMLInputElement, errorEl: HTMLElement, validate: (value) => string|null }
 *
 * validate() returns an error message string, or null when valid.
 */

function initFormValidation() {
  const form = $('#demoForm');
  if (!form) return;

  // ── Field definitions with individual validators ──

  const fields = [
    {
      input: $('#demoName'),
      errorEl: $('#nameError'),
      validate(val) {
        const v = val.trim();
        if (!v) return 'Full name is required.';
        if (v.length < 2) return 'Please enter your full name (at least 2 characters).';
        return null;
      },
    },
    {
      input: $('#demoEmail'),
      errorEl: $('#emailError'),
      validate(val) {
        const v = val.trim();
        if (!v) return 'Work email is required.';
        // Simplified RFC-5322 pattern (covers 99.9% of real addresses)
        const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
        if (!re.test(v)) return 'Please enter a valid email address.';
        return null;
      },
    },
    {
      input: $('#demoPhone'),
      errorEl: $('#phoneError'),
      validate(val) {
        const v = val.trim();
        if (!v) return 'Phone number is required.';
        // 10-digit Indian mobile number starting with 6–9
        const re = /^[6-9]\d{9}$/;
        if (!re.test(v)) return 'Please enter a valid 10-digit mobile number (e.g. 9876543210).';
        return null;
      },
    },
    {
      input: $('#demoWebsite'),
      errorEl: $('#websiteError'),
      validate(val) {
        const v = val.trim();
        if (!v) return 'Website URL is required.';
        // Accepts formats: https://www.example.com · http://example.com
        const re = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-]*)*\/?$/;
        if (!re.test(v)) return 'Please enter a valid website URL.';
        return null;
      },
    },
  ];

  // ── Attach blur + live re-validation on each input ──

  fields.forEach(({ input, errorEl, validate }) => {
    if (!input) return;

    // Show error on blur
    input.addEventListener('blur', () => {
      validateField(input, errorEl, validate);
    });

    // Live correction once the field has been touched (has an error class)
    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) {
        validateField(input, errorEl, validate);
      }
    });
  });

  // ── Submit handler ──

  form.addEventListener('submit', e => {
    e.preventDefault();

    // Validate all fields; collect results
    const allValid = fields.every(({ input, errorEl, validate }) =>
      validateField(input, errorEl, validate)
    );

    if (!allValid) {
      // Focus the first invalid field for accessibility
      const firstInvalid = form.querySelector('.is-invalid');
      firstInvalid?.focus();
      return;
    }

    submitForm(form);
  });
}

/**
 * Validate a single field and update its UI state.
 * @returns {boolean}  true = valid, false = invalid
 */
function validateField(input, errorEl, validate) {
  const msg = validate(input.value);

  if (msg) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    if (errorEl) errorEl.textContent = msg;
    return false;
  }

  input.classList.remove('is-invalid');
  input.classList.add('is-valid');
  if (errorEl) errorEl.textContent = '';
  return true;
}

/**
 * Submit the demo form to the API.
 */
async function submitForm(form) {
  const submitBtn = form.querySelector('.btn-submit');
  const labelEl = form.querySelector('.btn-label');
  const spinnerEl = form.querySelector('.btn-spinner');
  const errorEl = $('#formError');

  // Show loading state and hide any previous error
  submitBtn.disabled = true;
  labelEl.hidden = true;
  spinnerEl.hidden = false;
  if (errorEl) errorEl.hidden = true;

  const payload = {
    name: $('#demoName').value.trim(),
    companyWebsite: (() => {
      let url = $('#demoWebsite').value.trim();
      if (url && !/^https?:\/\//i.test(url)) {
        url = `https://www.${url}`;
      }
      return url;
    })(),
    companyMail: $('#demoEmail').value.trim(),
    // Prepend India country code before sending
    companyWhatsappNumber: `91${$('#demoPhone').value.trim()}`,
  };

  try {
    const res = await fetch('https://api.wydely.io/api/v1/book-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showSuccess(form);
    } else {
      throw new Error(data.message || 'Submission failed.');
    }
  } catch {
    // Restore button state and surface the error to the user
    submitBtn.disabled = false;
    labelEl.hidden = false;
    spinnerEl.hidden = true;
    if (errorEl) {
      errorEl.textContent = 'Something went wrong. Please try again.';
      errorEl.hidden = false;
    }
  }
}

function showSuccess(form) {
  form.hidden = true;
  const success = $('#formSuccess');
  if (success) success.hidden = false;
}


/* ─── 7. MODAL RESET ───────────────────────────────────────── */

function initModalReset() {
  const modal = $('#demoModal');
  if (!modal) return;

  modal.addEventListener('hidden.bs.modal', () => {
    const form = $('#demoForm');
    const successEl = $('#formSuccess');
    const submitBtn = form?.querySelector('.btn-submit');
    const labelEl = form?.querySelector('.btn-label');
    const spinnerEl = form?.querySelector('.btn-spinner');

    if (form) {
      form.reset();
      form.hidden = false;
      // Remove validation states
      $$('.is-invalid, .is-valid', form).forEach(el => {
        el.classList.remove('is-invalid', 'is-valid');
      });
      $$('.field-error', form).forEach(el => { el.textContent = ''; });
    }

    if (successEl) successEl.hidden = true;
    if (submitBtn) submitBtn.disabled = false;
    if (labelEl) labelEl.hidden = false;
    if (spinnerEl) spinnerEl.hidden = true;

    // Clear any API error message
    const errorEl = $('#formError');
    if (errorEl) { errorEl.textContent = ''; errorEl.hidden = true; }
  });
}


/* ─── 8. FOOTER YEAR ───────────────────────────────────────── */

function setCurrentYear() {
  const el = $('#currentYear');
  if (el) el.textContent = new Date().getFullYear();
}
