const express = require("express");
const cors = require("cors"); // Import the 'cors' package
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const { rootRouter } = require("./routes/index");

dotenv.config();

const app = express();
// Enable CORS for all routes
app.use(cors());
// Increase the request size limit to 50MB
app.use(bodyParser.json({ limit: "50mb" }));
const PORT = process.env.PORT || 5000;

app.use("/api", rootRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
