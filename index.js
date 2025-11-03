// // // index.js (server entry)
// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const path = require("path");
// const db = require("./config/db");

// // ---- Create app & config ----
// const app = express();
// const PORT = process.env.PORT || 5000;



// // View engine: EJS
// app.set("views", path.join(__dirname, "views"));
// app.set("view engine", "ejs");

// // ---- Middleware ----
// app.use(cors());
// app.use(express.json({ limit: "200mb" }));
// app.use(express.urlencoded({ limit: "200mb", extended: true }));

// // ---- Static files ----
// // Serve everything under /public at the web root (/, /images, /assets, etc.)
// app.use(express.static(path.join(__dirname, "public")));



// // ---- API Routes ----
// app.use("/api/articles", require("./routes/articleRoutes"));
// app.use("/api/books", require("./routes/bookRoutes"));
// app.use("/api/feedback", require("./routes/feedbackRoutes"));
// app.use("/api/questions", require("./routes/questionRoutes"));
// app.use("/api/topics", require("./routes/topicRoutes"));
// app.use("/api/translators", require("./routes/translatorRoutes"));
// app.use("/api/admin", require("./routes/adminRoutes"));
// app.use("/api/writers", require("./routes/writerRoutes"));
// app.use("/api/tags", require("./routes/tagRoutes"));
// app.use("/api/events", require("./routes/eventRoutes"));
// app.use("/api/languages", require("./routes/languageRoutes"));
// app.use("/api/about", require("./routes/aboutContentRoutes"));
// app.use("/api/bookslider", require("./routes/bookSliderRoutes"));
// app.use("/api/homebookslider", require("./routes/homeBookSliderRoutes"));
// app.use("/api/printedBooks", require("./routes/printedBookRoutes"));
// app.use("/api/requestBook", require("./routes/bookRequestRoutes"));
// app.use("/api/share", require("./routes/shareRoutes"));
// app.use("/api/galleries", require("./routes/galleryRoutes"));

// // ---- SSR Pages (EJS) ----
// // Home page: Views/index.ejs
// app.get("/", (req, res) => {
//   res.render("index"); // no extension needed
// });

// // Articles listing page (your converted EJS):
// // place the file at Views/pages/article.ejs
// app.get("/article", (req, res) => {
//   res.render("pages/article");
// });

// app.get("/book", (req, res) => {
//   res.render("pages/book");
// });

// app.get("/qa", (req, res) => {
//   res.render("pages/qa");
// });

// // Optional: simple health check endpoints for infra
// app.get("/healthz", (req, res) => res.status(200).send("ok"));
// app.get("/readyz", (req, res) => res.status(200).send("ready"));

// // ---- 404 handler (for unknown routes) ----
// app.use((req, res, next) => {
//   if (req.path.startsWith("/api/")) {
//     return res.status(404).json({ error: "API route not found" });
//   }
//   // For non-API, show a friendly 404 page or text
//   res.status(404).send("Page not found");
// });

// // ---- Error handler ----
// /* eslint-disable no-unused-vars */
// app.use((err, req, res, next) => {
//   console.error("Unhandled error:", err);
//   const status = err.status || 500;
//   const message = err.message || "Internal Server Error";
//   if (req.path.startsWith("/api/")) {
//     return res.status(status).json({ error: message });
//   }
//   res.status(status).send(message);
// });
// /* eslint-enable no-unused-vars */

// // ---- Start server ----
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);

//   // Test DB connection once at boot
//   db.getConnection((err, connection) => {
//     if (err) {
//       console.error("❌ Database connection failed:", err.message);
//     } else {
//       console.log("✅ MySQL database connected successfully.");
//       connection.release();
//     }
//   });
// });






// // index.js (server entry)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const db = require("./config/db");

// ---- Create app & config ----
const app = express();
const PORT = process.env.PORT || 5000;
 
// If you want to point to a different upstream later, put it in .env
// e.g. API_UPSTREAM=https://api.minaramasjid.com/api
const API_UPSTREAM =
  (process.env.API_UPSTREAM && process.env.API_UPSTREAM.replace(/\/+$/, "")) ||
  "https://minaramasjid-backend.onrender.com/api";

// View engine: EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---- Middleware ----
app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// ---- Static files ----
app.use(express.static(path.join(__dirname, "public")));

// ============ Helpers (used by SSR home) ============
const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()؟“”"’']/g, "")
    .replace(/-+/g, "-");

const stripTags = (html = "") => String(html).replace(/<[^>]*>/g, "");
const clamp = (str = "", n = 160) =>
  str.length <= n ? str : str.slice(0, n).trim() + "…";

const formatDate = (raw) => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

async function fetchJSON(url) {
  const res = await axios.get(url, { timeout: 15000 });
  return res.data;
}

// Pull home-page data server-side so the client never sees upstream API calls
async function getHomeData() {
  try {
    const [articles, writers, books, events] = await Promise.all([
      fetchJSON(`${API_UPSTREAM}/articles`),
      fetchJSON(`${API_UPSTREAM}/writers`),
      fetchJSON(`${API_UPSTREAM}/books`),
      fetchJSON(`${API_UPSTREAM}/events`),
    ]);

    const normArticles = (Array.isArray(articles) ? articles : []).map((a) => ({
      id: a.id,
      title: a.title || "",
      englishDescription: a.englishDescription || "",
      urduDescription: a.urduDescription || "",
      views: a.views ?? 0,
      date: formatDate(a.date || a.createdOn || a.modifiedOn),
      topic: a.topic || "",
      writers: a.writers || a.writer || "",
      translator: a.translator || "",
      slug: slugify(a.title || `article-${a.id}`),
      imageSrc: `/api/articles/image/${a.id}`, // proxied below
      safeText: clamp(stripTags(a.urduDescription || a.englishDescription || "")),
    }));

    const normEvents = (Array.isArray(events) ? events : []).map((e) => ({
      id: e.id,
      title: e.title || "",
      content: e.content || "",
      views: e.views ?? 0,
      date: formatDate(e.date || e.createdOn || e.modifiedOn),
      slug: slugify(e.title || `event-${e.id}`),
      imageSrc: `/api/events/image/${e.id}`, // proxied
      safeText: clamp(stripTags(e.content || "")),
    }));

    const normBooks = (Array.isArray(books) ? books : []).map((b) => ({
      id: b.id,
      title: b.title || "",
      author: b.author || b.writer || "Unknown",
      translator: b.translator || "N/A",
      views: b.views ?? 0,
      downloads: b.downloads ?? 0,
      slug: slugify(b.title || `book-${b.id}`),
      imageSrc: `/api/books/cover/${b.id}`, // proxied
      subTitle: b.subTitle || b.description || "",
    }));

    const normWriters = (Array.isArray(writers) ? writers : []).map((w) => ({
      id: w.id,
      name: w.name || "",
      designation: w.designation || "Islamic Scholar",
      imageSrc: `/api/writers/image/${w.id}`, // proxied
    }));

    return { articles: normArticles, events: normEvents, books: normBooks, writers: normWriters };
  } catch (err) {
    console.error("Home data fetch failed:", err?.message || err);
    return { articles: [], events: [], books: [], writers: [] };
  }
}

// ============ Image Proxy Routes (hide upstream) ============
// Order matters: put these BEFORE your routers in case those routers don’t define these paths.

async function proxyImage(res, url, fallbackPath = "/assets/image/default/articles.jpeg") {
  try {
    const upstream = await axios.get(url, { responseType: "stream", timeout: 15000 });
    if (upstream.headers["content-type"]) {
      res.set("Content-Type", upstream.headers["content-type"]);
    }
    res.set("Cache-Control", "public, max-age=600");
    upstream.data.pipe(res);
  } catch (e) {
    // fallback to local placeholder inside /public if you have it;
    // else this will 302 to a remote placeholder below.
    if (fallbackPath.startsWith("http")) {
      res.redirect(fallbackPath);
    } else {
      // try local public file, otherwise remote hardcoded placeholder
      res.redirect(fallbackPath || "https://minaramasjid.com/assets/image/default/articles.jpeg");
    }
  }
}

// Books cover: /api/books/cover/:id
app.get("/api/books/cover/:id", async (req, res) => {
  const { id } = req.params;
  await proxyImage(
    res,
    `${API_UPSTREAM}/books/cover/${id}`,
    "/assets/image/default/articles.jpeg"
  );
});

// Articles image: /api/articles/image/:id
app.get("/api/articles/image/:id", async (req, res) => {
  const { id } = req.params;
  await proxyImage(
    res,
    `${API_UPSTREAM}/articles/image/${id}`,
    "/assets/image/default/articles.jpeg"
  );
});

// Events image: /api/events/image/:id
app.get("/api/events/image/:id", async (req, res) => {
  const { id } = req.params;
  await proxyImage(
    res,
    `${API_UPSTREAM}/events/image/${id}`,
    "/assets/image/default/articles.jpeg"
  );
});

// Writers image: /api/writers/image/:id
app.get("/api/writers/image/:id", async (req, res) => {
  const { id } = req.params;
  await proxyImage(
    res,
    `${API_UPSTREAM}/writers/image/${id}`,
    "/assets/image/default/writer.jpeg"
  );
});

// ---- API Routes (your existing JSON APIs) ----
app.use("/api/articles", require("./routes/articleRoutes"));
app.use("/api/books", require("./routes/bookRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/questions", require("./routes/questionRoutes"));
app.use("/api/topics", require("./routes/topicRoutes"));
app.use("/api/translators", require("./routes/translatorRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/writers", require("./routes/writerRoutes"));
app.use("/api/tags", require("./routes/tagRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/languages", require("./routes/languageRoutes"));
app.use("/api/about", require("./routes/aboutContentRoutes"));
app.use("/api/bookslider", require("./routes/bookSliderRoutes"));
app.use("/api/homebookslider", require("./routes/homeBookSliderRoutes"));
app.use("/api/printedBooks", require("./routes/printedBookRoutes"));
app.use("/api/requestBook", require("./routes/bookRequestRoutes"));
app.use("/api/share", require("./routes/shareRoutes"));
app.use("/api/galleries", require("./routes/galleryRoutes"));

// ---- SSR Pages (EJS) ----
// Home page: Views/index.ejs
app.get("/", async (req, res) => {
  // Get data server-side (client sees no upstream calls)
  const data = await getHomeData();

  // Limit counts if your index.ejs expects specific grid sizes
  res.render("index", {
    events: data.events.slice(0, 4),
    books: data.books.slice(0, 4),
    articles: data.articles.slice(0, 4),
    writers: data.writers.slice(0, 3),
  });
});

// Articles listing page (your converted EJS):
app.get("/article", (req, res) => {
  res.render("pages/article");
});

app.get("/book", (req, res) => {
  res.render("pages/book");
});

app.get("/qa", (req, res) => {
  res.render("pages/qa");
});

// Optional: simple health check endpoints for infra
app.get("/healthz", (req, res) => res.status(200).send("ok"));
app.get("/readyz", (req, res) => res.status(200).send("ready"));

// ---- 404 handler (for unknown routes) ----
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.status(404).send("Page not found");
});

// ---- Error handler ----
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  if (req.path.startsWith("/api/")) {
    return res.status(status).json({ error: message });
  }
  res.status(status).send(message);
});
/* eslint-enable no-unused-vars */

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Test DB connection once at boot
  db.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Database connection failed:", err.message);
    } else {
      console.log("✅ MySQL database connected successfully.");
      connection.release();
    }
  });
});
 