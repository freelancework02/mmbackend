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
 * IMPORTANT: This returns the full API root (already includes /api).
 */
// Always returns a base that already includes `/api`
const apiBaseFromReq = (req) => {
  const envBase = process.env.API_BASE && process.env.API_BASE.trim();
  if (envBase) {
    // allow both with/without trailing slash, but ensure we end with /api
    const base = envBase.replace(/\/+$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  // Prefer proto forwarded by proxies (Render/Vercel), fallback to req.protocol
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host  = req.get("host"); // e.g. 127.0.0.1:5000 in dev, or your live host

  return `${proto}://${host}/api`;
};


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
  // tiny helper
  const val = (s) => (Array.isArray(s) ? s : Array.isArray(s?.data) ? s.data : []);
  const logFail = (label, err) => {
    console.error(
      `[home] ${label} failed:`,
      err?.response?.status || "-",
      err?.code || "-",
      err?.message || err
    );
  };

  // run all calls in parallel; a single failure won't abort the rest
  const results = await Promise.allSettled([
    fetchJSON(`${API_BASE}/articles`),   // 0
    fetchJSON(`${API_BASE}/writers`),    // 1
    fetchJSON(`${API_BASE}/books`),      // 2
    fetchJSON(`${API_BASE}/events`),     // 3
    fetchJSON(`${API_BASE}/questions`),  // 4
  ]);

  // unpack with defaults + targeted logging
  const articlesRaw  = results[0].status === "fulfilled" ? results[0].value : (logFail("articles", results[0].reason), []);
  const writersRaw   = results[1].status === "fulfilled" ? results[1].value : (logFail("writers",  results[1].reason), []);
  const booksRaw     = results[2].status === "fulfilled" ? results[2].value : (logFail("books",    results[2].reason), []);
  const eventsRaw    = results[3].status === "fulfilled" ? results[3].value : (logFail("events",   results[3].reason), []);
  const questionsRaw = results[4].status === "fulfilled" ? results[4].value : (logFail("questions",results[4].reason), []);

  try {
    // ---- normalize Articles ----
    const normArticles = val(articlesRaw).map((a) => ({
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

    // ---- normalize Events ----
    const normEvents = val(eventsRaw).map((e) => ({
      id: e.id,
      title: e.title || "",
      content: e.content || "",
      views: e.views ?? 0,
      date: formatDate(e.date || e.createdOn || e.modifiedOn),
      slug: slugify(e.title || `event-${e.id}`),
      imageSrc: `/api/events/image/${e.id}`,
      safeText: clamp(stripTags(e.content || "")),
    }));

    // ---- normalize Books ----
    const normBooks = val(booksRaw).map((b) => ({
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

    // ---- normalize Writers ----
    const normWriters = val(writersRaw).map((w) => ({
      id: w.id,
      name: w.name || "",
      designation: w.designation || "Islamic Scholar",
      imageSrc: `/api/writers/image/${w.id}`,
    }));

    // ---- normalize Questions (accept array or {data: [...]}) ----
    const normQuestions = val(questionsRaw).map((q) => {
      const id    = q.id ?? q._id ?? q.qaId;
      const title = q.title || q.question || q.questionEnglish || q.questionUrdu || `Question ${id}`;
      const views = typeof q.views === "number" ? q.views : (q.viewCount || 30);
      const desc  = q.safeText || q.summary || q.shortAnswer || q.excerpt ||
                    clamp(stripTags(q.answerUrdu || q.answerEnglish || ""), 150);
      const slug  = q.slug || slugify(title);
      return { id, title, views, safeText: desc, slug };
    });

    return {
      articles:  normArticles,
      events:    normEvents,
      books:     normBooks,
      writers:   normWriters,
      questions: normQuestions,
    };
  } catch (err) {
    // this would only trigger if a normalization line throws
    console.error("Home data normalize failed:", err?.message || err);
    return { articles: [], events: [], books: [], writers: [], questions: [] };
  }
}



// ===== Extra helpers your writer route expects =====
const toLower = (s) => String(s || "").trim().toLowerCase();
const isUrdu = (text = "") =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
const urlEncodePath = (s = "") => encodeURIComponent(String(s || "").trim());
const pickFirst = (...vals) =>
  vals.find((v) => v && String(v).trim().length) || "";
const decodeHtmlEntities = (text = "") =>
  String(text || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
const safeText = (htmlLike) => {
  const stripped = stripTags(String(htmlLike || ""));
  return decodeHtmlEntities(stripped);
};

// Helpers that need API base in scope
const makeUrlHelpers = (API_BASE) => ({
  makeWriterImageUrl: (id) => `${API_BASE}/writers/image/${id}`,
  makeBookCoverUrl: (id) => `${API_BASE}/books/cover/${id}`,
  makeBookDownloadUrl: (id) => `${API_BASE}/books/attachment/${id}`, // PDF endpoint
  makeArticleImageUrl: (id) => `${API_BASE}/articles/image/${id}`,
});

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
    events:   data.events.slice(0, 4),
    books:    data.books.slice(0, 4),
    articles: data.articles.slice(0, 4),
    writers:  data.writers.slice(0, 3),
    questions: data.questions, // EJS slices to 3
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
// app.get("/bookdetail/:id/:slug", async (req, res) => {
//   const { id, slug } = req.params;
//   const API_BASE = apiBaseFromReq(req);

//   try {
//     const bookRes = await axios.get(`${API_BASE}/books/${id}`);
//     const book = bookRes.data;

//     if (!book || !book.title) return res.status(404).send("Book not found");

//     const actualSlug = slugify(book.title);
//     if (slug !== actualSlug) {
//       return res.redirect(301, `/bookdetail/${book.id}/${actualSlug}`);
//     }

//     const [allBooksRes, writersRes] = await Promise.all([
//       axios.get(`${API_BASE}/books`),
//       axios.get(`${API_BASE}/writers`),
//     ]);

//     const allBooks = Array.isArray(allBooksRes.data) ? allBooksRes.data : [];
//     const writers = Array.isArray(writersRes.data) ? writersRes.data : [];

//     const wanted = (book.author || "").toLowerCase().trim();
//     const matchedWriter =
//       writers.find((w) => (w.name || "").toLowerCase().trim() === wanted) ||
//       null;

//     const suggestions = allBooks
//       .filter(
//         (b) =>
//           b.id !== book.id &&
//           (b.author || "").toLowerCase().trim() === wanted
//       )
//       .slice(0, 8);

//     const metaTitle = "Book Detail | Maula Ali Research Center";
//     const metaDesc =
//       stripHTML(book.description || "") ||
//       "Read details about this book on Maula Ali Research Centre.";
//     const metaImage = `${req.protocol}://${req.get("host")}/api/books/cover/${book.id}`;
//     const pageUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
//     const baseHref =
//       process.env.PUBLIC_BASE_HREF ||
//       `${req.protocol}://${req.get("host")}/`;

//     return res.render("pages/book_view", {
//       baseHref,
//       pageUrl,
//       metaTitle,
//       metaDesc: metaDesc.slice(0, 300),
//       metaImage,
//       book,
//       writer: matchedWriter,
//       suggestions,
//       slugify,
//       stripHTML,
//     });
//   } catch (err) {
//     console.error("Book detail error:", err?.response?.status, err?.message);
//     return res.status(500).send("Something went wrong");
//   }
// });
 
// --- One controller for both routes ---
async function bookDetailController(req, res) {
  const { id, slug } = req.params;
  const API_BASE = apiBaseFromReq(req);

  try {
    const bookRes = await axios.get(`${API_BASE}/books/${id}`);
    const book = bookRes.data;
    if (!book || !book.title) return res.status(404).send("Book not found");

    const actualSlug = slugify(book.title || "");

    // If this hit the slugless route OR slug is wrong, send canonical 301
    if (!slug || slug !== actualSlug) {
      return res.redirect(301, `/bookdetail/${book.id}/${actualSlug}`);
    }

    // Parallel fetches
    const [allBooksRes, writersRes] = await Promise.all([
      axios.get(`${API_BASE}/books`),
      axios.get(`${API_BASE}/writers`),
    ]);

    const allBooks = Array.isArray(allBooksRes.data) ? allBooksRes.data : [];
    const writers  = Array.isArray(writersRes.data)  ? writersRes.data  : [];

    const wanted = (book.author || "").toLowerCase().trim();
    const matchedWriter =
      writers.find(w => (w.name || "").toLowerCase().trim() === wanted) || null;

    const suggestions = allBooks
      .filter(b => b.id !== book.id && (b.author || "").toLowerCase().trim() === wanted)
      .slice(0, 8);

    // Absolute URLs for OG/Twitter/WhatsApp
    const host    = `${req.protocol}://${req.get("host")}`;
    const pageUrl = `${host}/bookdetail/${book.id}/${actualSlug}`;
    const baseHref = process.env.PUBLIC_BASE_HREF || `${host}/`;
    const metaTitle = `${book.title} | Maula Ali Research Center`;
    const metaDesc  = stripHTML(book.description || "") ||
                      "Read details about this book on Maula Ali Research Centre.";
    const metaImage = `${host}/api/books/cover/${book.id}`;

    return res.render("pages/book_view", {
      baseHref,
      pageUrl,
      metaTitle,
      metaDesc: metaDesc.slice(0, 300),
      metaImage, // absolute for WA preview
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
}

// --- Two explicit routes (no ? optional) ---
app.get("/bookdetail/:id",       bookDetailController);      // slugless, will 301 to canonical
app.get("/bookdetail/:id/:slug", bookDetailController);      // pretty URL




/** ----------------- ARTICLE DETAIL (SSR) /article/:id/:slug ----------------- */
// ----------------- ARTICLE DETAIL (SSR) /article/:id/:slug -----------------




app.get("/article/:id", handleArticleDetail);
app.get("/article/:id/:slug", handleArticleDetail);

async function handleArticleDetail(req, res) {
  const { id, slug } = req.params;
  const API_BASE = apiBaseFromReq(req);

  // ---- helpers (kept from your code) ----
  const normalize = (s) => {
    const str = String(s || "").toLowerCase().trim();
    const noAccents = str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return noAccents
      .replace(/[.,\/#!$%\^&\*;:{}=\_`~()“”"’'؟،]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  async function fetchJSON(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.json();
  }

  async function fetchWriterById(writerId) {
    try {
      if (!writerId) return null;
      const w = await fetchJSON(`${API_BASE}/writers/${encodeURIComponent(writerId)}`);
      return (w && w.id) ? w : null;
    } catch {
      return null;
    }
  }

  async function fetchAllWriters() {
    try {
      const list = await fetchJSON(`${API_BASE}/writers`);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  async function matchWriterByName(nameRaw) {
    const target = normalize(nameRaw);
    if (!target) return null;

    const writers = await fetchAllWriters();

    // exact normalized match
    let hit = writers.find((w) => normalize(w.name) === target) || null;

    // startsWith / includes fallback
    if (!hit) {
      hit =
        writers.find((w) => normalize(w.name).startsWith(target)) ||
        writers.find((w) => normalize(w.name).includes(target)) ||
        null;
    }
    return hit;
  }

  try {
    // 1) Load article by ID (always)
    const article = await fetchJSON(`${API_BASE}/articles/${encodeURIComponent(id)}`);
    if (!article || !article.title) {
      return res.status(404).send("Article not found");
    }

    // 2) Compute canonical slug
    const actualSlug = slugify(article.title || `article-${article.id}`);

    // 3) If a slug is provided but doesn't match, redirect to canonical
    if (slug && slug !== actualSlug) {
      return res.redirect(301, `/article/${article.id}/${actualSlug}`);
    }

    // 4) Load list for related/highlights
    const allArticlesRaw = await fetchJSON(`${API_BASE}/articles`);
    const list = Array.isArray(allArticlesRaw) ? allArticlesRaw : [];

    const related = list
      .filter((a) => a.id !== article.id)
      .sort((a, b) => (b?.views ?? 0) - (a?.views ?? 0))
      .slice(0, 3);

    // 5) Resolve writer (prefer ID on article, else name match)
    const writerId =
      article.writerId ||
      article.writersId ||
      article.authorId ||
      null;

    const writerNameRaw =
      article.writers ||
      article.writer ||
      "";

    let writer = null;
    if (writerId) writer = await fetchWriterById(writerId);
    if (!writer && writerNameRaw) writer = await matchWriterByName(writerNameRaw);

    // 6) Writer Highlights
    const targetNorm = normalize(writer ? writer.name : writerNameRaw);
    let writerHighlights = list
      .filter((a) => a.id !== article.id)
      .filter((a) => {
        if (writer && (a.writerId || a.writersId || a.authorId)) {
          const aid = a.writerId || a.writersId || a.authorId;
          return String(aid) === String(writer.id);
        }
        const aName = normalize(a.writers || a.writer || "");
        return targetNorm && aName === targetNorm;
      })
      .slice(0, 3);

    if (!writerHighlights.length) {
      writerHighlights = list
        .filter((a) => a.id !== article.id)
        .sort((a, b) => (b?.views ?? 0) - (a?.views ?? 0))
        .slice(0, 3);
    }

    // 7) SEO meta / canonical URLs
    const canonicalUrl = absUrl(req, `/article/${article.id}/${actualSlug}`); // even if no slug in request
    const pageUrl = canonicalUrl;
    const baseHref = process.env.PUBLIC_BASE_HREF || `${req.protocol}://${req.get("host")}/`;

    const metaTitle = `Article Detail | ${article.title} | Maula Ali Research Center`;
    const metaDescRaw =
      stripHTML(article.englishDescription || article.urduDescription || "") ||
      "Read the full article on Maula Ali Research Centre.";
    const metaDesc = clamp(metaDescRaw, 300);
    const metaImage = absUrl(req, `/api/articles/image/${article.id}`);

    // 8) Render the page (works for /article/:id and /article/:id/:slug)
    return res.render("pages/article_view", {
      baseHref,
      pageUrl,
      metaTitle,
      metaDesc,
      metaImage,
      article,
      related,
      writerHighlights,
      writer,          // used by EJS
      slugify,
      stripHTML,
    });
  } catch (err) {
    console.error("Article detail error:", err?.message || err);
    return res.status(500).send("Something went wrong");
  }
}






/** ----------------- QUESTION DETAIL (SSR) /question/:id/:slug ----------------- */

  
// Make absolute URL based on current request
const absUrl = (req, p = "/") =>
  `${req.protocol}://${req.get("host")}${p.startsWith("/") ? "" : "/"}${p}`;

async function handleQuestionDetail(req, res) {
  const { id, slug } = req.params;
  const LOCAL_API_BASE = apiBaseFromReq(req); // your function that builds base like http://localhost:5000/api

  try {
    // 1️⃣ Fetch question by ID (always)
    const qRes = await axios.get(`${LOCAL_API_BASE}/questions/${encodeURIComponent(id)}`, {
      timeout: 15000,
    });

    const raw = qRes.data;
    const question =
      (raw && raw.id && raw) ||
      (raw && raw.data && raw.data.id && raw.data) ||
      {};

    if (!question || !question.id) {
      return res.status(404).send("Question not found");
    }

    // 2️⃣ Build the canonical slug
    const canonicalBase =
      (question.slug && String(question.slug).trim()) ||
      question.questionEnglish ||
      question.questionUrdu ||
      `question-${question.id}`;
    const actualSlug = slugify(canonicalBase);

    // 3️⃣ If slug present but not matching, redirect to proper canonical URL
    if (slug && slug !== actualSlug) {
      return res.redirect(301, `/question/${question.id}/${actualSlug}`);
    }

    // 4️⃣ Otherwise, continue rendering normally (even if no slug)
    const allRes = await axios.get(`${LOCAL_API_BASE}/questions`, { timeout: 15000 });
    const all = Array.isArray(allRes.data)
      ? allRes.data
      : Array.isArray(allRes.data?.data)
      ? allRes.data.data
      : [];

    const others = all.filter((x) => x.id !== question.id);
    const sidebar = others.slice(0, 5);
    const related = others.slice(0, 13);

    const canonicalUrl = absUrl(req, `/question/${question.id}/${actualSlug}`);
    const pageUrl = canonicalUrl;

    // 5️⃣ Meta setup
    const titleText = stripTags(
      question.questionEnglish || question.questionUrdu || ""
    ).trim();

    const metaTitle = titleText
      ? `${titleText} — Maula Ali Research Center`
      : "Question — Maula Ali Research Center";

    const rawDesc =
      stripTags(String(question.answerEnglish || question.answerUrdu || "")) ||
      titleText ||
      "Question & Answer";
    const metaDesc = clamp(rawDesc, 300);
    const metaImage = absUrl(req, "/assets/og-default.png");

    // 6️⃣ Safe HTML (for EJS render)
    const questionHTML = sanitizeHtml(
      String(question.questionEnglish || question.questionUrdu || "")
    );
    const answerHTML = sanitizeHtml(
      String(question.answerUrdu || question.answerEnglish || "")
    );

    // 7️⃣ Render page normally
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

// Both routes point to same handler
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
      description: "demo.minaramasjid.com",
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

// -------- Writer helpers & filters (logic preserved) --------
const articleMatchesWriter = (article, writerName) => {
  const name = toLower(writerName);
  if (!name) return false;

  const writers = article?.writers ?? [];
  const arr = Array.isArray(writers) ? writers : [writers].filter(Boolean);

  const matchArr = arr.some((w) => toLower(w?.name) === name);
  const matchFlat = typeof article?.writers === "string" && toLower(article.writers) === name;
  const matchTranslator = typeof article?.translator === "string" && toLower(article.translator) === name;

  return matchArr || matchFlat || matchTranslator;
};

const bookMatchesWriter = (book, writerName) => {
  const name = toLower(writerName);
  if (!name) return false;
  // match author OR translator to show more results
  return toLower(book?.author) === name || toLower(book?.translator) === name || toLower(book?.writer) === name;
};

const questionMatchesWriter = (q, writerName) => {
  const name = toLower(writerName);
  if (!name) return false;
  if (toLower(q?.writer) === name) return true;
  if (toLower(q?.author) === name) return true;
  if (Array.isArray(q?.writers) && q.writers.some((w) => toLower(w?.name) === name)) return true;
  return false;
};

// Single handler for /writer/:id and /writer/:id/:slug
async function handleWriter(req, res) {
  const { id } = req.params;
  const API_BASE = apiBaseFromReq(req); // ends with /api
  const urls = makeUrlHelpers(API_BASE);

  // Fetch all required data in parallel
  const [writer, allBooks, allArticles, allQuestions] = await Promise.all([
    fetchJSON(`${API_BASE}/writers/${id}`),
    fetchJSON(`${API_BASE}/books`),
    fetchJSON(`${API_BASE}/articles`),
    fetchJSON(`${API_BASE}/questions`),
  ]);

  if (!writer || !writer.id) {
    return res.status(404).render("pages/writer_profile", {
      meta: {
        title: "Writer Profile | Maula Ali Research Center",
        description: "Writer not found.",
        ogImage: "https://placehold.co/1200x630/e8f0e0/4a7031?text=Writer+Profile",
        baseHref: "https://demo.minaramasjid.com/",
      },
      data: {
        writer: null,
        books: [],
        articles: [],
        questions: [],
      },
      helpers: {
        ...urls,
        isUrdu,
        slugify,
        urlEncodePath,
        safeText,
        pickFirst,
      },
    });
  }

  const writerName = writer.name || "";

  // Filtered datasets (be inclusive so books appear)
  const books = (Array.isArray(allBooks) ? allBooks : []).filter((b) => bookMatchesWriter(b, writerName));
  const articles = (Array.isArray(allArticles) ? allArticles : []).filter((a) => articleMatchesWriter(a, writerName));
  const relatedQuestions = (Array.isArray(allQuestions) ? allQuestions : []).filter((q) =>
    questionMatchesWriter(q, writerName)
  );

  const questions = (relatedQuestions.length ? relatedQuestions : (Array.isArray(allQuestions) ? allQuestions : [])).slice(0, 8);

  const pageTitle = `Writer Profile | ${writerName || "Maula Ali Research Center"}`;

  const meta = {
    title: pageTitle,
    description:
      safeText(pickFirst(writer?.englishDescription, writer?.urduDescription)) ||
      `Profile page for ${writerName}, detailing books, articles, and fatwas on Maula Ali Research Center.`,
    keywords: `Writer Profile, Maula Ali Research Centre, Islamic Scholars, ${writerName}`,
    ogImage: urls.makeWriterImageUrl(writer.id),
    baseHref: "https://demo.minaramasjid.com/",
    writerName,
  };

  res.render("pages/writer_profile", {
    meta,
    data: {
      writer,
      books,
      articles,
      questions,
    },
    helpers: {
      ...urls,
      isUrdu,
      slugify,
      urlEncodePath,
      safeText,
      pickFirst,
    },
  });
}  

app.get("/writer/:id", handleWriter);
app.get("/writer/:id/:slug", handleWriter);

// ===================== GALLERY (SSR) =====================
function gallerySlugify(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()“”"’'؟،]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function plainText(html = "") {
  return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function firstImageIdFrom(g) {
  // Accepts: coverImageId OR images:[{id}] OR images:[id]
  if (g?.coverImageId) return g.coverImageId;

  const arr = Array.isArray(g?.images) ? g.images : [];
  if (!arr.length) return null;

  const first = arr[0];
  if (typeof first === "object" && first && ("id" in first)) return first.id;
  if (typeof first === "number" || typeof first === "string") return first;
  return null;
}

function photoCountFrom(g) {
  if (typeof g?.photoCount === "number") return g.photoCount;
  if (Array.isArray(g?.images)) return g.images.length;
  return 0;
}

/** ----------- LIST PAGE: /gallery ----------- */
/** ----------- LIST PAGE: /gallery ----------- */
app.get("/gallery", async (req, res) => {
  const API_BASE = apiBaseFromReq(req); // keep using your helper

  // small helper (safe get)
  const safeGet = async (url) => {
    try {
      const { data } = await axios.get(url, { timeout: 15000 });
      return data;
    } catch {
      return null;
    }
  };

  try {
    // 1) base list (meta) — unchanged
    const list = await safeGet(`${API_BASE}/galleries`);
    const baseRows = Array.isArray(list) ? list : [];

    // 2) fetch details for each gallery in parallel to get images[]
    const details = await Promise.all(
      baseRows.map((g) => safeGet(`${API_BASE}/galleries/${encodeURIComponent(g.id)}`))
    );

    // 3) normalize into what the EJS wants
    const normalized = baseRows.map((g, i) => {
      const id = g.id ?? g._id ?? g.galleryId;
      const title = g.title || g.name || `Gallery ${id}`;
      const slug = g.slug || gallerySlugify(title);
      const detail = details[i] || {};
      const images = Array.isArray(detail.images) ? detail.images : [];

      const firstId = images[0]?.id || null;
      const coverUrl = firstId
        ? `${API_BASE}/galleries/image/${firstId}`
        : "https://placehold.co/800x500/e8f0e0/4a7031?text=Gallery+Cover&font=roboto";

      const description = g.description
        ? plainText(g.description)
        : (g.about ? plainText(g.about) : "");

      const photoCount = images.length;

      return {
        id,
        title,
        slug,
        coverUrl,      // <-- what your EJS uses for the <img>
        description,
        photoCount,    // <-- what your EJS shows next to the images icon
      };
    });

    const meta = {
      title: "Our Gallery | Maula Ali Research Center",
      description: "Browse photo galleries from events and archives at Maula Ali Research Centre.",
      ogImage: "https://placehold.co/1200x630/6a8a4f/white?text=Our+Gallery&font=roboto",
      baseHref: `${req.protocol}://${req.get("host")}/`,
    };

    return res.render("pages/gallery", { meta, galleries: normalized });
  } catch (err) {
    console.error("Gallery list error:", err?.message || err);
    const meta = {
      title: "Our Gallery | Maula Ali Research Center",
      description: "No galleries found.",
      ogImage: "https://placehold.co/1200x630/6a8a4f/white?text=Our+Gallery&font=roboto",
      baseHref: `${req.protocol}://${req.get("host")}/`,
    };
    return res.render("pages/gallery", { meta, galleries: [] });
  }
});


/** ----------- OPTIONAL DETAIL PAGE: /gallery/:slugOrId -----------
 * Your list EJS links to `/gallery/<%= g.slug or g.id %>`.
 * This handler resolves either a numeric id or a slug by scanning the list.
 */
/** ----------- DETAIL PAGE: /gallery/:slugOrId ----------- */
app.get("/gallery/:slugOrId", async (req, res) => {
  const API_BASE = apiBaseFromReq(req);
  const { slugOrId } = req.params;
  const isId = /^\d+$/.test(slugOrId);

  const safeGet = async (url) => {
    try {
      const { data } = await axios.get(url, { timeout: 15000 });
      return data;
    } catch {
      return null;
    }
  };

  try {
    let found = null;

    if (isId) {
      // Try by ID directly; returns full detail (with images)
      found = await safeGet(`${API_BASE}/galleries/${encodeURIComponent(slugOrId)}`);
    } else {
      // Resolve by slug using list
      const list = await safeGet(`${API_BASE}/galleries`);
      const arr = Array.isArray(list) ? list : [];

      const hit = arr.find((g) => {
        const saved = g.slug && String(g.slug).trim().toLowerCase();
        const computed = gallerySlugify(g.title || g.name || "");
        return (saved && saved === slugOrId.toLowerCase()) || computed === slugOrId.toLowerCase();
      });

      if (hit && (hit.id || hit._id || hit.galleryId)) {
        const id = hit.id || hit._id || hit.galleryId;
        // Now fetch full detail (with images) by id
        found = await safeGet(`${API_BASE}/galleries/${encodeURIComponent(id)}`);
      }
    }

    if (!found || !(found.id || found._id || found.galleryId)) {
      return res.status(404).send("Gallery not found");
    }

    // Canonical slug enforcement
    const id = found.id ?? found._id ?? found.galleryId;
    const titleForSlug = found.title || found.name || `gallery-${id}`;
    const canonicalSlug = (found.slug && String(found.slug).trim()) || gallerySlugify(titleForSlug);

    if (!isId && slugOrId !== canonicalSlug) {
      return res.redirect(301, `/gallery/${canonicalSlug}`);
    }

    // Build meta
    const firstId = Array.isArray(found.images) && found.images[0] ? found.images[0].id : null;
    const ogImage = firstId ? `${API_BASE}/galleries/image/${firstId}` 
                            : "https://placehold.co/1200x630/e8f0e0/4a7031?text=Gallery&font=roboto";

    const meta = {
      title: `${found.title || found.name || "Gallery"} | Maula Ali Research Center`,
      description: String(found.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
      ogImage,
      baseHref: `${req.protocol}://${req.get("host")}/`,
    };

    // Render EJS
    return res.render("pages/gallery_view", {
      meta,
      gallery: found,  // includes images[]
      apiBase: API_BASE,
    });
  } catch (err) {
    console.error("Gallery detail error:", err?.message || err);
    return res.status(500).send("Something went wrong");
  }
});


// Health checks
app.get("/health", (req, res) => res.status(200).send("ok"));
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
 