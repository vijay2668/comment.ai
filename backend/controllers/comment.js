const axios = require("axios");

const getComments = async (req, res) => {
  // Defining a POST route with videoId as a URL parameter
  try {
    const { youtubeVideoId } = req.params; // Extracting videoId from URL parameters
    const { options } = req.body; // Extracting options from the request body
    const items = []; // Initializing an array to store fetched comments
    let nextPageToken = null; // Initializing the token for pagination
    let count = 0; // Initializing a counter for number of requests
    const maxComments = Number(options["max"]) || 100; // Setting the maximum number of comments to fetch

    do {
      // Making a GET request to the YouTube API to fetch comment threads
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/commentThreads`,
        {
          params: {
            videoId: youtubeVideoId, // The ID of the video for which comments are to be fetched
            part: options["replies"] ? "id,snippet,replies" : "id,snippet", // Including replies if specified in options
            key: process.env.YOUTUBE_API_KEY, // YouTube API key from environment variables
            order: options["sort"], // Sorting order for comments
            pageToken: nextPageToken, // Token for fetching the next page of comments
            maxResults: maxComments > 100 ? 100 : maxComments, // Limiting results per request to 100 or less
            textFormat: "plainText"
          }
        }
      );

      items.push(...response.data.items); // Adding the fetched comments to the items array

      nextPageToken = response.data.nextPageToken || null; // Updating the nextPageToken for the next request
      count += 1; // Incrementing the request count

      // Breaking the loop if the desired number of comments is fetched or there are no more comments
      if (!nextPageToken || items.length >= maxComments) break;
    } while (maxComments > 100 && count < Math.ceil(maxComments / 100)); // Continue fetching until the desired number of comments is reached

    res.json({ items }); // Sending the fetched comments as a JSON response
  } catch (error) {
    console.error("Error fetching comments:", error.message); // Logging any errors to the console
    res.status(500).json({ error: error.message }); // Sending an error response
  }
};

module.exports = { getComments };
