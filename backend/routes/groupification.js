const { Router } = require("express");
const {
  createGroupification,
  updateGroupification,
  getGroupification
} = require("../controllers/groupification");

const groupificationRoutes = Router();

groupificationRoutes.post(
  "/groupification/:sentimentId/:sentimentKey",
  createGroupification
);

groupificationRoutes.patch(
  "/groupification/:groupificationId",
  updateGroupification
);

groupificationRoutes.get(
  "/groupification/:sentimentId/:sentimentKey",
  getGroupification
);

module.exports = { groupificationRoutes };
