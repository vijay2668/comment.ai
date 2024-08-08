const { Router } = require("express");
const {
  createVideoSession,
  getVideoSession,
  getAllVideoSession
} = require("../controllers/video");

const videoRoutes = Router();

videoRoutes.post("/video/:youtubeVideoId", createVideoSession);
videoRoutes.get("/video/:youtubeVideoId", getVideoSession);
videoRoutes.get("/videos/:channelId", getAllVideoSession);

module.exports = { videoRoutes };
