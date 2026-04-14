const { clearLeaderboard } = require("../../lib/game-service");
const { sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const response = await clearLeaderboard();
    sendJson(res, response.status, response.body);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "Internal server error" });
  }
};
