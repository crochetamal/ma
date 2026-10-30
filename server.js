/* ============================================================
   خادم ملفات ثابت بسيط للتطوير المحلي (بدون أي تبعيات)
   التشغيل:  npm run dev    أو    node server.js
   المنفذ:   PORT (افتراضي 3000)
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      const fallback404 = path.join(ROOT, "index.html");
      if (urlPath !== "/" && !path.extname(urlPath)) {
        // صفحات SPA-like: أعد index
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        fs.createReadStream(fallback404).pipe(res);
      } else {
        res.writeHead(404, { "Content-Type": MIME[".html"] });
        res.end("<h1 style='font-family:sans-serif;padding:2rem'>404 — الصفحة غير موجودة</h1>");
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500).end("Server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`✦ Crochet Amal — http://localhost:${PORT}`);
  console.log(`  المتجر:   http://localhost:${PORT}/index.html`);
  console.log(`  التحكم:   http://localhost:${PORT}/admin.html`);
});
