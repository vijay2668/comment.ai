const { Router } = require("express");
const {
  createSentiment,
  getSentiment,
  updateSentiment
} = require("../controllers/sentiment");

const sentimentRoutes = Router();

sentimentRoutes.post("/sentiment/:videoId", createSentiment);
sentimentRoutes.get("/sentiment/:videoId", getSentiment);

sentimentRoutes.patch("/sentiment/:sentimentId", updateSentiment);

module.exports = { sentimentRoutes };
