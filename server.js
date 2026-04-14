const http = require("http");
const fs = require("fs");
const path = require("path");
const { loadEnv } = require("./lib/env");
const { getSupabaseAdminClient, getSupabaseBrowserConfig } = require("./lib/supabase");
const { QUESTIONS } = require("./questions");

const root = __dirname;
const host = "127.0.0.1";
const port = 8000;
const leaderboardClients = new Set();

loadEnv();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function sendSse(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");

      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const fullPath = path.resolve(root, relativePath);

  if (!fullPath.startsWith(root)) {
    return null;
  }

  return fullPath;
}

function validatePlayerName(value) {
  const trimmed = String(value || "").trim().slice(0, 30);
  return trimmed;
}

function validateDeviceId(value) {
  const trimmed = String(value || "").trim().slice(0, 120);
  return trimmed;
}

function scoreAnswers(answers) {
  return answers.filter((value, index) => value === QUESTIONS[index].answer).length;
}

function normalizeLeaderboardRows(rows) {
  return rows.map((entry) => ({
    id: entry.id,
    sessionId: entry.session_id,
    deviceId: entry.device_id,
    name: entry.player_name,
    score: entry.correct_count,
    durationMs: entry.duration_ms,
    timestamp: Date.parse(entry.created_at)
  }));
}

async function fetchLeaderboard(limit = 10) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("id, session_id, device_id, player_name, correct_count, duration_ms, created_at")
    .order("correct_count", { ascending: false })
    .order("duration_ms", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return normalizeLeaderboardRows(data || []);
}

async function broadcastLeaderboard() {
  if (!leaderboardClients.size) {
    return;
  }

  const scores = await fetchLeaderboard();
  for (const client of leaderboardClients) {
    sendSse(client, "leaderboard", { scores });
  }
}

async function handleStartSession(req, res) {
  const body = await readRequestBody(req);
  const playerName = validatePlayerName(body.playerName);
  const deviceId = validateDeviceId(body.deviceId);

  if (!playerName) {
    sendJson(res, 400, { ok: false, error: "Player name is required." });
    return;
  }

  if (!deviceId) {
    sendJson(res, 400, { ok: false, error: "Device ID is required." });
    return;
  }

  const supabase = getSupabaseAdminClient();

  const { data: completedEntry, error: completedError } = await supabase
    .from("leaderboard_entries")
    .select("id")
    .eq("device_id", deviceId)
    .limit(1)
    .maybeSingle();

  if (completedError) {
    throw completedError;
  }

  if (completedEntry) {
    sendJson(res, 409, {
      ok: false,
      code: "already-played",
      error: "This device has already completed a run for the event."
    });
    return;
  }

  const { data: activeSession, error: activeError } = await supabase
    .from("game_sessions")
    .select("id, player_name, started_at")
    .eq("device_id", deviceId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (activeError) {
    throw activeError;
  }

  if (activeSession) {
    sendJson(res, 409, {
      ok: false,
      code: "session-active",
      error: "This device already has an active run in progress.",
      session: {
        id: activeSession.id,
        playerName: activeSession.player_name,
        startedAt: activeSession.started_at
      }
    });
    return;
  }

  const { data: insertedSession, error: insertError } = await supabase
    .from("game_sessions")
    .insert({
      device_id: deviceId,
      player_name: playerName,
      status: "active"
    })
    .select("id, player_name, started_at")
    .single();

  if (insertError) {
    throw insertError;
  }

  sendJson(res, 201, {
    ok: true,
    session: {
      id: insertedSession.id,
      playerName: insertedSession.player_name,
      startedAt: insertedSession.started_at
    }
  });
}

async function handleFinishSession(req, res) {
  const body = await readRequestBody(req);
  const sessionId = String(body.sessionId || "").trim();
  const answers = Array.isArray(body.answers) ? body.answers.map((value) => Number(value)) : null;

  if (!sessionId) {
    sendJson(res, 400, { ok: false, error: "Session ID is required." });
    return;
  }

  if (!answers || answers.length !== QUESTIONS.length || answers.some((value) => !Number.isInteger(value))) {
    sendJson(res, 400, { ok: false, error: "A full set of answers is required." });
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("id, device_id, player_name, started_at, status")
    .eq("id", sessionId)
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }

  if (!session || session.status !== "active") {
    sendJson(res, 404, { ok: false, error: "Active session not found." });
    return;
  }

  const finishedAt = new Date();
  const startedAt = new Date(session.started_at);
  const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
  const correctCount = scoreAnswers(answers);

  const { error: updateError } = await supabase
    .from("game_sessions")
    .update({
      status: "completed",
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      correct_count: correctCount
    })
    .eq("id", session.id)
    .eq("status", "active");

  if (updateError) {
    throw updateError;
  }

  const { data: leaderboardEntry, error: insertError } = await supabase
    .from("leaderboard_entries")
    .insert({
      session_id: session.id,
      device_id: session.device_id,
      player_name: session.player_name,
      correct_count: correctCount,
      duration_ms: durationMs
    })
    .select("id, session_id, device_id, player_name, correct_count, duration_ms, created_at")
    .single();

  if (insertError) {
    throw insertError;
  }

  await broadcastLeaderboard();

  sendJson(res, 200, {
    ok: true,
    result: normalizeLeaderboardRows([leaderboardEntry])[0]
  });
}

async function handleClearLeaderboard(res) {
  const supabase = getSupabaseAdminClient();
  const { error: leaderboardError } = await supabase
    .from("leaderboard_entries")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00.000Z");

  if (leaderboardError) {
    throw leaderboardError;
  }

  const { error: sessionsError } = await supabase
    .from("game_sessions")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00.000Z");

  if (sessionsError) {
    throw sessionsError;
  }

  await broadcastLeaderboard();
  sendJson(res, 200, { ok: true });
}

function handleLeaderboardStream(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });

  res.write(": connected\n\n");
  leaderboardClients.add(res);

  void fetchLeaderboard()
    .then((scores) => {
      sendSse(res, "leaderboard", { scores });
    })
    .catch((error) => {
      sendSse(res, "error", { message: error.message });
    });

  req.on("close", () => {
    leaderboardClients.delete(res);
  });
}

const server = http.createServer((req, res) => {
  void (async () => {
    try {
      if (req.method === "GET" && req.url === "/api/health") {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === "GET" && req.url === "/api/supabase/config") {
        sendJson(res, 200, {
          ok: true,
          supabase: getSupabaseBrowserConfig()
        });
        return;
      }

      if (req.method === "GET" && req.url === "/api/leaderboard") {
        const scores = await fetchLeaderboard();
        sendJson(res, 200, { ok: true, scores });
        return;
      }

      if (req.method === "GET" && req.url === "/api/leaderboard/stream") {
        handleLeaderboardStream(req, res);
        return;
      }

      if (req.method === "POST" && req.url === "/api/session/start") {
        await handleStartSession(req, res);
        return;
      }

      if (req.method === "POST" && req.url === "/api/session/finish") {
        await handleFinishSession(req, res);
        return;
      }

      if (req.method === "POST" && req.url === "/api/leaderboard/clear") {
        await handleClearLeaderboard(res);
        return;
      }

      let targetPath = resolvePath(req.url);

      if (!targetPath) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }

      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        targetPath = path.join(targetPath, "index.html");
      }

      fs.readFile(targetPath, (error, data) => {
        if (error) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not found");
          return;
        }

        const extension = path.extname(targetPath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": mimeTypes[extension] || "application/octet-stream"
        });
        res.end(data);
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message || "Internal server error"
      });
    }
  })();
});

server.listen(port, host, () => {
  console.log(`Tunes & Trivia running at http://${host}:${port}`);
});
