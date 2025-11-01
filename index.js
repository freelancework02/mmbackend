require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./config/db");
  
// Routes
const articleRoutes = require("./routes/articleRoutes");
const bookRoutes = require("./routes/bookRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const questionRoutes = require("./routes/questionRoutes");
const topicRoutes = require("./routes/topicRoutes");
const translatorRoutes = require("./routes/translatorRoutes");
const adminRoutes = require("./routes/adminRoutes");
const writerRoutes = require("./routes/writerRoutes");
const eventRoutes = require("./routes/eventRoutes");
const languageRoutes = require("./routes/languageRoutes");
const aboutContentRoutes = require("./routes/aboutContentRoutes");
const bookSliderRoutes = require("./routes/bookSliderRoutes");
const homeBookRoutes = require("./routes/homeBookSliderRoutes");
const TagRoutes = require("./routes/tagRoutes");
const printedBookRoutes = require("./routes/printedBookRoutes");
const bookRequestRoutes = require("./routes/bookRequestRoutes");
const shareRoutes = require("./routes/shareRoutes");
const galleryRoutes = require("./routes/galleryRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));


// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/article", express.static("public/article"));



// Routes
app.use("/api/articles", articleRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/translators", translatorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/writers", writerRoutes);
app.use("/api/tags", TagRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/about", aboutContentRoutes);
app.use("/api/bookslider", bookSliderRoutes);
app.use("/api/homebookslider", homeBookRoutes);
app.use("/api/printedBooks", printedBookRoutes);
app.use("/api/requestBook", bookRequestRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/galleries", galleryRoutes);

// Health check / root route
app.get("/", (req, res) => {
  res.send(`✅ Server is live on port ${PORT}`);
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Test DB connection
  db.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Database connection failed:", err.message);
    } else {
      console.log("✅ MySQL database connected successfully.");
      connection.release(); // always release the connection
    }
  });
});
