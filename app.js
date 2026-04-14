const DEVICE_KEY = "tunes-and-trivia-device-id";
const SESSION_KEY = "tunes-and-trivia-session";
const LETTERS = ["A", "B", "C", "D"];
const QUESTIONS = window.TUNES_TRIVIA_QUESTIONS || [];

const state = {
  view: "play",
  stage: "intro",
  playerName: "",
  currentQuestion: 0,
  selectedIndex: null,
  submitted: false,
  answers: [],
  scores: [],
  sessionId: null,
  score: null,
  durationMs: null,
  startError: "",
  boardError: "",
  introNotice: "",
  isBusy: false
};

const app = document.getElementById("app");
const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
let browserSupabase = null;

tabButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const tab = button.dataset.tab;
    state.view = tab;
    syncTabs();

    if (tab === "leaderboard") {
      await refreshScores();
    }

    render();
  });
});

function syncTabs() {
  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === state.view);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStorage() {
  return window.localStorage;
}

function getDeviceId() {
  const storage = getStorage();
  let value = storage.getItem(DEVICE_KEY);

  if (!value) {
    value = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    storage.setItem(DEVICE_KEY, value);
  }

  return value;
}

function loadSavedSession() {
  try {
    const raw = getStorage().getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSessionSnapshot() {
  if (!state.sessionId || state.stage !== "question") {
    getStorage().removeItem(SESSION_KEY);
    return;
  }

  getStorage().setItem(
    SESSION_KEY,
    JSON.stringify({
      sessionId: state.sessionId,
      playerName: state.playerName,
      currentQuestion: state.currentQuestion,
      selectedIndex: state.selectedIndex,
      submitted: state.submitted,
      answers: state.answers
    })
  );
}

function clearSessionSnapshot() {
  getStorage().removeItem(SESSION_KEY);
}

function restoreSavedSession() {
  const snapshot = loadSavedSession();

  if (!snapshot || !snapshot.sessionId) {
    return;
  }

  state.stage = "question";
  state.playerName = snapshot.playerName || "";
  state.currentQuestion = Number(snapshot.currentQuestion) || 0;
  state.selectedIndex = Number.isInteger(snapshot.selectedIndex) ? snapshot.selectedIndex : null;
  state.submitted = Boolean(snapshot.submitted);
  state.answers = Array.isArray(snapshot.answers) ? snapshot.answers : [];
  state.sessionId = snapshot.sessionId;
  state.introNotice = "Resumed your in-progress run on this device.";
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.code = payload.code || "request-failed";
    error.payload = payload;
    throw error;
  }

  return payload;
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getResultMessage(score) {
  if (score === QUESTIONS.length) {
    return {
      title: "Perfect set",
      copy: "You cleared every track. Put your name on the board and take a victory lap."
    };
  }

  if (score >= QUESTIONS.length - 1) {
    return {
      title: "Almost flawless",
      copy: "One miss away from a sweep. That is a serious music brain."
    };
  }

  if (score >= Math.ceil(QUESTIONS.length / 2)) {
    return {
      title: "Solid run",
      copy: "You held your own. Run it back and chase the top spot."
    };
  }

  return {
    title: "Warm-up round",
    copy: "The leaderboard is still open. Another round might hit harder."
  };
}

async function refreshScores() {
  try {
    const payload = await apiFetch("/api/leaderboard");
    state.scores = payload.scores || [];
    state.boardError = "";
  } catch (error) {
    state.boardError = error.message;
  }
}

async function ensureSupabaseClient() {
  if (browserSupabase || !window.supabase || typeof window.supabase.createClient !== "function") {
    return browserSupabase;
  }

  const payload = await apiFetch("/api/supabase/config");
  browserSupabase = window.supabase.createClient(payload.supabase.url, payload.supabase.anonKey);
  return browserSupabase;
}

function resetRun() {
  state.stage = "intro";
  state.playerName = "";
  state.currentQuestion = 0;
  state.selectedIndex = null;
  state.submitted = false;
  state.answers = [];
  state.sessionId = null;
  state.score = null;
  state.durationMs = null;
  state.startError = "";
  state.isBusy = false;
  clearSessionSnapshot();
}

async function startGame(name) {
  state.startError = "";
  state.introNotice = "";
  state.isBusy = true;
  render();

  try {
    const payload = await apiFetch("/api/session/start", {
      method: "POST",
      body: JSON.stringify({
        playerName: name.trim(),
        deviceId: getDeviceId()
      })
    });

    state.playerName = payload.session.playerName;
    state.stage = "question";
    state.currentQuestion = 0;
    state.selectedIndex = null;
    state.submitted = false;
    state.answers = [];
    state.sessionId = payload.session.id;
    state.score = null;
    state.durationMs = null;
    saveSessionSnapshot();
  } catch (error) {
    if (error.code === "already-played") {
      state.startError = "This device has already completed its run for the event.";
    } else if (error.code === "session-active") {
      const snapshot = loadSavedSession();
      if (snapshot && snapshot.sessionId === error.payload.session?.id) {
        restoreSavedSession();
      } else {
        state.startError = "This device already has an active run in progress.";
      }
    } else {
      state.startError = error.message;
    }
  } finally {
    state.isBusy = false;
    render();
  }
}

function selectAnswer(index) {
  if (state.submitted) {
    return;
  }

  state.selectedIndex = index;
  saveSessionSnapshot();
  render();
}

function lockAnswer() {
  if (state.selectedIndex === null || state.submitted) {
    return;
  }

  state.submitted = true;
  state.answers.push(state.selectedIndex);
  saveSessionSnapshot();
  render();
}

async function finishGame() {
  state.isBusy = true;
  render();

  try {
    const payload = await apiFetch("/api/session/finish", {
      method: "POST",
      body: JSON.stringify({
        sessionId: state.sessionId,
        answers: state.answers
      })
    });

    state.score = payload.result.score;
    state.durationMs = payload.result.durationMs;
    state.stage = "result";
    state.view = "play";
    clearSessionSnapshot();
    await refreshScores();
  } catch (error) {
    state.startError = error.message;
    state.stage = "intro";
    clearSessionSnapshot();
  } finally {
    state.isBusy = false;
    render();
  }
}

async function advanceQuestion() {
  const isLast = state.currentQuestion === QUESTIONS.length - 1;

  if (isLast) {
    await finishGame();
    return;
  }

  state.currentQuestion += 1;
  state.selectedIndex = null;
  state.submitted = false;
  saveSessionSnapshot();
  render();
}

async function clearLeaderboard() {
  state.boardError = "";

  try {
    await apiFetch("/api/leaderboard/clear", { method: "POST", body: JSON.stringify({}) });
    await refreshScores();
    resetRun();
  } catch (error) {
    state.boardError = error.message;
  }

  render();
}

function renderFeedback(message) {
  if (!message) {
    return "";
  }

  return `<p class="meta-note">${escapeHtml(message)}</p>`;
}

function renderIntro() {
  return `
    <section class="hero">
      <article class="panel hero-copy">
        <span class="hero-kicker">Music Quiz Night</span>
        <h2 class="hero-title">Start the set. <strong>Chase the leaderboard.</strong></h2>
        <p>
          Tunes & Trivia is a fast browser game built for live events, coffee chats, club tables,
          and campus giveaways. Players get one shot through a ten-question mix of music facts.
        </p>
        <div class="hero-grid">
          <div class="pill">
            <strong>${QUESTIONS.length} quick questions</strong>
            <span>Short enough for walk-up traffic and fast event play.</span>
          </div>
          <div class="pill">
            <strong>Live leaderboard</strong>
            <span>Scores are ranked instantly by score, then fastest finish time.</span>
          </div>
          <div class="pill">
            <strong>One run per device</strong>
            <span>Each browser gets one completed attempt for the event.</span>
          </div>
        </div>
      </article>

      <aside class="panel hero-card">
        <form id="start-form" class="stack">
          <div>
            <label class="field-label" for="player-name">Player Name</label>
            <input
              id="player-name"
              class="text-input"
              name="playerName"
              type="text"
              maxlength="30"
              placeholder="Enter your name"
              autocomplete="off"
              ${state.isBusy ? "disabled" : ""}
            />
          </div>
          <button class="button button-primary" type="submit" ${state.isBusy ? "disabled" : ""}>
            ${state.isBusy ? "Starting..." : "Start Playing"}
          </button>
          <p class="meta-note">Ten questions. One timed run. Top scores update live across every screen.</p>
          ${renderFeedback(state.introNotice)}
          ${renderFeedback(state.startError)}
        </form>
      </aside>
    </section>
  `;
}

function renderQuestion() {
  const question = QUESTIONS[state.currentQuestion];
  const progress = QUESTIONS.map((_, index) => {
    const status =
      index < state.currentQuestion
        ? "is-done"
        : index === state.currentQuestion
          ? "is-current"
          : "";

    return `<span class="progress-dot ${status}"></span>`;
  }).join("");

  const answers = question.options
    .map((option, index) => {
      let status = "";

      if (state.submitted) {
        if (index === question.answer) {
          status = "is-correct";
        } else if (index === state.selectedIndex) {
          status = "is-wrong";
        }
      } else if (index === state.selectedIndex) {
        status = "is-selected";
      }

      return `
        <button class="answer ${status}" type="button" data-answer="${index}">
          <span class="answer-key">${LETTERS[index]}</span>
          <span class="answer-copy">${escapeHtml(option)}</span>
        </button>
      `;
    })
    .join("");

  return `
    <section class="panel quiz">
      <div class="quiz-top">
        <div>
          <div class="progress">${progress}</div>
          <p class="meta-note">Question ${state.currentQuestion + 1} of ${QUESTIONS.length}</p>
        </div>
        <span class="chip ${question.type === "lyric" ? "chip-lyric" : "chip-trivia"}">
          ${question.type === "lyric" ? "Finish the lyric" : "Trivia"}
        </span>
      </div>

      <article class="panel question-card">
        <h2>${escapeHtml(question.prompt)}</h2>
        <div class="answers">${answers}</div>
        <div class="quiz-actions">
          ${
            state.submitted
              ? `<button class="button button-primary" type="button" id="next-button" ${state.isBusy ? "disabled" : ""}>${
                  state.currentQuestion === QUESTIONS.length - 1 ? (state.isBusy ? "Saving..." : "See My Score") : "Next Question"
                }</button>`
              : `<button class="button button-primary" type="button" id="lock-button" ${
                  state.selectedIndex === null ? "disabled" : ""
                }>Lock In</button>`
          }
          <button class="button button-secondary" type="button" id="restart-button">Restart</button>
        </div>
      </article>
    </section>
  `;
}

function renderResult() {
  const score = state.score ?? 0;
  const result = getResultMessage(score);
  const percent = `${(score / QUESTIONS.length) * 100}%`;

  return `
    <section class="panel result">
      <div class="score-ring" style="--pct: ${percent};"><span>${score}/${QUESTIONS.length}</span></div>
      <h2 class="result-title">${result.title}</h2>
      <p class="result-copy">${result.copy}</p>
      <p class="meta-note">Official finish time: ${state.durationMs === null ? "--" : formatDuration(state.durationMs)}</p>
      <div class="result-actions">
        <button class="button button-primary" type="button" id="show-board-button">View Leaderboard</button>
        <button class="button button-secondary" type="button" id="back-home-button">Back To Start</button>
      </div>
    </section>
  `;
}

function renderLeaderboard() {
  const items = state.scores.length
    ? state.scores
        .map((entry, index) => {
          const date = new Date(entry.timestamp).toLocaleString();
          return `
            <div class="leaderboard-row">
              <div class="rank">#${index + 1}</div>
              <div>
                <div class="player">${escapeHtml(entry.name)}</div>
                <div class="subtle">${date}</div>
              </div>
              <div class="player">${entry.score}/${QUESTIONS.length} · ${formatDuration(entry.durationMs)}</div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty">No scores yet. Start a round and set the pace.</div>`;

  return `
    <section class="panel leaderboard">
      <div class="leaderboard-header">
        <div>
          <h2 class="leaderboard-title">Leaderboard</h2>
          <p class="leaderboard-copy">Top ten scores ranked by score, then earliest finish time.</p>
        </div>
        <div class="leaderboard-actions">
          <button class="button button-secondary" type="button" id="refresh-board-button">Refresh</button>
          <button class="button button-secondary" type="button" id="clear-board-button">Clear Scores</button>
        </div>
      </div>
      ${renderFeedback(state.boardError)}
      <div class="leaderboard-list">${items}</div>
    </section>
  `;
}

function render() {
  if (state.view === "leaderboard") {
    app.innerHTML = renderLeaderboard();
    bindLeaderboardEvents();
    return;
  }

  if (state.stage === "intro") {
    app.innerHTML = renderIntro();
    bindIntroEvents();
    return;
  }

  if (state.stage === "question") {
    app.innerHTML = renderQuestion();
    bindQuestionEvents();
    return;
  }

  app.innerHTML = renderResult();
  bindResultEvents();
}

function bindIntroEvents() {
  const form = document.getElementById("start-form");
  const input = document.getElementById("player-name");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = input.value.trim();

    if (!name) {
      input.focus();
      return;
    }

    void startGame(name);
  });
}

function bindQuestionEvents() {
  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => {
      selectAnswer(Number(button.getAttribute("data-answer")));
    });
  });

  const lockButton = document.getElementById("lock-button");
  if (lockButton) {
    lockButton.addEventListener("click", lockAnswer);
  }

  const nextButton = document.getElementById("next-button");
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      void advanceQuestion();
    });
  }

  document.getElementById("restart-button").addEventListener("click", () => {
    resetRun();
    render();
  });
}

function bindResultEvents() {
  document.getElementById("show-board-button").addEventListener("click", async () => {
    state.view = "leaderboard";
    syncTabs();
    await refreshScores();
    render();
  });

  document.getElementById("back-home-button").addEventListener("click", () => {
    resetRun();
    render();
  });
}

function bindLeaderboardEvents() {
  document.getElementById("refresh-board-button").addEventListener("click", async () => {
    await refreshScores();
    render();
  });

  document.getElementById("clear-board-button").addEventListener("click", async () => {
    await clearLeaderboard();
  });
}

function connectLeaderboardStream() {
  void ensureSupabaseClient()
    .then((client) => {
      if (!client) {
        state.boardError = "Live leaderboard is unavailable. Manual refresh still works.";
        return;
      }

      client
        .channel("leaderboard-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "leaderboard_entries" },
          () => {
            void refreshScores().then(() => {
              if (state.view === "leaderboard") {
                render();
              }
            });
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            state.boardError = "Live leaderboard connection dropped. Manual refresh still works.";
            if (state.view === "leaderboard") {
              render();
            }
          }
        });
    })
    .catch(() => {
      state.boardError = "Live leaderboard is unavailable. Manual refresh still works.";
      if (state.view === "leaderboard") {
        render();
      }
    });
}

restoreSavedSession();

void refreshScores().then(() => {
  connectLeaderboardStream();
  syncTabs();
  render();
});
