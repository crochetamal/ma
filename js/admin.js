/* ============================================================
   Crochet Amal — لوحة التحكم
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f5ede2"/><text x="100" y="112" font-size="46" text-anchor="middle" fill="#d8c7b4">🧶</text></svg>`
    );

  const state = {
    products: [],
    settings: {},
    editingId: null,
    imageUrl: "",
    imageFile: null,
    search: "",
    user: null,
    editingImage: "",
  };

  const esc = (str) =>
    String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const money = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

  function toast(text) {
    const wrap = $("#toastWrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<svg><use href="#i-check"/></svg><span>${esc(text)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .3s";
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  /* ---------------- tabs ---------------- */
  const TITLES = {
    products: ["المنتجات", "أضيفي وعدّلي القطع المعروضة في المتجر."],
    new: ["إضافة منتج", "املئي تفاصيل القطعة وأضيفي صورة واضحة."],
    settings: ["إعدادات المتجر", "بيانات التواصل التي تظهر للزبونات."],
  };

  function switchTab(name) {
    $$(".tab-panel").forEach((p) => p.classList.toggle("is-active", p.id === "tab-" + name));
    $$(".admin-nav__item").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
    const [title, sub] = TITLES[name] || TITLES.products;
    $("#pageTitle").textContent = title;
    $("#pageSub").textContent = sub;
  }

  /* ---------------- auth ---------------- */
  function showLogin() {
    $("#loginScreen").hidden = false;
    $("#adminShell").hidden = true;
  }

  function showDashboard(user) {
    state.user = user;
    $("#loginScreen").hidden = true;
    $("#adminShell").hidden = false;
    $("#userPill").textContent = user.email || "";
    bootDashboard();
  }

  function initAuth() {
    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#loginEmail").value.trim();
      const pass = $("#loginPass").value;
      const err = $("#loginError");
      const btn = $("#loginBtn");
      err.hidden = true;
      btn.disabled = true;
      btn.textContent = "جارٍ الدخول…";
      try {
        const user = await CA_DB.signIn(email, pass);
        if (user) showDashboard(user);
      } catch (ex) {
        err.textContent =
          ex && ex.code === "auth/invalid-credential"
            ? "البريد أو كلمة المرور غير صحيحة."
            : "تعذّر تسجيل الدخول: " + (ex && ex.message ? ex.message : "خطأ غير معروف");
        err.hidden = false;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg><use href="#i-lock"/></svg> تسجيل الدخول';
      }
    });

    $("#logoutBtn").addEventListener("click", async () => {
      await CA_DB.signOut();
      location.reload();
    });
  }

  /* ---------------- products ---------------- */
  function renderStats() {
    $("#statTotal").textContent = state.products.length;
    $("#statAvailable").textContent = state.products.filter((p) => p.available !== false).length;
    $("#statFeatured").textContent = state.products.filter((p) => p.featured).length;
  }

  function filteredProducts() {
    const q = state.search.trim().toLowerCase();
    const list = state.products.slice().sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
    if (!q) return list;
    return list.filter(
      (p) =>
        String(p.name).toLowerCase().includes(q) ||
        String(p.category).toLowerCase().includes(q)
    );
  }

  function renderAdminProducts() {
    const wrap = $("#adminProducts");
    if (!wrap) return;
    const list = filteredProducts();

    if (!list.length) {
      wrap.innerHTML = `
        <div class="admin-empty">
          <svg><use href="#i-box"/></svg>
          <p style="margin:0 0 .8rem">${state.products.length ? "لا توجد نتائج مطابقة للبحث." : "لم تُضيفي أي منتج بعد."}</p>
          <button class="btn btn--primary btn--sm" data-goto-tab="new"><svg><use href="#i-plus"/></svg> إضافة أول منتج</button>
        </div>`;
      return;
    }

    wrap.innerHTML = list
      .map(
        (p) => `
      <div class="adm-product${p.available === false ? " is-unavailable" : ""}" data-id="${esc(p.id)}">
        <img src="${esc(p.image || PLACEHOLDER)}" alt="${esc(p.name)}" onerror="this.src='${PLACEHOLDER}'" />
        <div class="adm-product__main">
          <h4>${esc(p.name)}</h4>
          <div class="adm-product__meta">
            <span>${money(p.price)} د.م</span>
            <span class="dot-sep"></span>
            <span>${esc(p.category || "—")}</span>
            <span class="dot-sep"></span>
            <span class="badge ${p.available === false ? "badge--out" : "badge--ok"}">${p.available === false ? "غير متوفر" : "متوفر"}</span>
            ${p.featured ? '<span class="badge badge--feat">مميّز</span>' : ""}
          </div>
        </div>
        <div class="adm-product__actions">
          <button class="mini-btn" data-edit title="تعديل" aria-label="تعديل ${esc(p.name)}"><svg><use href="#i-edit"/></svg></button>
          <button class="mini-btn" data-toggle-avail title="${p.available === false ? "إظهار كمتوفر" : "إخفاء كغير متوفر"}" aria-label="تغيير حالة التوفر"><svg><use href="#i-eye"/></svg></button>
          <button class="mini-btn is-danger" data-delete title="حذف" aria-label="حذف ${esc(p.name)}"><svg><use href="#i-trash"/></svg></button>
        </div>
      </div>`
      )
      .join("");
  }

  async function loadProducts() {
    try {
      state.products = await CA_DB.getProducts();
    } catch (err) {
      console.error(err);
      toast("تعذّر تحميل المنتجات من Firebase");
      state.products = [];
    }
    renderStats();
    renderAdminProducts();
  }

  /* ---------------- form ---------------- */
  function resetForm() {
    state.editingId = null;
    state.imageFile = null;
    state.imageUrl = "";
    $("#productForm").reset();
    $("#pOrder").value = "0";
    $("#pAvailable").checked = true;
    $("#pFeatured").checked = false;
    $("#descCount").textContent = "0";
    $("#formTitle").textContent = "إضافة منتج جديد";
    $("#saveBtnLabel").textContent = "حفظ المنتج";
    $("#editBadge").hidden = true;
    $("#cancelEditBtn").hidden = true;
    $("#clearImageBtn").hidden = true;
    $("#formStatus").textContent = "";
    renderUploadPreview(null);
  }

  function fillForm(p) {
    state.editingId = p.id;
    state.imageUrl = /^https?:|^data:/.test(p.image || "") ? p.image : "";
    $("#pName").value = p.name || "";
    $("#pCategory").value = p.category || "";
    $("#pPrice").value = p.price || "";
    $("#pOldPrice").value = p.oldPrice || "";
    $("#pOrder").value = p.order || 0;
    $("#pDesc").value = p.description || "";
    $("#descCount").textContent = String((p.description || "").length);
    $("#pAvailable").checked = p.available !== false;
    $("#pFeatured").checked = !!p.featured;
    $("#pImageUrl").value = /^https?:/.test(p.image || "") ? p.image : "";
    $("#formTitle").textContent = "تعديل المنتج";
    $("#saveBtnLabel").textContent = "حفظ التعديلات";
    $("#editBadge").hidden = false;
    $("#cancelEditBtn").hidden = false;
    $("#clearImageBtn").hidden = !p.image;
    $("#formStatus").textContent = "";
    renderUploadPreview(p.image || null);
    switchTab("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderUploadPreview(src) {
    const box = $("#uploadPreview");
    if (!box) return;
    if (src) {
      box.innerHTML = `<img src="${esc(src)}" alt="معاينة الصورة" onerror="this.style.display='none'" />`;
    } else {
      box.innerHTML = `
        <svg><use href="#i-image"/></svg>
        <b>اسحبي الصورة هنا أو اضغطي للاختيار</b>
        <span>JPG أو PNG · يُفضّل صورة مربعة</span>`;
    }
  }

  function compressImage(file, maxSize = 1100, quality = 0.85) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("الملف ليس صورة."));
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("تعذّر قراءة الصورة."));
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("تعذّر ضغط الصورة."));
              resolve(new File([blob], (file.name || "image").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
            },
            "image/jpeg",
            quality
          );
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("اختاري ملف صورة (JPG أو PNG)");
      return;
    }
    try {
      const compressed = await compressImage(file);
      state.imageFile = compressed;
      state.imageUrl = "";
      $("#pImageUrl").value = "";
      renderUploadPreview(URL.createObjectURL(compressed));
      $("#clearImageBtn").hidden = false;
      toast("تم تجهيز الصورة");
    } catch (err) {
      toast(err.message || "تعذّر معالجة الصورة");
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    const name = $("#pName").value.trim();
    const category = $("#pCategory").value.trim();
    const price = Number($("#pPrice").value);
    const oldPrice = $("#pOldPrice").value ? Number($("#pOldPrice").value) : null;
    const description = $("#pDesc").value.trim();
    const order = Number($("#pOrder").value) || 0;

    if (!name) return toast("اكتبي اسم المنتج");
    if (!category) return toast("اختاري القسم");
    if (!price || price <= 0) return toast("أدخلي سعرًا صحيحًا");

    const btn = $("#saveBtn");
    const label = $("#saveBtnLabel").textContent;
    btn.disabled = true;
    $("#saveBtnLabel").textContent = "جارٍ الحفظ…";
    $("#formStatus").textContent = "";

    try {
      let image = state.imageUrl || $("#pImageUrl").value.trim() || state.editingImage || "";
      if (state.imageFile) {
        $("#uploadHint").textContent = "جارٍ رفع الصورة…";
        image = await CA_DB.uploadImage(state.imageFile);
      }

      const payload = {
        name,
        category,
        price,
        oldPrice,
        description,
        image: image || PLACEHOLDER,
        order,
        available: $("#pAvailable").checked,
        featured: $("#pFeatured").checked,
      };

      if (state.editingId) {
        await CA_DB.updateProduct(state.editingId, payload);
        toast("تم تحديث المنتج");
      } else {
        await CA_DB.addProduct(payload);
        toast("تمت إضافة المنتج إلى المتجر");
      }

      resetForm();
      await loadProducts();
      switchTab("products");
      renderCategories();
    } catch (err) {
      console.error(err);
      $("#formStatus").textContent = "فشل الحفظ: " + (err.message || err.code || "خطأ غير معروف");
      $("#formStatus").classList.add("is-err");
      toast("تعذّر حفظ المنتج");
    } finally {
      btn.disabled = false;
      $("#saveBtnLabel").textContent = label;
      $("#uploadHint").textContent = "سيتم ضغط الصورة تلقائيًا قبل الحفظ.";
    }
  }

  function renderCategories() {
    const dl = $("#catList");
    if (!dl) return;
    const set = new Set(window.CA_CATEGORIES || []);
    state.products.forEach((p) => p.category && set.add(p.category));
    dl.innerHTML = Array.from(set).map((c) => `<option value="${esc(c)}"></option>`).join("");
  }

  /* ---------------- settings ---------------- */
  async function loadSettings() {
    state.settings = await CA_DB.getSettings();
    $("#sWhatsapp").value = state.settings.whatsapp || "";
    $("#sInstagram").value = state.settings.instagram || "";
    $("#sFacebook").value = state.settings.facebook || "";
    $("#sEmail").value = state.settings.email || "";
    $("#sAnnouncement").value = state.settings.announcement || "";
    $("#fbStatusText").textContent = CA_DB.isLive
      ? "متصل بـ Firebase (Firestore + Storage)"
      : "الوضع التجريبي المحلي (localStorage)";
  }

  function initSettingsForm() {
    $("#settingsForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        whatsapp: $("#sWhatsapp").value.replace(/[^\d]/g, ""),
        instagram: $("#sInstagram").value.trim(),
        facebook: $("#sFacebook").value.trim(),
        email: $("#sEmail").value.trim(),
        announcement: $("#sAnnouncement").value.trim(),
      };
      if (!data.whatsapp) return toast("أدخلي رقم واتساب صحيحًا");
      const status = $("#settingsStatus");
      status.textContent = "جارٍ الحفظ…";
      status.classList.remove("is-err");
      try {
        await CA_DB.saveSettings(data);
        status.textContent = "تم الحفظ ✓";
        toast("تم حفظ الإعدادات");
        state.settings = { ...state.settings, ...data };
      } catch (err) {
        console.error(err);
        status.textContent = "فشل الحفظ: " + (err.message || err.code);
        status.classList.add("is-err");
      }
      setTimeout(() => (status.textContent = ""), 4000);
    });
  }

  /* ---------------- events ---------------- */
  function bindDashboardEvents() {
    $$(".admin-nav__item").forEach((btn) =>
      btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab);
        if (btn.dataset.tab === "new" && state.editingId === null) resetForm();
      })
    );

    document.addEventListener("click", (e) => {
      const goto = e.target.closest("[data-goto-tab]");
      if (goto) {
        switchTab(goto.dataset.gotoTab);
        if (goto.dataset.gotoTab === "new") resetForm();
      }
    });

    $("#productForm").addEventListener("submit", saveProduct);
    $("#cancelEditBtn").addEventListener("click", () => {
      resetForm();
      switchTab("products");
    });

    $("#pDesc").addEventListener("input", (e) => {
      $("#descCount").textContent = String(e.target.value.length);
    });

    const saveEditingImage = () => {
      if (state.editingId) {
        const p = state.products.find((x) => x.id === state.editingId);
        state.editingImage = p ? p.image : "";
      }
    };
    // نحفظ الصورة الحالية عند بدء التعديل
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-edit]")) saveEditingImage();
    });

    $("#pImageUrl").addEventListener("input", (e) => {
      const v = e.target.value.trim();
      state.imageUrl = v;
      if (v) {
        state.imageFile = null;
        renderUploadPreview(v);
        $("#clearImageBtn").hidden = false;
      }
    });

    $("#pickImageBtn").addEventListener("click", () => $("#pImageFile").click());
    $("#uploadBox").addEventListener("click", () => $("#pImageFile").click());
    $("#pImageFile").addEventListener("change", (e) => handleFile(e.target.files[0]));

    ["dragenter", "dragover"].forEach((ev) =>
      $("#uploadBox").addEventListener(ev, (e) => {
        e.preventDefault();
        $("#uploadBox").classList.add("is-drag");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      $("#uploadBox").addEventListener(ev, (e) => {
        e.preventDefault();
        $("#uploadBox").classList.remove("is-drag");
      })
    );
    $("#uploadBox").addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      handleFile(file);
    });

    $("#clearImageBtn").addEventListener("click", () => {
      state.imageFile = null;
      state.imageUrl = "";
      state.editingImage = "";
      $("#pImageFile").value = "";
      $("#pImageUrl").value = "";
      $("#clearImageBtn").hidden = true;
      renderUploadPreview(null);
    });

    $("#adminSearch").addEventListener("input", (e) => {
      state.search = e.target.value;
      renderAdminProducts();
    });

    $("#adminProducts").addEventListener("click", async (e) => {
      const row = e.target.closest(".adm-product");
      if (!row) return;
      const id = row.dataset.id;
      const p = state.products.find((x) => x.id === id);
      if (!p) return;

      if (e.target.closest("[data-edit]")) {
        state.editingImage = p.image || "";
        fillForm(p);
        return;
      }

      if (e.target.closest("[data-toggle-avail]")) {
        try {
          await CA_DB.updateProduct(id, { available: p.available === false });
          toast(p.available === false ? "أصبح المنتج متوفرًا" : "أُخفي المنتج كغير متوفر");
          await loadProducts();
        } catch (err) {
          toast("تعذّر التحديث");
        }
        return;
      }

      if (e.target.closest("[data-delete]")) {
        if (!confirm(`حذف «${p.name}» نهائيًا من المتجر؟`)) return;
        try {
          await CA_DB.deleteProduct(id);
          toast("تم حذف المنتج");
          await loadProducts();
          renderCategories();
        } catch (err) {
          toast("تعذّر الحذف");
        }
      }
    });

    $("#resetDemoBtn").addEventListener("click", async () => {
      if (!confirm("استعادة المنتجات الافتراضية؟ سيتم استبدال القائمة الحالية.")) return;
      await CA_DB.resetDemoProducts();
      await loadProducts();
      toast("تمت استعادة المنتجات الافتراضية");
    });

    initSettingsForm();
  }

  /* ---------------- boot ---------------- */
  let booted = false;

  async function bootDashboard() {
    if (booted) return;
    booted = true;
    await CA_DB.ready;
    await Promise.all([loadProducts(), loadSettings()]);
    renderCategories();
    bindDashboardEvents();
    resetForm();

    $("#demoResetPanel").hidden = CA_DB.isLive;

    const pill = $("#statusPill");
    if (CA_DB.isLive) {
      pill.className = "status-pill is-live";
      pill.innerHTML = "<i></i> متصل بـ Firebase";
    } else {
      pill.className = "status-pill is-demo";
      pill.innerHTML = "<i></i> وضع تجريبي · بيانات محلية";
    }
  }

  async function init() {
    await CA_DB.ready;

    if (!CA_DB.configured) $("#demoHint").hidden = false;

    initAuth();

    CA_DB.onAuth((user) => {
      if (user) showDashboard(user);
      else showLogin();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
