const db = require("../config/db");

// Create Topic (upload topic with image)
exports.createTopic = (req, res) => {
  const { topic, about } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;

  // Only require topic, not image
  if (!topic) {
    return res.status(400).send('Topic is required.');
  }

  const createdOn = new Date();
  const modifiedOn = new Date();
  const isDeleted = 0;

  const sql = `
    INSERT INTO topic 
    (image, topic, about, createdOn, modifiedOn, isDeleted)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [imageBuffer, topic, about || "", createdOn, modifiedOn, isDeleted], (err, result) => {
    if (err) {
      console.error('Error inserting topic:', err);
      return res.status(500).send('Error saving topic');
    }
    res.send('Topic saved successfully!');
  });
};


// Get all topics (with image and createdOn, and not deleted)
exports.getAllTopics = (req, res) => {
  const sql = `
    SELECT id, topic, about, image, createdOn
    FROM topic
    WHERE isDeleted = 0
    ORDER BY createdOn DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching topics:', err);
      return res.status(500).send('Error fetching topics');
    }
    res.json(results);
  });
};



// Get a single topic by ID (with image and createdOn)
exports.getTopicById = (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).send('Topic ID is required.');
  }

  const sql = `
    SELECT id, topic, about, image, createdOn
    FROM topic
    WHERE id = ? AND isDeleted = 0
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching topic:', err);
      return res.status(500).send('Error fetching topic');
    }

    if (results.length === 0) {
      return res.status(404).send('Topic not found.');
    }

    res.json(results[0]);
  });
};

// Get topic image by ID
exports.getTopicImage = (req, res) => {
  const id = req.params.id;

  const sql = `SELECT image FROM topic WHERE id = ? AND isDeleted = 0`;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching topic image:', err);
      return res.status(500).send('Error fetching topic image');
    }

    if (results.length > 0 && results[0].image) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(results[0].image);
    } else {
      res.status(404).send('Image not found');
    }
  });
};

exports.updateTopic = (req, res) => {
  const id = req.params.id;
  const { topic, about } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;

  if (!id) {
    return res.status(400).send('Topic ID is required.');
  }

  const modifiedOn = new Date();

  // If no new image is provided, keep the existing one
  const sql = `
    UPDATE topic SET
      ${imageBuffer !== null ? "image = ?," : ""}
      topic = ?,
      about = ?,
      modifiedOn = ?
    WHERE id = ? AND isDeleted = 0
  `;

  const params = [];

  if (imageBuffer !== null) {
    params.push(imageBuffer);
  }
  params.push(topic, about || "", modifiedOn, id);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error updating topic:', err);
      return res.status(500).send('Error updating topic');
    }
    res.json({
      id,
      topic,
      about,
      modifiedOn,
    });
  });
};

// Soft delete topic
exports.deleteTopic = (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).send('Topic ID is required.');
  }

  const modifiedOn = new Date();

  const sql = `
    UPDATE topic 
    SET isDeleted = 1, modifiedOn = ?
    WHERE id = ?
  `;

  db.query(sql, [modifiedOn, id], (err, result) => {
    if (err) {
      console.error('Error soft deleting topic:', err);
      return res.status(500).send('Error deleting topic');
    }
    res.send('Topic deleted (soft delete) successfully!');
  });
};
