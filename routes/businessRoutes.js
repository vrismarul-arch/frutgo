const express = require("express");
const businessController = require("../controllers/businessController");

const router = express.Router();

router.get("/", businessController.getAll);
router.get("/:id", businessController.getById);
router.post("/", businessController.create);
router.put("/:id", businessController.update);
router.delete("/:id", businessController.remove);

module.exports = router;
