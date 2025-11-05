// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * API base used by SSR routes.
 * Always prefer the same process host so it works locally and on Render.
 */
const apiBaseFromReq = (req) => `https://minaramasjid-backend.onrender.com/api`;

// ---- View engine ----
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---- Middleware ----
app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// ---- Static files ----
app.use(express.static(path.join(__dirname, "public")));

// ================= Helpers =================
const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()؟“”"’']/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripTags = (html = "") => String(html).replace(/<[^>]*>/g, "");
const stripHTML = (html = "") =>
  String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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

// Light, dependency-free sanitizer
function sanitizeHtml(unsafeHtml = "") {
  return String(unsafeHtml)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

const detectDirection = (s = "") =>
  /[\u0600-\u06FF]/.test(String(s)) ? "rtl" : "ltr";

async function fetchJSON(url) {
  const res = await axios.get(url, { timeout: 15000 });
  return res.data;
}

async function getHomeData(API_BASE) {
  try {
    const [articles, writers, books, events] = await Promise.all([
      fetchJSON(`${API_BASE}/articles`),
      fetchJSON(`${API_BASE}/writers`),
      fetchJSON(`${API_BASE}/books`),
      fetchJSON(`${API_BASE}/events`),
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
      imageSrc: `/api/articles/image/${a.id}`,
      safeText: clamp(stripTags(a.urduDescription || a.englishDescription || "")),
    }));

    const normEvents = (Array.isArray(events) ? events : []).map((e) => ({
      id: e.id,
      title: e.title || "",
      content: e.content || "",
      views: e.views ?? 0,
      date: formatDate(e.date || e.createdOn || e.modifiedOn),
      slug: slugify(e.title || `event-${e.id}`),
      imageSrc: `/api/events/image/${e.id}`,
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
      imageSrc: `/api/books/cover/${b.id}`,
      subTitle: b.subTitle || b.description || "",
    }));

    const normWriters = (Array.isArray(writers) ? writers : []).map((w) => ({
      id: w.id,
      name: w.name || "",
      designation: w.designation || "Islamic Scholar",
      imageSrc: `/api/writers/image/${w.id}`,
    }));

    return {
      articles: normArticles,
      events: normEvents,
      books: normBooks,
      writers: normWriters,
    };
  } catch (err) {
    console.error("Home data fetch failed:", err?.message || err);
    return { articles: [], events: [], books: [], writers: [] };
  }
}
 
// ---- API Routes (existing JSON + image endpoints) ----
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
app.get("/", async (req, res) => {
  const data = await getHomeData(apiBaseFromReq(req));
  res.render("index", {
    events: data.events.slice(0, 4),
    books: data.books.slice(0, 4),
    articles: data.articles.slice(0, 4),
    writers: data.writers.slice(0, 3),
  });
});

app.get("/article", (req, res) => res.render("pages/article"));
app.get("/book", (req, res) => res.render("pages/book"));
app.get("/about", (req, res) => res.render("pages/about"));
app.get("/contact", (req, res) => res.render("pages/contact"));


/** ----------------- QA LIST (SSR) /qa ----------------- */
app.get("/qa", async (req, res) => {
  const LOCAL_API_BASE = apiBaseFromReq(req);
  try {
    const [qRes, tRes] = await Promise.all([
      axios.get(`${LOCAL_API_BASE}/questions`, { timeout: 15000 }),
      axios.get(`${LOCAL_API_BASE}/topics`, { timeout: 15000 }).catch(() => ({ data: [] })),
    ]);

    const questions = Array.isArray(qRes.data)
      ? qRes.data
      : (Array.isArray(qRes.data?.data) ? qRes.data.data : []);
    const topics = Array.isArray(tRes.data)
      ? tRes.data
      : (Array.isArray(tRes.data?.data) ? tRes.data.data : []);

    res.render("pages/qa", {
      questions,
      topics,
      apiBase: LOCAL_API_BASE,
    });
  } catch (err) {
    console.error("QA list error:", err?.message || err);
    res.render("pages/qa", {
      questions: [],
      topics: [],
      apiBase: LOCAL_API_BASE,
    });
  }
});



/** ----------------- BOOK DETAIL (SSR) /bookdetail/:id/:slug ----------------- */
app.get("/bookdetail/:id/:slug", async (req, res) => {
  const { id, slug } = req.params;
  const API_BASE = apiBaseFromReq(req);

  try {
    const bookRes = await axios.get(`${API_BASE}/books/${id}`);
    const book = bookRes.data;

    if (!book || !book.title) return res.status(404).send("Book not found");

    const actualSlug = slugify(book.title);
    if (slug !== actualSlug) {
      return res.redirect(301, `/bookdetail/${book.id}/${actualSlug}`);
    }

    const [allBooksRes, writersRes] = await Promise.all([
      axios.get(`${API_BASE}/books`),
      axios.get(`${API_BASE}/writers`),
    ]);

    const allBooks = Array.isArray(allBooksRes.data) ? allBooksRes.data : [];
    const writers = Array.isArray(writersRes.data) ? writersRes.data : [];

    const wanted = (book.author || "").toLowerCase().trim();
    const matchedWriter =
      writers.find((w) => (w.name || "").toLowerCase().trim() === wanted) ||
      null;

    const suggestions = allBooks
      .filter(
        (b) =>
          b.id !== book.id &&
          (b.author || "").toLowerCase().trim() === wanted
      )
      .slice(0, 8);

    const metaTitle = "Book Detail | Maula Ali Research Center";
    const metaDesc =
      stripHTML(book.description || "") ||
      "Read details about this book on Maula Ali Research Centre.";
    const metaImage = `${req.protocol}://${req.get("host")}/api/books/cover/${book.id}`;
    const pageUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const baseHref = 
      process.env.PUBLIC_BASE_HREF ||
      `${req.protocol}://${req.get("host")}/`;

    return res.render("pages/book_view", {
      baseHref,
      pageUrl,
      metaTitle,
      metaDesc: metaDesc.slice(0, 300),
      metaImage,
      book,
      writer: matchedWriter,
      suggestions,
      slugify,
      stripHTML,
    });
  } catch (err) {
    console.error("Book detail error:", err?.response?.status, err?.message);
    return res.status(500).send("Something went wrong");
  }
});

/** ----------------- ARTICLE DETAIL (SSR) /article/:id/:slug ----------------- */
app.get("/article/:id/:slug", async (req, res) => {
  const { id, slug } = req.params;
  const API_BASE = apiBaseFromReq(req);

  try {
    const article = await fetchJSON(`${API_BASE}/articles/${id}`);
    if (!article || !article.title) {
      return res.status(404).send("Article not found");
    }

    const actualSlug = slugify(article.title);
    if (slug !== actualSlug) {
      return res.redirect(301, `/article/${article.id}/${actualSlug}`);
    }

    const allArticles = await fetchJSON(`${API_BASE}/articles`);
 
    const related = (Array.isArray(allArticles) ? allArticles : [])
      .filter((a) => a.id !== article.id)
      .sort((a, b) => (b?.views ?? 0) - (a?.views ?? 0))
      .slice(0, 3);

    const wantedWriter = (article.writers || article.writer || "")
      .toLowerCase()
      .trim();

    let writerHighlights = (Array.isArray(allArticles) ? allArticles : [])
      .filter(
        (a) =>
          a.id !== article.id &&
          (a.writers || a.writer || "").toLowerCase().trim() === wantedWriter
      )
      .slice(0, 3);

    if (!writerHighlights.length) {
      writerHighlights = (Array.isArray(allArticles) ? allArticles : [])
        .filter((a) => a.id !== article.id)
        .sort((a, b) => (b?.views ?? 0) - (a?.views ?? 0))
        .slice(0, 3);
    }

    const metaTitle = `Article Detail | ${article.title} | Maula Ali Research Center`;
    const metaDesc =
      stripHTML(article.englishDescription || article.urduDescription || "") ||
      "Read the full article on Maula Ali Research Centre.";
    const metaImage = `${req.protocol}://${req.get("host")}/api/articles/image/${article.id}`;
    const pageUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const baseHref =
      process.env.PUBLIC_BASE_HREF || `${req.protocol}://${req.get("host")}/`;

    res.render("pages/article_view", {
      baseHref,
      pageUrl,
      metaTitle,
      metaDesc: clamp(metaDesc, 300),
      metaImage,
      article,
      related,
      writerHighlights,
      slugify,
      stripHTML,
    });
  } catch (err) {
    console.error("Article detail error:", err?.response?.status, err?.message);
    res.status(500).send("Something went wrong");
  }
});

/** ----------------- QUESTION DETAIL (SSR) /question/:id/:slug ----------------- */
// helper to build abs urls (kept local to this section)
const absUrl = (req, p) => `${req.protocol}://${req.get("host")}${p.startsWith("/") ? "" : "/"}${p}`;

// Single reusable handler that works for both /question/:id and /question/:id/:slug
async function handleQuestionDetail(req, res) {
  const { id, slug } = req.params;
  const LOCAL_API_BASE = apiBaseFromReq(req);

  try {
    // 1) Fetch by ID (works regardless of slug)
    const qRes = await axios.get(
      `${LOCAL_API_BASE}/questions/${encodeURIComponent(id)}`,
      { timeout: 15000 }
    );

    // Accept plain object or { data: {...} }
    const raw = qRes.data;
    const question =
      (raw && raw.id && raw) ||
      (raw && raw.data && raw.data.id && raw.data) ||
      {};

    if (!question || !question.id) {
      return res.status(404).send("Question not found");
    }

    // 2) Compute canonical slug
    const canonicalBase =
      (question.slug && String(question.slug).trim()) ||
      question.questionEnglish ||
      question.questionUrdu ||
      `question-${question.id}`;
    const actualSlug = slugify(canonicalBase);

    // 3) If slug is missing OR wrong, 301 to canonical
    if (!slug || slug !== actualSlug) {
      return res.redirect(301, `/question/${question.id}/${actualSlug}`);
    }

    // 4) Sidebar / related
    const allRes = await axios.get(`${LOCAL_API_BASE}/questions`, { timeout: 15000 });
    const all = Array.isArray(allRes.data)
      ? allRes.data
      : (Array.isArray(allRes.data?.data) ? allRes.data.data : []);

    const others = all.filter((x) => x.id !== question.id);
    const sidebar = others.slice(0, 5);
    const related = others.slice(0, 13);

    // 5) SEO/meta
    const pageUrl = absUrl(req, req.originalUrl);
    const titleText = stripTags(question.questionEnglish || question.questionUrdu || "").trim();

    const metaTitle = titleText
      ? `${titleText} — Maula Ali Research Center`
      : "Question — Maula Ali Research Center";

    const rawDesc =
      stripTags(String(question.answerEnglish || question.answerUrdu || "")) ||
      titleText ||
      "Question & Answer";

    const metaDesc = clamp(rawDesc, 300);
    const metaImage = absUrl(req, "/assets/og-default.png");

    // 6) Safe HTML blocks
    const questionHTML = sanitizeHtml(String(question.questionEnglish || question.questionUrdu || ""));
    const answerHTML = sanitizeHtml(String(question.answerUrdu || question.answerEnglish || ""));

    // 7) Render
    res.render("pages/question_view", {
      metaTitle,
      metaDesc,
      metaImage,
      pageUrl,
      question,
      sidebar,
      related,
      questionHTML,
      answerHTML,
      slugify,
      detectDirection,
      stripTags,
    });
  } catch (err) {
    console.error("Question detail error:", err?.message || err);
    res.status(500).send("Something went wrong");
  }
}

// Register BOTH routes (no inline ? to keep path-to-regexp happy)
app.get("/question/:id", handleQuestionDetail);
app.get("/question/:id/:slug", handleQuestionDetail);



/** ----------------- EVENTS LIST ----------------- */
app.get("/events", async (req, res) => {
  const API_BASE = apiBaseFromReq(req);
  try {
    const events = await fetchJSON(`${API_BASE}/events`);
    const pageUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    res.render("pages/news_and_event", {
      title: "Events | Maula Ali Research Center",
      description: "minaramasjid.com",
      pageUrl,
      bgUrl: "/images/newbg.png",
      centerLogo: "/images/marclogo.png",
      faviconUrl: "/images/marc.png",
      events: Array.isArray(events) ? events : [],
      slugify,
    });
  } catch (err) {
    console.error("Events list error:", err?.message || err);
    res.status(500).send("Something went wrong");
  }
});

/** ----------------- EVENT DETAIL ----------------- */
app.get("/events/:id/:slug", async (req, res) => {
  const { id, slug } = req.params;
  const API_BASE = apiBaseFromReq(req);

  try {
    // FIX: correct localhost spelling + always use local API base
    const ev = await fetchJSON(`${API_BASE}/events/${encodeURIComponent(id)}`);
    if (!ev || !ev.id) return res.status(404).send("Event not found");

    const actual = slugify(ev.title || `event-${ev.id}`);
    if (slug !== actual) {
      return res.redirect(301, `/events/${ev.id}/${actual}`);
    }

    const all = await fetchJSON(`${API_BASE}/events`);
    const related = (Array.isArray(all) ? all : [])
      .filter((x) => x.id !== ev.id)
      .slice(0, 8);

    const pageUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    res.render("pages/event_view", {
      title: ev.title || "Event",
      description: stripHTML(ev.content || ""),
      pageUrl,
      faviconUrl: "/images/marc.png",
      bgUrl: "/images/newbg.png",
      eventItem: ev,
      related,
      slugify,
    });
  } catch (err) {
    console.error("Event detail error:", err?.message || err);
    res.status(500).send("Something went wrong");
  }
});

// Health checks
app.get("/healthz", (req, res) => res.status(200).send("ok"));
app.get("/readyz", (req, res) => res.status(200).send("ready"));

// ---- 404 for unknown ----
app.use((req, res) => {
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
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);

  db.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Database connection failed:", err.message);
    } else {
      console.log("✅ MySQL database connected successfully.");
      connection.release();
    }
  });
});
