// // index.js (server entry)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./config/db");

// ---- Create app & config ----
const app = express();
const PORT = process.env.PORT || 5000;



// View engine: EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---- Middleware ----
app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// ---- Static files ----
// Serve everything under /public at the web root (/, /images, /assets, etc.)
app.use(express.static(path.join(__dirname, "public")));



// ---- API Routes ----
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
app.get("/", (req, res) => {
  res.render("index"); // no extension needed
});

// Articles listing page (your converted EJS):
// place the file at Views/pages/article.ejs
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
  // For non-API, show a friendly 404 page or text
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
