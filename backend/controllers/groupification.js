const { db } = require("../lib/db");

const createGroupification = async (req, res) => {
  const { sentimentId, sentimentKey } = req.params;
  const { videoId, channelId, groupification_data } = req.body;

  const generatedGroupification = await db.groupification.create({
    data: {
      videoId, // videoId as db.video.id
      channelId, //currentUser's channel id as db.channel.id
      sentimentId, // sentimentId as db.sentiment.id
      sentimentKey, // sentimentKey as (positives, negatives, questions, neutrals, comments)
      groupification_data //groupification data
    }
  });

  res.json(generatedGroupification);
};

const updateGroupification = async (req, res) => {
  const { groupificationId } = req.params;
  const { groupification_data, sentiment_data } = req.body;

  const updatedGroupification = await db.groupification.update({
    where: {
      id: groupificationId
    },
    data: {
      groupification_data //updated groupification data
    }
  });

  res.json(updatedGroupification);

  if (!sentiment_data) return;

  await db.sentiment.update({
    where: {
      id: updatedGroupification?.sentimentId
    },
    data: {
      sentiment_data //updated sentiment data
    }
  });
};

const getGroupification = async (req, res) => {
  const { sentimentId, sentimentKey } = req.params;

  const groupification = await db.groupification.findFirst({
    where: {
      sentimentId, // sentimentId as db.sentiment.id
      sentimentKey // sentimentKey as (positives, negatives, questions, neutrals, comments)
    },
    orderBy: {
      createdAt: "desc" // getting newest groupification
    }
  });

  res.json(groupification);
};

module.exports = {
  createGroupification,
  getGroupification,
  updateGroupification
};
