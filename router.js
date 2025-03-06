const { createPlaylist, parsePlaylist, getData, updateCategoryVisibility } = require("./controller");

const router = require("express").Router();

router.post("/create-playlist", createPlaylist);
router.get("/parse-playlist/:id", parsePlaylist);
router.get("/get-data/:id/:type", getData);
router.put("/update-category/:id", updateCategoryVisibility);

module.exports = router;
