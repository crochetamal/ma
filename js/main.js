/* ============================================================
   Crochet Amal — منطق الصفحة الرئيسية
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const CART_KEY = "ca_cart_v1";
  const FAV_KEY = "ca_favs_v1";

  const state = {
    products: [],
    settings: { ...(window.CA_DEFAULT_SETTINGS || {}) },
    cart: readJSON(CART_KEY, []),
    favs: new Set(readJSON(FAV_KEY, [])),
    activeCat: "الكل",
  };

  /* ---------------- utils ---------------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* ignore */
    }
  }

  const esc = (str) =>
    String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function money(n) {
    return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function waNumber() {
    let digits = String(state.settings.whatsapp || "").replace(/\D/g, "");
    if (!digits) digits = "212600000000";
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = "212" + digits.slice(1);
    return digits;
  }

  function waLink(message) {
    return `https://wa.me/${waNumber()}?text=${encodeURIComponent(message)}`;
  }

  const genericMessage =
    "سلام أمل 👋\nشفت المتجر ديالك وعجبوني القطع. بغيت نستفسر أكثر عن المنتجات والتوصيل. شكرًا!";

  function toast(text) {
    const wrap = $("#toastWrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<svg><use href="#i-check"/></svg><span>${esc(text)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "opacity .3s, transform .3s";
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#f5ede2"/><text x="200" y="210" font-size="64" text-anchor="middle" fill="#d8c7b4">🧶</text></svg>`
    );

  /* ---------------- settings ---------------- */
  function applySettings() {
    const s = state.settings;

    const ann = $('[data-setting="announcement"]');
    if (ann && s.announcement) ann.textContent = s.announcement;

    $$("[data-wa-link]").forEach((a) => {
      a.href = waLink(genericMessage);
      a.target = "_blank";
    });

    const ig = $("#footerInstagram");
    if (ig) {
      if (s.instagram) {
        ig.href = "https://instagram.com/" + String(s.instagram).replace(/^@/, "");
        ig.style.display = "";
      } else ig.style.display = "none";
    }

    const fb = $("#footerFacebook");
    if (fb) {
      if (s.facebook) {
        fb.href = /^https?:/.test(s.facebook)
          ? s.facebook
          : "https://facebook.com/" + s.facebook;
        fb.style.display = "";
      } else fb.style.display = "none";
    }

    const mail = $("#footerMail");
    if (mail) {
      if (s.email) {
        mail.href = "mailto:" + s.email;
        mail.style.display = "";
      } else mail.style.display = "none";
    }
  }

  /* ---------------- products ---------------- */
  function categoriesOf(products) {
    const set = new Set();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }

  function renderFilters() {
    const wrap = $("#filters");
    if (!wrap) return;
    const cats = ["الكل", ...categoriesOf(state.products)];
    wrap.innerHTML = cats
      .map(
        (c) =>
          `<button class="chip${c === state.activeCat ? " is-active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`
      )
      .join("");
  }

  function visibleProducts() {
    const list = state.products.slice();
    if (state.activeCat !== "الكل") {
      return list.filter((p) => p.category === state.activeCat);
    }
    // المميّزة أولًا
    return list.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }

  function productCard(p) {
    const isFav = state.favs.has(p.id);
    const old = p.oldPrice && p.oldPrice > p.price ? `<s>${money(p.oldPrice)}</s>` : "";
    return `
      <article class="product-card" data-id="${esc(p.id)}">
        <div class="product-media" data-open-product>
          <img src="${esc(p.image || PLACEHOLDER)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='${PLACEHOLDER}'" />
          ${!p.available ? '<span class="product-tag product-tag--out">غير متوفر حاليًا</span>' : p.featured ? '<span class="product-tag">الأكثر طلبًا</span>' : ""}
          <button class="product-fav${isFav ? " is-active" : ""}" data-fav aria-label="أضيفي إلى المفضلة" aria-pressed="${isFav}">
            <svg><use href="#i-heart"/></svg>
          </button>
        </div>
        <div class="product-body">
          <span class="product-cat">${esc(p.category)}</span>
          <h3 class="product-name">${esc(p.name)}</h3>
          <p class="product-desc">${esc(p.description)}</p>
          <div class="product-foot">
            <span class="price">${money(p.price)}<small>د.م</small>${old}</span>
            <button class="add-btn" data-add ${!p.available ? "disabled" : ""} aria-label="أضيفي ${esc(p.name)} إلى السلة">
              <svg><use href="#i-plus"/></svg>
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderProducts() {
    const grid = $("#productsGrid");
    if (!grid) return;
    const list = visibleProducts();

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <svg><use href="#i-flower"/></svg>
          <p style="margin:0">لا توجد منتجات في هذا القسم بعد. عودي قريبًا أو راسليني على واتساب لطلب تصميم خاص.</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map(productCard).join("");
    grid.querySelectorAll(".product-card").forEach((el, i) => {
      el.style.animationDelay = Math.min(i * 55, 400) + "ms";
    });
  }

  /* ---------------- cart ---------------- */
  function cartTotal() {
    return state.cart.reduce((sum, l) => sum + Number(l.price) * Number(l.qty), 0);
  }

  function cartCount() {
    return state.cart.reduce((n, l) => n + Number(l.qty), 0);
  }

  function saveCart() {
    writeJSON(CART_KEY, state.cart);
    renderCart();
  }

  function addToCart(product, qty = 1) {
    if (product.available === false) return;
    const line = state.cart.find((l) => l.id === product.id);
    if (line) line.qty += qty;
    else
      state.cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image || "",
        qty,
      });
    saveCart();
    toast("تمت إضافة «" + product.name + "» إلى السلة");
  }

  function renderCart() {
    const body = $("#cartBody");
    const foot = $("#cartFoot");
    const count = cartCount();

    if ($("#cartCount")) {
      $("#cartCount").textContent = count;
      $("#cartCount").classList.toggle("is-visible", count > 0);
    }
    if ($("#cartCountInline")) $("#cartCountInline").textContent = count;

    if (!body) return;

    if (!state.cart.length) {
      body.innerHTML = `
        <div class="empty-state" style="border:none;padding:3rem 1rem">
          <svg><use href="#i-bag"/></svg>
          <p style="margin:0 0 1rem">سلتك فارغة الآن.</p>
          <button class="btn btn--ghost btn--sm" data-close-cart>تصفّحي المنتجات</button>
        </div>`;
      if (foot) foot.hidden = true;
      return;
    }

    if (foot) foot.hidden = false;

    body.innerHTML = state.cart
      .map(
        (l) => `
      <div class="cart-line" data-line="${esc(l.id)}">
        <img src="${esc(l.image || PLACEHOLDER)}" alt="${esc(l.name)}" onerror="this.src='${PLACEHOLDER}'" />
        <div>
          <h4>${esc(l.name)}</h4>
          <div class="cart-price">${money(l.price)} د.م</div>
          <div class="qty">
            <button data-qty="inc" aria-label="زيادة الكمية">+</button>
            <span>${l.qty}</span>
            <button data-qty="dec" aria-label="تقليل الكمية">−</button>
          </div>
        </div>
        <button class="cart-remove" data-remove aria-label="إزالة ${esc(l.name)}"><svg><use href="#i-trash"/></svg></button>
      </div>`
      )
      .join("");

    if ($("#cartTotal")) $("#cartTotal").textContent = money(cartTotal());
  }

  function openCart() {
    const d = $("#cartDrawer");
    if (!d) return;
    d.classList.add("is-open");
    d.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeCart() {
    const d = $("#cartDrawer");
    if (!d) return;
    d.classList.remove("is-open");
    d.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

  function checkoutWhatsApp() {
    if (!state.cart.length) return;
    const name = ($("#custName") && $("#custName").value.trim()) || "";
    const city = ($("#custCity") && $("#custCity").value.trim()) || "";
    const note = ($("#custNote") && $("#custNote").value.trim()) || "";

    const lines = state.cart.map(
      (l) => `• ${l.qty} × ${l.name} — ${money(l.price * l.qty)} د.م`
    );

    const message = [
      "سلام أمل 👋",
      "بغيت نطلب من متجر كروشيه أمل:",
      "",
      ...lines,
      "",
      `المجموع: ${money(cartTotal())} د.م`,
      `الاسم: ${name || "..."}`,
      `المدينة: ${city || "..."}`,
      note ? `ملاحظات: ${note}` : "ملاحظات: ...",
      "",
      "شكرًا! 🌸",
    ].join("\n");

    window.open(waLink(message), "_blank", "noopener");
    toast("فتحنا لك واتساب مع تفاصيل الطلب");
  }

  /* ---------------- product modal ---------------- */
  let currentProduct = null;

  function openProduct(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    currentProduct = p;

    $("#modalImg").src = p.image || PLACEHOLDER;
    $("#modalImg").alt = p.name;
    $("#modalCat").textContent = p.category || "";
    $("#modalName").textContent = p.name;
    $("#modalPrice").innerHTML = `${money(p.price)}<small>د.م</small>${
      p.oldPrice && p.oldPrice > p.price ? `<s>${money(p.oldPrice)}</s>` : ""
    }`;
    $("#modalDesc").textContent = p.description || "";
    $("#modalWa").href = waLink(
      `سلام أمل 👋\nعندي سؤال على هاد المنتج: «${p.name}» (${money(p.price)} د.م).\nبغيت نعرف الألوان والمقاسات المتوفرة. شكرًا!`
    );

    const addBtn = $("#modalAdd");
    addBtn.disabled = p.available === false;
    addBtn.textContent = p.available === false ? "غير متوفر حاليًا" : "أضيفي إلى السلة";

    const modal = $("#productModal");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeProduct() {
    const modal = $("#productModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    currentProduct = null;
  }

  /* ---------------- events ---------------- */
  function bindEvents() {
    // filters
    $("#filters") &&
      $("#filters").addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        state.activeCat = chip.dataset.cat;
        $$(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
        renderProducts();
      });

    // product grid actions
    const grid = $("#productsGrid");
    grid &&
      grid.addEventListener("click", (e) => {
        const card = e.target.closest(".product-card");
        if (!card) return;
        const id = card.dataset.id;
        const p = state.products.find((x) => x.id === id);

        if (e.target.closest("[data-add]")) {
          if (p) addToCart(p);
          return;
        }
        if (e.target.closest("[data-fav]")) {
          if (!p) return;
          if (state.favs.has(id)) state.favs.delete(id);
          else state.favs.add(id);
          writeJSON(FAV_KEY, Array.from(state.favs));
          const btn = e.target.closest("[data-fav]");
          const active = state.favs.has(id);
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
          toast(active ? "أُضيفت إلى المفضلة ♥" : "أُزيلت من المفضلة");
          return;
        }
        if (e.target.closest("[data-open-product]") || e.target.closest(".product-name")) {
          openProduct(id);
        }
      });

    // cart toggle
    $("#cartToggle") && $("#cartToggle").addEventListener("click", openCart);

    $$("[data-close-cart]").forEach((el) => el.addEventListener("click", closeCart));

    // cart body interactions
    const cartBody = $("#cartBody");
    cartBody &&
      cartBody.addEventListener("click", (e) => {
        if (e.target.closest("[data-close-cart]")) {
          closeCart();
          return;
        }
        const line = e.target.closest("[data-line]");
        if (!line) return;
        const id = line.dataset.line;
        const item = state.cart.find((l) => l.id === id);
        if (!item) return;

        if (e.target.closest("[data-qty]")) {
          const dir = e.target.closest("[data-qty]").dataset.qty;
          if (dir === "inc") item.qty += 1;
          else item.qty -= 1;
          if (item.qty <= 0) state.cart = state.cart.filter((l) => l.id !== id);
          saveCart();
          return;
        }
        if (e.target.closest("[data-remove]")) {
          state.cart = state.cart.filter((l) => l.id !== id);
          saveCart();
          toast("أُزيلت القطعة من السلة");
        }
      });

    $("#checkoutBtn") && $("#checkoutBtn").addEventListener("click", checkoutWhatsApp);

    // modal
    $$("[data-close-modal]").forEach((el) => el.addEventListener("click", closeProduct));
    $("#modalAdd") &&
      $("#modalAdd").addEventListener("click", () => {
        if (currentProduct) {
          addToCart(currentProduct);
          closeProduct();
          openCart();
        }
      });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeProduct();
        closeCart();
        closeMobile();
      }
    });

    // mobile nav
    $("#burgerBtn") && $("#burgerBtn").addEventListener("click", openMobile);
    $$("[data-close-mobile]").forEach((el) => el.addEventListener("click", closeMobile));

    // sticky header
    const header = $("#siteHeader");
    const onScroll = () => {
      if (!header) return;
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // footer year
    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
  }

  function openMobile() {
    $("#mobileNav").classList.add("is-open");
    $("#burgerBtn") && $("#burgerBtn").setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
  }

  function closeMobile() {
    const nav = $("#mobileNav");
    if (!nav) return;
    nav.classList.remove("is-open");
    $("#burgerBtn") && $("#burgerBtn").setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
  }

  /* ---------------- reveal ---------------- */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ---------------- customer fields in cart foot ---------------- */
  function injectCustomerFields() {
    const foot = $("#cartFoot");
    const checkout = $("#checkoutBtn");
    if (!foot || !checkout || $("#custName")) return;

    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = ".5rem";
    wrap.style.gridTemplateColumns = "1fr 1fr";
    wrap.innerHTML = `
      <input id="custName" type="text" placeholder="الاسم" aria-label="الاسم"
        style="border:1px solid var(--line);border-radius:12px;padding:.6rem .8rem;background:#fff;font-size:.9rem" />
      <input id="custCity" type="text" placeholder="المدينة" aria-label="المدينة"
        style="border:1px solid var(--line);border-radius:12px;padding:.6rem .8rem;background:#fff;font-size:.9rem" />
      <input id="custNote" type="text" placeholder="ملاحظات (اللون، المقاس...)" aria-label="ملاحظات"
        style="grid-column:1/-1;border:1px solid var(--line);border-radius:12px;padding:.6rem .8rem;background:#fff;font-size:.9rem" />
    `;
    foot.insertBefore(wrap, checkout);
  }

  /* ---------------- init ---------------- */
  async function init() {
    renderCart();
    bindEvents();
    initReveal();
    injectCustomerFields();

    try {
      const [settings, products] = await Promise.all([
        CA_DB.getSettings(),
        CA_DB.getProducts(),
      ]);
      state.settings = settings;
      state.products = products;
    } catch (err) {
      console.warn("[Crochet Amal] تعذّر جلب البيانات من Firebase، سيتم عرض المنتجات الافتراضية.", err);
      state.products = (window.CA_SEED_PRODUCTS || []).slice();
      state.settings = { ...(window.CA_DEFAULT_SETTINGS || {}) };
    }

    applySettings();
    renderFilters();
    renderProducts();

    // إعادة الترتيب عند تسجيل الدخول/الخروج من لوحة التحكم
    CA_DB.onChange(async () => {
      const products = await CA_DB.getProducts().catch(() => state.products);
      state.products = products;
      renderFilters();
      renderProducts();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
