const { sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  sendJson(res, 200, { ok: true });
};
