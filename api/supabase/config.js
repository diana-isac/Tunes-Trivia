const { getBrowserConfigResponse } = require("../../lib/game-service");
const { sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  try {
    const response = getBrowserConfigResponse();
    sendJson(res, response.status, response.body);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "Internal server error" });
  }
};
