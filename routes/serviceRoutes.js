const express = require("express");
const serviceController = require("../controllers/serviceController");

const router = express.Router();

router.get("/", serviceController.getAll);
router.get("/:id", serviceController.getById);
router.post("/", serviceController.create);
router.put("/:id", serviceController.update);
router.delete("/:id", serviceController.remove);

module.exports = router;