const router = require("express").Router();
const db = require("../db");
const { validateHost } = require("../localSettings");

router.get("/", (req, res) => res.json({ dbHost: db.getHost() }));
router.put("/", (req, res) => {
  let host;
  try {
    host = validateHost(req.body?.dbHost);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  try {
    return res.json(db.setHost(host));
  } catch (error) {
    console.error("Save local settings error:", error);
    return res.status(500).json({ message: "Couldn't save the database host locally. Try again." });
  }
});
module.exports = router;
