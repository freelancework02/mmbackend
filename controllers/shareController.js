const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
}

exports.handleShare = async (req, res) => {
  const { type, id } = req.params;
  let apiUrl = "";
  let imageUrl = "";
  let redirectBase = "";
  let defaultTitle = "Islamic Content";

  switch (type) {
    case "newsandevent":
      apiUrl = `https://api.minaramasjid.com/api/events/${id}`;
      imageUrl = `https://api.minaramasjid.com/api/events/image/${id}`;
      redirectBase = `https://minaramasjid-eight.vercel.app/newsandevent/${id}`;
      defaultTitle = "Islamic Event";
      break;

    case "article":
      apiUrl = `https://api.minaramasjid.com/api/articles/${id}`;
      imageUrl = `https://api.minaramasjid.com/api/articles/image/${id}`;
      redirectBase = `https://minaramasjid-eight.vercel.app/detailarticle/${id}`;
      defaultTitle = "Islamic Article";
      break;

    case "book":
      apiUrl = `https://api.minaramasjid.com/api/books/${id}`;
      imageUrl = `https://api.minaramasjid.com/api/books/cover/${id}`;
      redirectBase = `https://minaramasjid-eight.vercel.app/book/${id}`;
      defaultTitle = "Islamic Book";
      break;

    default:
      return res.status(404).send("Unknown content type.");
  }

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Failed to fetch content");

    const data = await response.json();
    const title = escapeHtml(data.title || defaultTitle);
    const description = escapeHtml(data.description || `Explore this ${type} on Minaramasjid.com`);
    const redirectUrl = `${redirectBase}/${encodeURIComponent(data.title || "content")}`;

    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>

        <!-- Open Graph Meta -->
        <meta property="og:type" content="website">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${imageUrl}">
        <meta property="og:url" content="${redirectUrl}">
        <meta property="og:site_name" content="Minaramasjid">

        <!-- Twitter Meta -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${imageUrl}">

        <noscript><meta http-equiv="refresh" content="3;url=${redirectUrl}"></noscript>
      </head>
      <body>
        <p>Redirecting to ${type}…</p>
        <script>setTimeout(() => window.location.href='${redirectUrl}', 3000)</script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).send("Error fetching content.");
  }
};
