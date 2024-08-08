const { db } = require("../lib/db");

const channel = async (req, res) => {
  const { channelId } = req.params;
  
  const channel = await db.channel.findUnique({
    where: { youtubeChannelId: channelId }
  });

  res.json(channel);
};

module.exports = { channel };
