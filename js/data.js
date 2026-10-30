/* ============================================================
   بيانات المتجر الافتراضية
   تُستخدم في وضع العرض التجريبي (قبل ربط Firebase أو قبل إضافة منتجات)
   ============================================================ */

window.CA_CATEGORIES = [
  "حقائب",
  "ألعاب أطفال",
  "ملابس",
  "مفارش وبطانيات",
  "ورود وهدايا",
  "إكسسوارات",
];

window.CA_SEED_PRODUCTS = [
  {
    id: "demo-tote",
    name: "حقيبة كتف بالوردة الكروشيه",
    description:
      "حقيبة يدوية من القطن الطبيعي بنقشة الوردة، مبطنة من الداخل بقماش كتان وزر خشبي. تتسع للأغراض اليومية واللابتوب الصغير.",
    price: 320,
    oldPrice: 380,
    category: "حقائب",
    image: "assets/img/p-tote.jpg",
    available: true,
    featured: true,
    createdAt: null,
  },
  {
    id: "demo-bunny",
    name: "أرنوبة أميجورومي «لولو»",
    description:
      "لعبة قطنية ناعمة مصنوعة غرزة بغرزة، حشوة مضادة للحساسية وآمنة للأطفال، بأذنين طويلتين وفيونكة وردية. مثالية كهدية مولود.",
    price: 180,
    category: "ألعاب أطفال",
    image: "assets/img/p-bunny.jpg",
    available: true,
    featured: true,
    createdAt: null,
  },
  {
    id: "demo-blanket",
    name: "بطانية مولود بحافة مموّجة",
    description:
      "بطانية دافئة وخفيفة من خيوط القطن الممزوج، مقاس ٨٠×١٠٠ سم، بلون البيج الهادئ وحافة مموّجة، مناسبة للمواليد والهدايا.",
    price: 450,
    category: "مفارش وبطانيات",
    image: "assets/img/p-blanket.jpg",
    available: true,
    featured: true,
    createdAt: null,
  },
  {
    id: "demo-flowers",
    name: "باقة ورود كروشيه دائمة",
    description:
      "باقة من ست وردات بألوان الطين والكريمي، ملفوفة بورق كرافت. لا تذبل أبدًا وتبقى ذكرى جميلة للمناسبات.",
    price: 160,
    oldPrice: 200,
    category: "ورود وهدايا",
    image: "assets/img/p-flowers.jpg",
    available: true,
    featured: false,
    createdAt: null,
  },
  {
    id: "demo-keychain",
    name: "طقم سلاسل مفاتيح (٣ قطع)",
    description:
      "ثلاث سلاسل صغيرة على شكل وردة وقلب، بحلقة معدنية ذهبية. لمسة لطيفة للشنطة أو المفاتيح.",
    price: 45,
    category: "إكسسوارات",
    image: "assets/img/p-keychain.jpg",
    available: true,
    featured: false,
    createdAt: null,
  },
  {
    id: "demo-cardigan",
    name: "كارديجان كروشيه أخضر زيتي",
    description:
      "كارديجان قصير بغرزة الصدفة، متوفر بالمقاسات S / M / L. يمكن طلبه بلون آخر حسب رغبتك، مدة التحضير من ٧ إلى ١٠ أيام.",
    price: 520,
    category: "ملابس",
    image: "assets/img/p-cardigan.jpg",
    available: false,
    featured: false,
    createdAt: null,
  },
];

window.CA_DEFAULT_SETTINGS = {
  whatsapp: "212600000000",
  instagram: "crochet_amal",
  facebook: "",
  email: "hello@crochetamal.com",
  announcement: "توصيل لجميع مدن المغرب · صناعة يدوية 100% · اطلبي الآن عبر واتساب",
};
