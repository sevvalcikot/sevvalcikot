'use strict';

/**
 * Çok sayfalı yapı için yeniden düzenlendi.
 * Rewritten for the multi-page structure (each page only runs what it needs).
 */

const toggleActive = function (elem) { elem.classList.toggle("active"); };


/* ---------- mobil menü / mobile menu ---------- */

const navToggleBtn = document.querySelector("[data-nav-toggle]");
const navbar = document.querySelector("[data-navbar]");

if (navToggleBtn && navbar) {
  navToggleBtn.addEventListener("click", function () {
    toggleActive(navbar);
    toggleActive(navToggleBtn);
    navToggleBtn.setAttribute("aria-expanded", navbar.classList.contains("active"));
  });
}


/* ---------- kenar çubuğu / sidebar (mobile contacts) ---------- */

const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

if (sidebar && sidebarBtn) {
  sidebarBtn.addEventListener("click", function () { toggleActive(sidebar); });
}


/* ---------- proje filtresi / project filter ---------- */

const filterItems = document.querySelectorAll("[data-filter-item]");
const filterBtns = document.querySelectorAll("[data-filter-btn]");
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-select-value]");

const filterFunc = function (value) {
  filterItems.forEach(function (item) {
    if (value === "all" || value === item.dataset.category) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
};

if (select) {
  select.addEventListener("click", function () { toggleActive(this); });
}

selectItems.forEach(function (item) {
  item.addEventListener("click", function () {
    selectValue.innerText = this.innerText;
    toggleActive(select);
    filterFunc(this.dataset.filter);
  });
});

filterBtns.forEach(function (btn) {
  btn.addEventListener("click", function () {
    filterBtns.forEach(function (b) { b.classList.remove("active"); });
    this.classList.add("active");
    if (selectValue) selectValue.innerText = this.innerText;
    filterFunc(this.dataset.filter);
  });
});


/* ---------- lightbox (projeler + galeri / projects + gallery) ---------- */

const lightbox = document.querySelector("[data-lightbox]");

if (lightbox) {
  const lbImg = lightbox.querySelector("[data-lightbox-img]");
  const lbCap = lightbox.querySelector("[data-lightbox-cap]");
  const lbFig2 = lightbox.querySelector("[data-lightbox-fig2]");
  const lbImg2 = lightbox.querySelector("[data-lightbox-img2]");
  const lbCap2 = lightbox.querySelector("[data-lightbox-cap2]");
  const lbMedia = lightbox.querySelector("[data-lightbox-media]");
  const lbTitle = lightbox.querySelector("[data-lightbox-title]");
  const lbText = lightbox.querySelector("[data-lightbox-text]");
  const closeEls = lightbox.querySelectorAll("[data-lightbox-close]");
  let lastFocus = null;

  const openLightbox = function (trigger) {
    lastFocus = trigger;
    lbImg.src = trigger.dataset.img;
    lbImg.alt = trigger.dataset.title + (trigger.dataset.cap ? " – " + trigger.dataset.cap : "");
    lbCap.textContent = trigger.dataset.cap || "";

    // ikinci görsel varsa (öncesi/sonrası ya da katmanlar) yan yana göster
    if (trigger.dataset.img2) {
      lbImg2.src = trigger.dataset.img2;
      lbImg2.alt = trigger.dataset.title + " – " + (trigger.dataset.cap2 || "");
      lbCap2.textContent = trigger.dataset.cap2 || "";
      lbFig2.hidden = false;
      lbMedia.classList.add("is-pair");
    } else {
      lbFig2.hidden = true;
      lbMedia.classList.remove("is-pair");
    }
    lbTitle.textContent = trigger.dataset.title;
    lbText.textContent = trigger.dataset.text || "";
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    lightbox.querySelector(".modal-close-btn").focus();
  };

  const closeLightbox = function () {
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  };

  document.querySelectorAll("[data-lightbox-trigger]").forEach(function (trigger) {
    trigger.addEventListener("click", function () { openLightbox(this); });
  });

  closeEls.forEach(function (el) { el.addEventListener("click", closeLightbox); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lightbox.classList.contains("active")) closeLightbox();
  });
}


/* ---------- iletişim formu / contact form ---------- */

const form = document.querySelector("[data-form]");

if (form) {
  const formInputs = form.querySelectorAll("[data-form-input]");
  const formBtn = form.querySelector("[data-form-btn]");
  const formStatus = document.querySelector("[data-form-status]");

  formInputs.forEach(function (input) {
    input.addEventListener("input", function () {
      if (form.checkValidity()) {
        formBtn.removeAttribute("disabled");
      } else {
        formBtn.setAttribute("disabled", "");
      }
    });
  });

  form.addEventListener("submit", function (e) {
    // Form bir servise (ör. Formspree) bağlı değilse sayfada mesaj göster.
    // If the form has no real endpoint, show a message on the page instead.
    if (!form.getAttribute("action") || form.getAttribute("action") === "#") {
      e.preventDefault();
      formStatus.textContent = form.dataset.success;
      form.reset();
      formBtn.setAttribute("disabled", "");
    }
  });
}
