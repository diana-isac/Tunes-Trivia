const { getSupabaseAdminClient, getSupabaseBrowserConfig } = require("./supabase");
const { QUESTIONS } = require("../questions");

function validatePlayerName(value) {
  return String(value || "").trim().slice(0, 30);
}

function validateDeviceId(value) {
  return String(value || "").trim().slice(0, 120);
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

async function startSession({ playerName, deviceId }) {
  const normalizedPlayerName = validatePlayerName(playerName);
  const normalizedDeviceId = validateDeviceId(deviceId);

  if (!normalizedPlayerName) {
    return { status: 400, body: { ok: false, error: "Player name is required." } };
  }

  if (!normalizedDeviceId) {
    return { status: 400, body: { ok: false, error: "Device ID is required." } };
  }

  const supabase = getSupabaseAdminClient();

  const { data: completedEntry, error: completedError } = await supabase
    .from("leaderboard_entries")
    .select("id")
    .eq("device_id", normalizedDeviceId)
    .limit(1)
    .maybeSingle();

  if (completedError) {
    throw completedError;
  }

  if (completedEntry) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "already-played",
        error: "This device has already completed a run for the event."
      }
    };
  }

  const { data: activeSession, error: activeError } = await supabase
    .from("game_sessions")
    .select("id, player_name, started_at")
    .eq("device_id", normalizedDeviceId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (activeError) {
    throw activeError;
  }

  if (activeSession) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "session-active",
        error: "This device already has an active run in progress.",
        session: {
          id: activeSession.id,
          playerName: activeSession.player_name,
          startedAt: activeSession.started_at
        }
      }
    };
  }

  const { data: insertedSession, error: insertError } = await supabase
    .from("game_sessions")
    .insert({
      device_id: normalizedDeviceId,
      player_name: normalizedPlayerName,
      status: "active"
    })
    .select("id, player_name, started_at")
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    status: 201,
    body: {
      ok: true,
      session: {
        id: insertedSession.id,
        playerName: insertedSession.player_name,
        startedAt: insertedSession.started_at
      }
    }
  };
}

async function finishSession({ sessionId, answers }) {
  const normalizedSessionId = String(sessionId || "").trim();
  const normalizedAnswers = Array.isArray(answers) ? answers.map((value) => Number(value)) : null;

  if (!normalizedSessionId) {
    return { status: 400, body: { ok: false, error: "Session ID is required." } };
  }

  if (
    !normalizedAnswers ||
    normalizedAnswers.length !== QUESTIONS.length ||
    normalizedAnswers.some((value) => !Number.isInteger(value))
  ) {
    return { status: 400, body: { ok: false, error: "A full set of answers is required." } };
  }

  const supabase = getSupabaseAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("id, device_id, player_name, started_at, status")
    .eq("id", normalizedSessionId)
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }

  if (!session || session.status !== "active") {
    return { status: 404, body: { ok: false, error: "Active session not found." } };
  }

  const finishedAt = new Date();
  const startedAt = new Date(session.started_at);
  const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
  const correctCount = scoreAnswers(normalizedAnswers);

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

  return {
    status: 200,
    body: {
      ok: true,
      result: normalizeLeaderboardRows([leaderboardEntry])[0]
    }
  };
}

async function clearLeaderboard() {
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

  return { status: 200, body: { ok: true } };
}

function getBrowserConfigResponse() {
  return {
    status: 200,
    body: {
      ok: true,
      supabase: getSupabaseBrowserConfig()
    }
  };
}

module.exports = {
  QUESTIONS,
  clearLeaderboard,
  fetchLeaderboard,
  finishSession,
  getBrowserConfigResponse,
  startSession
};
