const express = require("express");
const leadController = require("../controllers/leadController");

const router = express.Router();

router.get("/", leadController.getAll);
router.get("/:id", leadController.getById);
router.post("/", leadController.create);
router.put("/:id", leadController.update);
router.delete("/:id", leadController.remove);

module.exports = router;