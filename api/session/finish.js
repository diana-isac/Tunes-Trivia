const { finishSession } = require("../../lib/game-service");
const { readJsonBody, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const response = await finishSession(body);
    sendJson(res, response.status, response.body);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "Internal server error" });
  }
};
