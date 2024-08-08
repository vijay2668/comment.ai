const { db } = require("../lib/db");

const createVideoSession = async (req, res) => {
  const { youtubeVideoId } = req.params;
  const { sort, max } = req.query; // Destructure sort and max from searchParams
  const { channelId, youtubeChannelId } = req.body;

  const video = await db.video.findUnique({
    where: { youtubeVideoId, sort, max }
  });

  if (!video) {
    await db.video.create({
      data: {
        youtubeVideoId, //video owner's video id
        youtubeChannelId, //video owner's channel id
        channelId, //currentUser's channel id
        sort,
        max
      }
    });

    return res.send("Video Session created successfully!");
  }

  return res.send("Video Session already created!");
};

const getVideoSession = async (req, res) => {
  const { youtubeVideoId } = req.params;
  const { sort, max } = req.query; // Destructure sort and max from searchParams

  const video = await db.video.findUnique({
    where: { youtubeVideoId, sort, max }
  });

  res.json(video);
};

const getAllVideoSession = async (req, res) => {
  const { channelId } = req.params;

  const videos = await db.video.findMany({
    where: { channelId }
  });

  res.json(videos);
};

module.exports = { createVideoSession, getVideoSession, getAllVideoSession };
