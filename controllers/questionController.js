const db = require("../config/db");

/* =========================================
   Helpers
========================================= */
const isValidDate = (d) => !isNaN(Date.parse(d));

const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    // strip Urdu chars for slug
    .replace(/[\u0600-\u06FF]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const firstNonEmpty = (...vals) => vals.find((v) => (v ?? "").trim() !== "");

/* =========================================
   GET: All (exclude deleted)
========================================= */
exports.getAllNewQuestions = (req, res) => {
  const sql = `
    SELECT
      id,
      image,
      imageName,
      slug,
      questionEnglish, answerEnglish,
      questionUrdu,   answerUrdu,
      questionRoman,  answerRoman,
      questionHindi,  answerHindi,
      writer, date, tags, language, topic, translator,
      answeredStatus,
      createdOn, isPublished, modifiedOn, isDeleted
    FROM New_Question_Table
    WHERE isDeleted = 0
    ORDER BY createdOn DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching new questions:", err);
      return res.status(500).send("Error fetching new questions");
    }
    res.json(results);
  });
};


/* =========================================
   GET: One by ID (FAST + FIXED)
========================================= */
exports.getQuestionByID = async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid ID" });

    // ✅ Wrap db.query in a promise because db.query does NOT support await
    const getOne = () =>
      new Promise((resolve, reject) => {
        db.query(
          "SELECT id, imageName, slug, questionEnglish, answerEnglish, questionUrdu, answerUrdu, questionRoman, answerRoman, questionHindi, answerHindi, writer, date, tags, language, topic, translator, answeredStatus, createdOn, isPublished, modifiedOn FROM New_Question_Table WHERE id = ? LIMIT 1",
          [id],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
          }
        );
      });

    const rows = await getOne(); // ✅ Now safe to use await

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }

    const specificQuestion = rows[0];

    // ✅ Fix image URL only if image exists
    if (specificQuestion.image) {
      specificQuestion.image = `${process.env.API_STATIC_BASE}/uploads/questions/${specificQuestion.image}`;
    } else {
      specificQuestion.image = null;
    }

    return res.status(200).json({
      message: "success",
      data: specificQuestion,
    });

  } catch (err) {
    console.error("Error in getQuestionByID:", err);
    res.status(500).send("Server Error");
  }
};



/* =========================================
   GET: Image
========================================= */
exports.getNewQuestionImage = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send("Question ID is required.");

  const sql = `SELECT image FROM New_Question_Table WHERE id = ? AND isDeleted = 0`;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching image:", err);
      return res.status(500).send("Error fetching image");
    }
    if (results.length > 0 && results[0].image) {
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(results[0].image);
    }
    res.status(404).send("Image not found.");
  });
};

/* =========================================
   POST: Create
========================================= */
exports.createNewQuestion = (req, res) => {
  const {
    slug,
    questionEnglish = "",
    answerEnglish = "",
    questionUrdu = "",
    answerUrdu = "",
    questionRoman = "",
    answerRoman = "",
    questionHindi = "",
    answerHindi = "",
    writer,
    date,
    tags = null,
    language,
    topic,
    translator = null,
    answeredStatus, // "yes" | "no" | "in progress"
    isPublished = 0,
  } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;
  const imageName = req.file?.originalname || null;

  if (!slug || !writer || !date || !language || !topic || !imageBuffer || !answeredStatus) {
    return res
      .status(400)
      .send(
        "Required fields missing: slug, writer, date, language, topic, image, answeredStatus."
      );
  }
  if (!isValidDate(date)) return res.status(400).send("Invalid date format.");

  const createdOn = new Date();
  const modifiedOn = new Date();
  const isDeleted = 0;

  const sql = `
    INSERT INTO New_Question_Table
    (
      image,
      imageName,
      slug,
      questionEnglish, answerEnglish,
      questionUrdu,   answerUrdu,
      questionRoman,  answerRoman,
      questionHindi,  answerHindi,
      writer, date, tags, language, topic, translator,
      answeredStatus,
      createdOn, isPublished, modifiedOn, isDeleted
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    imageBuffer,
    imageName,
    slug,
    questionEnglish,
    answerEnglish,
    questionUrdu,
    answerUrdu,
    questionRoman,
    answerRoman,
    questionHindi,
    answerHindi,
    writer,
    date,
    tags,
    language,
    topic,
    translator,
    answeredStatus,
    createdOn,
    Number(isPublished) ? 1 : 0,
    modifiedOn,
    isDeleted,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error creating new question:", err);
      return res.status(500).send("Error creating new question");
    }
    res.status(201).json({ message: "Question created successfully!", id: result.insertId });
  });
};

/* =========================================
   PATCH: Update (partial)
========================================= */
exports.updateNewQuestion = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send("ID is required");

  const {
    slug: slugBody,
    questionEnglish,
    answerEnglish,
    questionUrdu,
    answerUrdu,
    questionRoman,
    answerRoman,
    questionHindi,
    answerHindi,
    writer,
    date,
    tags,
    language,
    topic,
    translator,
    answeredStatus,
    isPublished,
  } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;
  const imageName = req.file?.originalname || null;

  const fetchSql = `
    SELECT
      questionEnglish, questionUrdu, questionRoman, questionHindi, slug
    FROM New_Question_Table
    WHERE id = ? AND isDeleted = 0
  `;
  db.query(fetchSql, [id], (fetchErr, rows) => {
    if (fetchErr) {
      console.error("Error fetching existing question:", fetchErr);
      return res.status(500).send("Error fetching existing question");
    }
    if (rows.length === 0) return res.status(404).send("Question not found");

    const existing = rows[0];

    let nextSlug = null;
    if (typeof slugBody === "string" && slugBody.trim() !== "") {
      nextSlug = slugify(slugBody);
    } else {
      const enChanged = questionEnglish !== undefined && questionEnglish !== existing.questionEnglish;
      const urChanged = questionUrdu !== undefined && questionUrdu !== existing.questionUrdu;
      const rnChanged = questionRoman !== undefined && questionRoman !== existing.questionRoman;
      const hiChanged = questionHindi !== undefined && questionHindi !== existing.questionHindi;

      if (enChanged || urChanged || rnChanged || hiChanged) {
        const en = (questionEnglish ?? existing.questionEnglish) || "";
        const ur = (questionUrdu ?? existing.questionUrdu) || "";
        const rn = (questionRoman ?? existing.questionRoman) || "";
        const hi = (questionHindi ?? existing.questionHindi) || "";
        nextSlug = slugify(firstNonEmpty(en, ur, rn, hi) || "");
      }
    }

    let sql = `UPDATE New_Question_Table SET `;
    const fields = [];
    const params = [];

    if (imageBuffer) {
      fields.push("image = ?");
      params.push(imageBuffer);
      if (imageName) {
        fields.push("imageName = ?");
        params.push(imageName);
      }
    }

    if (questionEnglish !== undefined) { fields.push("questionEnglish = ?"); params.push(questionEnglish); }
    if (answerEnglish !== undefined)   { fields.push("answerEnglish = ?");   params.push(answerEnglish); }
    if (questionUrdu !== undefined)    { fields.push("questionUrdu = ?");    params.push(questionUrdu); }
    if (answerUrdu !== undefined)      { fields.push("answerUrdu = ?");      params.push(answerUrdu); }
    if (questionRoman !== undefined)   { fields.push("questionRoman = ?");   params.push(questionRoman); }
    if (answerRoman !== undefined)     { fields.push("answerRoman = ?");     params.push(answerRoman); }
    if (questionHindi !== undefined)   { fields.push("questionHindi = ?");   params.push(questionHindi); }
    if (answerHindi !== undefined)     { fields.push("answerHindi = ?");     params.push(answerHindi); }

    if (writer !== undefined)          { fields.push("writer = ?");          params.push(writer); }
    if (date !== undefined)            {
      if (!isValidDate(date)) return res.status(400).send("Invalid date format.");
      fields.push("date = ?"); params.push(date);
    }
    if (tags !== undefined)            { fields.push("tags = ?");            params.push(tags || null); }
    if (language !== undefined)        { fields.push("language = ?");        params.push(language); }
    if (topic !== undefined)           { fields.push("topic = ?");           params.push(topic); }
    if (translator !== undefined)      { fields.push("translator = ?");      params.push(translator || null); }
    if (answeredStatus !== undefined)  { fields.push("answeredStatus = ?");  params.push(answeredStatus); }
    if (isPublished !== undefined)     { fields.push("isPublished = ?");     params.push(Number(isPublished) ? 1 : 0); }

    if (nextSlug) { fields.push("slug = ?"); params.push(nextSlug); }

    fields.push("modifiedOn = ?");
    params.push(new Date());

    if (fields.length === 0) return res.status(400).send("No fields to update.");

    sql += fields.join(", ") + " WHERE id = ? AND isDeleted = 0";
    params.push(id);

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("Error updating question:", err);
        return res.status(500).send("Error updating question");
      }
      if (result.affectedRows === 0) return res.status(404).send("Question not found");
      res.json({ message: "Question updated successfully!" });
    });
  });
};

/* =========================================
   DELETE: Soft delete
========================================= */
exports.deleteNewQuestion = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send("Question ID is required.");

  const sql = `
    UPDATE New_Question_Table
    SET isDeleted = 1, modifiedOn = ?
    WHERE id = ?
  `;
  db.query(sql, [new Date(), id], (err, result) => {
    if (err) {
      console.error("Error deleting question:", err);
      return res.status(500).send("Error deleting question");
    }
    if (result.affectedRows === 0) return res.status(404).send("Question not found.");
    res.send("Question deleted (soft delete) successfully!");
  });
};

/* =========================================
   NEW: GET by Tag (normalized)
   - Matches either CSV 'tags' OR single 'topic' column.
========================================= */
exports.getQuestionsByTag = (req, res) => {
  const raw = (req.params.tag || "").toString().trim();
  if (!raw) return res.status(400).send("Tag is required");

  // normalize like client
  const norm = (s="") => s.toLowerCase().trim()
    .replace(/[\u0600-\u06FF]+/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)+/g,"");

  const wanted = norm(raw);

  const sql = `
    SELECT id, imageName, slug,
           questionEnglish, answerEnglish,
           questionUrdu,   answerUrdu,
           questionRoman,  answerRoman,
           questionHindi,  answerHindi,
           writer, date, tags, language, topic, translator,
           answeredStatus,
           createdOn, isPublished, modifiedOn, isDeleted, views
    FROM New_Question_Table
    WHERE isDeleted = 0
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Error fetching questions by tag:", err);
      return res.status(500).send("Error fetching questions by tag");
    }
    const matches = (rows || []).filter(q => {
      const bag = [];
      if (q.topic) bag.push(q.topic);
      if (q.tag) bag.push(q.tag);
      if (typeof q.tags === "string") bag.push(...q.tags.split(","));
      if (Array.isArray(q.tags)) bag.push(...q.tags);
      const normalized = bag.map(x => norm(String(x||"")));
      return normalized.includes(wanted);
    });

    if (!matches.length) return res.status(404).json([]);
    res.json(matches);
  });
};
