/* ============================================================
   إعدادات Firebase
   ------------------------------------------------------------
   1) أنشئي مشروعًا على https://console.firebase.google.com
   2) Authentication ← Sign-in method ← فعّلي Email/Password
      ثم أضيفي مستخدمًا (بريد + كلمة مرور) للوحة التحكم.
   3) Firestore Database ← Create database (production mode)
   4) Storage ← Get started   (لرفع صور المنتجات)
   5) Project settings ← Your apps ← Web app ← انسخي القيم هنا.
   ------------------------------------------------------------
   إذا تُركت القيم فارغة، يعمل الموقع تلقائيًا في «الوضع التجريبي»
   (منتجات محلية + لوحة تحكم بكلمة مرور تجريبية).
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

/* كلمة مرور الوضع التجريبي فقط (عندما لا يكون Firebase مضبوطًا) */
window.CA_DEMO_PASSWORD = "amal1234";
