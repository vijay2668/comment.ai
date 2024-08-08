const { db } = require("../lib/db");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "postmessage"
);

const auth = async (req, res) => {
  try {
    const { tokens } = await oAuth2Client.getToken(req.body.code); // exchange code for tokens
    // console.log(tokens);

    const { access_token } = tokens;

    const { picture: photo, email, name } = jwt.decode(tokens.id_token);

    const youtubeChannelId = await axios
      .get(`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json"
        }
      })
      .then(res => res.data.items[0].id);

    const isUserExist = await db.channel
      .findFirst({
        where: {
          youtubeChannelId
        }
      })
      .then(res => (res ? true : false));
    // console.log(isUserExist);

    if (!isUserExist) {
      await db.channel.create({
        data: {
          youtubeChannelId,
          email,
          name,
          photo
        }
      });
    }

    res.json(tokens);
  } catch (error) {
    console.log(error);
    res.send("Error while creating User");
  }
};

module.exports = { auth };
