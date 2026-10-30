/* ============================================================
   طبقة البيانات — Firebase فقط (Firestore + Auth + Storage)
   لا يوجد أي وضع تجريبي: كل ما يُعرض في المتجر يأتي من Firestore.
   ============================================================ */

window.CA_DB = (function () {
  const cfg = window.FIREBASE_CONFIG || {};
  // يمكن تجاوز المصدر لاستضافة SDK محليًا أو للاختبار
  const SDK = window.CA_FIREBASE_SDK_BASE || "https://www.gstatic.com/firebasejs/10.12.2/";

  const configured =
    !!cfg.apiKey && !!cfg.projectId && !!cfg.appId && !String(cfg.apiKey).includes("PASTE");

  let live = false;
  let bootError = null;
  let bootPromise = null;
  let fb = null;

  const listeners = new Set();

  const slug = (text) =>
    String(text || "image")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "image";

  /* ---------------- boot ---------------- */
  function boot() {
    if (bootPromise) return bootPromise;

    bootPromise = (async () => {
      if (!configured) {
        bootError = new Error("إعدادات Firebase غير مكتملة في js/firebase-config.js");
        return { live: false, error: bootError };
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
        auth.languageCode = "ar";
        const db = fsMod.getFirestore(app);
        let storage = null;
        try {
          storage = stMod.getStorage(app);
        } catch (e) {
          storage = null;
        }

        fb = {
          auth,
          db,
          storage,
          appMod,
          authMod,
          fsMod,
          stMod,
          authFns: authMod,
          fsFns: fsMod,
          stFns: stMod,
        };

        live = true;
        notify();
        return { live: true };
      } catch (err) {
        console.error("[Crochet Amal] تعذّر تهيئة Firebase:", err);
        bootError = err;
        live = false;
        notify();
        return { live: false, error: err };
      }
    })();

    return bootPromise;
  }

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

  /* ---------------- errors ---------------- */
  function humanError(err) {
    if (!err) return "حدث خطأ غير معروف.";
    const code = err.code || "";
    const map = {
      "auth/invalid-api-key": "مفتاح API غير صحيح — راجعي js/firebase-config.js",
      "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
        "مفتاح API غير صحيح — راجعي js/firebase-config.js",
      "auth/user-not-found": "لا يوجد مستخدم بهذا البريد.",
      "auth/wrong-password": "كلمة المرور غير صحيحة.",
      "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.",
      "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
      "auth/too-many-requests": "محاولات كثيرة — حاولي بعد قليل.",
      "auth/operation-not-allowed":
        "طريقة الدخول بالبريد غير مفعّلة. فعّلي Email/Password في Firebase ← Authentication.",
      "auth/unauthorized-domain":
        "هذا النطاق غير مسموح. أضيفيه في Firebase ← Authentication ← Settings ← Authorized domains.",
      "auth/network-request-failed": "تعذّر الاتصال بالشبكة. تحققي من الإنترنت.",
      "permission-denied":
        "صلاحيات غير كافية. تأكدي من نشر قواعد Firestore ومن تسجيل الدخول.",
      unavailable: "تعذّر الوصول إلى قاعدة البيانات. تحققي من الاتصال أو أن Firestore مُنشأ.",
      "failed-precondition":
        "Firestore غير مُنشأ بعد. أنشئيه من Firebase Console ← Firestore Database.",
      "not-found": "العنصر غير موجود.",
      "storage/unauthorized": "غير مصرّح برفع الصور. راجعي قواعد Storage وتسجيل الدخول.",
      "storage/retry-limit-exceeded": "انتهت مهلة رفع الصورة. تحققي من الاتصال.",
      "storage/unknown": "تعذّر رفع الصورة. تأكدي من تفعيل Storage.",
    };
    return map[code] || err.message || "حدث خطأ غير متوقع.";
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
      image: data.image || "",
      available: data.available !== false,
      featured: data.featured === true,
      order: Number(data.order) || 0,
      createdAt,
    };
  }

  async function getProducts() {
    const res = await boot();
    if (!res.live) throw bootError || new Error("Firebase غير مهيّأ");
    const { fsFns, db } = fb;
    const snap = await fsFns.getDocs(fsFns.collection(db, "products"));
    return snap.docs.map((d) => normalizeProduct(d.id, d.data()));
  }

  function cleanPayload(data) {
    return {
      name: String(data.name || "").trim(),
      description: String(data.description || "").trim(),
      price: Number(data.price) || 0,
      oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
      category: String(data.category || "إكسسوارات").trim(),
      image: data.image || "",
      available: data.available !== false,
      featured: data.featured === true,
      order: Number(data.order) || 0,
    };
  }

  async function addProduct(data) {
    const res = await boot();
    if (!res.live) throw bootError || new Error("Firebase غير مهيّأ");
    const { fsFns, db } = fb;
    const payload = cleanPayload(data);
    payload.createdAt = fsFns.serverTimestamp();
    const ref = await fsFns.addDoc(fsFns.collection(db, "products"), payload);
    return { id: ref.id };
  }

  async function updateProduct(id, data) {
    const res = await boot();
    if (!res.live) throw bootError || new Error("Firebase غير مهيّأ");
    const { fsFns, db } = fb;
    const payload = cleanPayload(data);
    await fsFns.updateDoc(fsFns.doc(db, "products", id), payload);
  }

  async function deleteProduct(id) {
    const res = await boot();
    if (!res.live) throw bootError || new Error("Firebase غير مهيّأ");
    const { fsFns, db } = fb;
    await fsFns.deleteDoc(fsFns.doc(db, "products", id));
  }

  /**
   * استيراد منتجات البداية (٦ قطع بصورها الجاهزة) إلى Firestore.
   * تُستخدم مرة واحدة من لوحة التحكم بعد تسجيل الدخول.
   */
  async function seedStarterProducts() {
    const res = await boot();
    if (!res.live) throw bootError || new Error("Firebase غير مهيّأ");
    const { fsFns, db } = fb;
    const seeds = window.CA_SEED_PRODUCTS || [];
    if (!seeds.length) throw new Error("لا توجد منتجات بداية في js/data.js");

    const col = fsFns.collection(db, "products");
    await Promise.all(
      seeds.map((p) =>
        fsFns.addDoc(col, {
          name: p.name,
          description: p.description || "",
          price: Number(p.price) || 0,
          oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
          category: p.category || "إكسسوارات",
          image: p.image || "",
          available: p.available !== false,
          featured: p.featured === true,
          order: Number(p.order) || 0,
          createdAt: fsFns.serverTimestamp(),
        })
      )
    );
    return seeds.length;
  }

  /* ---------------- settings ---------------- */
  async function getSettings() {
    const res = await boot();
    if (!res.live) return { ...(window.CA_DEFAULT_SETTINGS || {}) };
    const { fsFns, db } = fb;
    try {
      const snap = await fsFns.getDoc(fsFns.doc(db, "settings", "site"));
      return { ...(window.CA_DEFAULT_SETTINGS || {}), ...(snap.exists() ? snap.data() : {}) };
    } catch (err) {
      console.warn("[Crochet Amal] تعذّر تحميل الإعدادات:", err);
      return { ...(window.CA_DEFAULT_SETTINGS || {}) };
    }
  }

  async function saveSettings(data) {
    const res = await boot();
    if (!res.live) throw bootError || new Error("Firebase غير مهيّأ");
    const { fsFns, db } = fb;
    await fsFns.setDoc(fsFns.doc(db, "settings", "site"), data, { merge: true });
  }

  /* ---------------- auth ---------------- */
  function currentUser() {
    return (live && fb && fb.auth.currentUser) || null;
  }

  function onAuth(cb) {
    if (!live) {
      cb(null);
      return () => {};
    }
    return fb.authMod.onAuthStateChanged(fb.auth, (u) =>
      cb(u ? { uid: u.uid, email: u.email } : null)
    );
  }

  async function signIn(email, password) {
    const res = await boot();
    if (!res.live) throw bootError || new Error("Firebase غير مهيّأ");
    const user = await fb.authMod.signInWithEmailAndPassword(
      fb.auth,
      String(email || "").trim(),
      password
    );
    return { uid: user.user.uid, email: user.user.email };
  }

  async function signOut() {
    if (!live) return;
    await fb.authMod.signOut(fb.auth);
  }

  /* ---------------- storage ---------------- */
  async function uploadImage(file) {
    const res = await boot();
    if (!res.live || !fb.storage) {
      throw new Error("Storage غير مفعّل في Firebase — فعّليه ثم أعيدي المحاولة.");
    }
    const path = `products/${Date.now()}-${slug(file.name).slice(0, 40)}.jpg`;
    const ref = fb.stFns.ref(fb.storage, path);
    await fb.stFns.uploadBytes(ref, file, { contentType: file.type || "image/jpeg" });
    return await fb.stFns.getDownloadURL(ref);
  }

  const ready = boot();

  return {
    ready,
    boot,
    onChange,
    humanError,
    get isLive() {
      return live;
    },
    get bootError() {
      return bootError;
    },
    configured,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    seedStarterProducts,
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
