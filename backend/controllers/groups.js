const { kmeans } = require("ml-kmeans");
const { gpt } = require("../functions");

const groupPrompt = group => `
  Analyze the following comments and generate a title that captures the main theme or sentiment expressed in the group. The title should be a single sentence.

  Comments:
  ${group.map(comment => `- ${comment.text}`).join("\n")}

  Title:
`;

const getGroups = async (req, res) => {
  try {
    const { simplified_comments } = req.body;
    const maxWords = 10;

    // Convert comments to vectors
    const vectors = simplified_comments.map(({ text }) => 
      Array.from({ length: maxWords }, (_, i) => (text.split(" ")[i] ? text.split(" ")[i].length : 0))
    );

    // Determine number of clusters
    const numClusters = Math.max(2, Math.floor(simplified_comments.length / 10)); // Example: up to 10% of comments

    // Perform K-Means clustering
    const { clusters } = kmeans(vectors, numClusters);

    // Group comments
    const groups = clusters.reduce((acc, cluster, index) => {
      (acc[cluster] = acc[cluster] || []).push(simplified_comments[index]);
      return acc;
    }, []);

    // Generate titles
    const generatedGroups = await Promise.all(
      groups.map(async group => {
        try {
          const title = await gpt(groupPrompt(group), 0.2, []);
          return { group_about: title, group_of_comments: group };
        } catch (error) {
          console.error("Error while generating groups:", error.message);
          return { group_about: "Other", group_of_comments: group };
        }
      })
    );

    res.json(generatedGroups);
  } catch (error) {
    console.error("Error during grouping:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getGroups };
