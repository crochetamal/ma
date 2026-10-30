/* ============================================================
   طبقة البيانات: Firebase (Firestore + Auth + Storage)
   مع وضع تجريبي محلي (localStorage) يعمل بدون أي إعدادات.
   ============================================================ */

window.CA_DB = (function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const looksConfigured =
    !!cfg.apiKey &&
    !!cfg.projectId &&
    !/^\s*$/.test(cfg.apiKey) &&
    !cfg.apiKey.includes("PASTE") &&
    !cfg.apiKey.includes("ضع");

  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const LS_PRODUCTS = "ca_demo_products_v1";
  const LS_SETTINGS = "ca_demo_settings_v1";
  const LS_SESSION = "ca_demo_session";

  let live = false;
  let bootError = null;
  let fb = null; // { app, db, auth, storage, api }

  const listeners = new Set();

  /* ---------------- helpers ---------------- */
  const readLS = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const writeLS = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  };

  const slug = (text) =>
    String(text || "product")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "product";

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function seedIfNeeded() {
    const stored = readLS(LS_PRODUCTS, null);
    if (!stored) {
      writeLS(LS_PRODUCTS, window.CA_SEED_PRODUCTS || []);
    }
    const settings = readLS(LS_SETTINGS, null);
    if (!settings) {
      writeLS(LS_SETTINGS, window.CA_DEFAULT_SETTINGS || {});
    }
  }

  seedIfNeeded();

  /* ---------------- boot ---------------- */
  async function boot() {
    if (!looksConfigured) {
      live = false;
      notify();
      return { live: false, reason: "unconfigured" };
    }
    try {
      const [appMod, authMod, fsMod, stMod] = await Promise.all([
        import(SDK + "firebase-app.js"),
        import(SDK + "firebase-auth.js"),
        import(SDK + "firebase-firestore.js"),
        import(SDK + "firebase-storage.js"),
      ]);

      const app = appMod.initializeApp(cfg);
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      let storage = null;
      try {
        storage = stMod.getStorage(app);
      } catch (e) {
        storage = null;
      }

      fb = {
        app,
        auth,
        db,
        storage,
        api: {
          ...appMod,
          ...authMod,
          ...fsMod,
          ...(storage ? stMod : {}),
        },
        authMod,
        fsMod,
        stMod,
      };

      live = true;
      notify();
      return { live: true };
    } catch (err) {
      console.warn("[Crochet Amal] تعذّر الاتصال بـ Firebase، سيتم استخدام الوضع التجريبي:", err);
      bootError = err;
      live = false;
      notify();
      return { live: false, reason: "sdk-error", error: err };
    }
  }

  const ready = boot();

  /* ---------------- change notification ---------------- */
  function notify() {
    listeners.forEach((fn) => {
      try {
        fn({ live });
      } catch (e) {
        /* noop */
      }
    });
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /* ---------------- products ---------------- */
  function normalizeProduct(id, data) {
    let createdAt = data.createdAt || null;
    if (createdAt && typeof createdAt.toDate === "function") createdAt = createdAt.toDate().toISOString();
    else if (createdAt && typeof createdAt === "object" && createdAt.seconds) {
      createdAt = new Date(createdAt.seconds * 1000).toISOString();
    }
    return {
      id,
      name: data.name || "بدون اسم",
      description: data.description || "",
      price: Number(data.price) || 0,
      oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
      category: data.category || "إكسسوارات",
      image: data.image || "assets/img/p-flowers.jpg",
      images: Array.isArray(data.images) ? data.images : [],
      available: data.available !== false,
      featured: data.featured === true,
      order: Number(data.order) || 0,
      createdAt,
    };
  }

  async function getProducts() {
    await ready;
    if (!live) {
      const list = readLS(LS_PRODUCTS, []);
      return list.map((p) => normalizeProduct(p.id, p));
    }
    const { api, db, fsMod } = fb;
    try {
      const snap = await api.getDocs(api.collection(db, "products"));
      return snap.docs.map((d) => normalizeProduct(d.id, d.data()));
    } catch (err) {
      console.error("[Crochet Amal] فشل تحميل المنتجات:", err);
      throw err;
    }
  }

  async function addProduct(data) {
    await ready;
    const payload = {
      name: data.name,
      description: data.description || "",
      price: Number(data.price) || 0,
      oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
      category: data.category || "إكسسوارات",
      image: data.image || "",
      available: data.available !== false,
      featured: data.featured === true,
      order: Number(data.order) || 0,
    };

    if (!live) {
      const list = readLS(LS_PRODUCTS, []);
      const id = newId();
      const next = [{ ...payload, id, createdAt: new Date().toISOString() }, ...list];
      const stored = writeLS(LS_PRODUCTS, next);
      if (!stored || !readLS(LS_PRODUCTS, []).some((p) => p.id === id)) {
        throw new Error("مساحة التخزين المحلية ممتلئة. اربطي Firebase أو استخدمي صورة أصغر.");
      }
      return { id };
    }

    const { api, db } = fb;
    payload.createdAt = api.serverTimestamp();
    const ref = await api.addDoc(api.collection(db, "products"), payload);
    return { id: ref.id };
  }

  async function updateProduct(id, data) {
    await ready;
    if (!live) {
      const list = readLS(LS_PRODUCTS, []);
      const next = list.map((p) => (p.id === id ? { ...p, ...data } : p));
      if (!writeLS(LS_PRODUCTS, next)) {
        throw new Error("مساحة التخزين المحلية ممتلئة. اربطي Firebase أو استخدمي صورة أصغر.");
      }
      return;
    }
    const { api, db } = fb;
    const payload = { ...data };
    delete payload.id;
    delete payload.createdAt;
    await api.updateDoc(api.doc(db, "products", id), payload);
  }

  async function deleteProduct(id) {
    await ready;
    if (!live) {
      writeLS(LS_PRODUCTS, readLS(LS_PRODUCTS, []).filter((p) => p.id !== id));
      return;
    }
    const { api, db } = fb;
    await api.deleteDoc(api.doc(db, "products", id));
  }

  async function resetDemoProducts() {
    writeLS(LS_PRODUCTS, window.CA_SEED_PRODUCTS || []);
  }

  /* ---------------- settings ---------------- */
  async function getSettings() {
    await ready;
    if (!live) {
      return { ...(window.CA_DEFAULT_SETTINGS || {}), ...readLS(LS_SETTINGS, {}) };
    }
    const { api, db } = fb;
    try {
      const snap = await api.getDoc(api.doc(db, "settings", "site"));
      return { ...(window.CA_DEFAULT_SETTINGS || {}), ...(snap.exists() ? snap.data() : {}) };
    } catch (err) {
      console.warn("[Crochet Amal] تعذّر تحميل الإعدادات:", err);
      return { ...(window.CA_DEFAULT_SETTINGS || {}) };
    }
  }

  async function saveSettings(data) {
    await ready;
    if (!live) {
      writeLS(LS_SETTINGS, { ...readLS(LS_SETTINGS, {}), ...data });
      return;
    }
    const { api, db } = fb;
    await api.setDoc(api.doc(db, "settings", "site"), data, { merge: true });
  }

  /* ---------------- auth ---------------- */
  const demoSession = () => readLS(LS_SESSION, null);

  function currentUser() {
    if (!live) return demoSession();
    return (fb && fb.auth.currentUser) || null;
  }

  function onAuth(cb) {
    if (!live) {
      cb(demoSession());
      return () => {};
    }
    return fb.authMod.onAuthStateChanged(fb.auth, (u) =>
      cb(u ? { uid: u.uid, email: u.email, demo: false } : null)
    );
  }

  async function signIn(email, password) {
    await ready;
    if (!live) {
      if (password !== (window.CA_DEMO_PASSWORD || "amal1234")) {
        throw new Error("كلمة المرور التجريبية غير صحيحة.");
      }
      const user = { email: email || "demo@crochetamal.com", demo: true };
      writeLS(LS_SESSION, user);
      notify();
      return user;
    }
    const { api, auth } = fb;
    const cred = await api.signInWithEmailAndPassword(auth, email.trim(), password);
    return { uid: cred.user.uid, email: cred.user.email, demo: false };
  }

  async function signOut() {
    await ready;
    if (!live) {
      localStorage.removeItem(LS_SESSION);
      notify();
      return;
    }
    await fb.api.signOut(fb.auth);
  }

  /* ---------------- storage ---------------- */
  async function uploadImage(file) {
    await ready;
    if (!live || !fb.storage) {
      return await fileToDataUrl(file);
    }
    const { api, storage } = fb;
    const path = `products/${Date.now()}-${slug(file.name).slice(0, 40)}`;
    const ref = api.ref(storage, path);
    await api.uploadBytes(ref, file, { contentType: file.type });
    return await api.getDownloadURL(ref);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return {
    ready,
    onChange,
    get isLive() {
      return live;
    },
    get bootError() {
      return bootError;
    },
    configured: looksConfigured,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    resetDemoProducts,
    getSettings,
    saveSettings,
    currentUser,
    onAuth,
    signIn,
    signOut,
    uploadImage,
    categories: () => window.CA_CATEGORIES || [],
  };
})();
