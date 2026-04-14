const { fetchLeaderboard } = require("../lib/game-service");
const { sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const scores = await fetchLeaderboard();
    sendJson(res, 200, { ok: true, scores });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "Internal server error" });
  }
};
