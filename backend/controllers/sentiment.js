const { db } = require("../lib/db");

const createSentiment = async (req, res) => {
  const { videoId } = req.params;
  const { channelId, sentiment_data, sentimentId } = req.body;

  if (sentimentId) {
    const sentiment = await db.sentiment.update({
      where: { id: sentimentId },
      data: { sentiment_data }
    });

    return res.json(sentiment);
  }

  const sentiment = await db.sentiment.create({
    data: {
      videoId, // videoId as db.video.id
      channelId, //currentUser's channel id
      sentiment_data //sentiment data
    }
  });

  return res.json(sentiment);
};

const getSentiment = async (req, res) => {
  const { videoId } = req.params;

  const sentiment = await db.sentiment.findFirst({
    where: { videoId }, // videoId as db.video.id
    orderBy: {
      createdAt: "desc" // getting newest sentiment
    }
  });

  res.json(sentiment);
};

const updateSentiment = async (req, res) => {
  const { sentimentId } = req.params;
  const { sentiment_data } = req.body;

  const sentiment = await db.sentiment.update({
    where: { id: sentimentId }, // sentimentId as db.sentiment.id
    data: { sentiment_data }
  });

  res.json(sentiment);
};

module.exports = { createSentiment, getSentiment, updateSentiment };
