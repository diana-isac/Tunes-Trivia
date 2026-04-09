const STORAGE_KEY = "tunes-and-trivia-scores";
const LETTERS = ["A", "B", "C", "D"];
const QUESTIONS = [
  {
    type: "trivia",
    prompt: "Which artist currently holds the all-time record for the most Grammy wins?",
    options: ["Taylor Swift", "Beyonce", "Adele", "Quincy Jones"],
    answer: 1
  },
  {
    type: "lyric",
    prompt: 'Finish the lyric: "Is this the real life? Is this just fantasy? Caught in a landslide..."',
    options: ["No escape from reality", "Hit me baby one more time", "Living on a prayer", "Under pressure tonight"],
    answer: 0
  },
  {
    type: "trivia",
    prompt: "What year did Spotify officially launch for public use?",
    options: ["2006", "2008", "2010", "2012"],
    answer: 1
  },
  {
    type: "lyric",
    prompt: 'Finish the lyric: "I got a feeling, that tonight is gonna be a good..."',
    options: ["Day", "Night", "Memory", "Time"],
    answer: 1
  },
  {
    type: "trivia",
    prompt: "Which city is widely known as the birthplace of jazz?",
    options: ["Chicago", "New Orleans", "Memphis", "St. Louis"],
    answer: 1
  },
  {
    type: "trivia",
    prompt: "Which instrument has 88 keys on a standard modern version?",
    options: ["Violin", "Drum kit", "Piano", "Trumpet"],
    answer: 2
  }
];

const state = {
  view: "play",
  stage: "intro",
  playerName: "",
  currentQuestion: 0,
  selectedIndex: null,
  submitted: false,
  answers: [],
  scores: []
};

const app = document.getElementById("app");
const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));

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

function createStorage() {
  if (window.storage && typeof window.storage.get === "function") {
    return {
      async getScores() {
        const result = await window.storage.get(STORAGE_KEY, true);
        return result ? JSON.parse(result.value) : [];
      },
      async saveScores(scores) {
        await window.storage.set(STORAGE_KEY, JSON.stringify(scores), true);
      },
      async clearScores() {
        await window.storage.delete(STORAGE_KEY, true);
      }
    };
  }

  return {
    async getScores() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
    async saveScores(scores) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    },
    async clearScores() {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };
}

const storage = createStorage();

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

function scoreGame() {
  return state.answers.filter((value, index) => value === QUESTIONS[index].answer).length;
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
  const scores = await storage.getScores();
  state.scores = scores
    .slice()
    .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
    .slice(0, 10);
}

async function persistScore() {
  const existing = await storage.getScores();
  const next = existing.concat({
    name: state.playerName,
    score: scoreGame(),
    timestamp: Date.now()
  });

  next.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
  await storage.saveScores(next);
  state.scores = next.slice(0, 10);
}

function resetRun() {
  state.stage = "intro";
  state.playerName = "";
  state.currentQuestion = 0;
  state.selectedIndex = null;
  state.submitted = false;
  state.answers = [];
}

function startGame(name) {
  state.playerName = name.trim();
  state.stage = "question";
  state.currentQuestion = 0;
  state.selectedIndex = null;
  state.submitted = false;
  state.answers = [];
  render();
}

function selectAnswer(index) {
  if (state.submitted) {
    return;
  }
  state.selectedIndex = index;
  render();
}

function lockAnswer() {
  if (state.selectedIndex === null || state.submitted) {
    return;
  }

  state.submitted = true;
  state.answers.push(state.selectedIndex);
  render();
}

async function advanceQuestion() {
  const isLast = state.currentQuestion === QUESTIONS.length - 1;
  if (isLast) {
    state.stage = "result";
    await persistScore();
    render();
    return;
  }

  state.currentQuestion += 1;
  state.selectedIndex = null;
  state.submitted = false;
  render();
}

async function clearLeaderboard() {
  await storage.clearScores();
  state.scores = [];
  render();
}

function renderIntro() {
  return `
    <section class="hero">
      <article class="panel hero-copy">
        <span class="hero-kicker">Music Quiz Night</span>
        <h2 class="hero-title">Start the set. <strong>Chase the leaderboard.</strong></h2>
        <p>
          Tunes & Trivia is a fast browser game built for live events, coffee chats, club tables,
          and campus giveaways. Players get one shot through a six-question mix of music facts
          and lyric prompts.
        </p>
        <div class="hero-grid">
          <div class="pill">
            <strong>6 quick questions</strong>
            <span>Short enough for walk-up traffic and repeat plays.</span>
          </div>
          <div class="pill">
            <strong>Live leaderboard</strong>
            <span>Scores are ranked instantly with stable tie-breaking.</span>
          </div>
          <div class="pill">
            <strong>Browser-safe storage</strong>
            <span>Works with custom window.storage or standard localStorage.</span>
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
            />
          </div>
          <button class="button button-primary" type="submit">Start Playing</button>
          <p class="meta-note">Six questions. About two minutes. Top ten scores stay on the board.</p>
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
              ? `<button class="button button-primary" type="button" id="next-button">${
                  state.currentQuestion === QUESTIONS.length - 1 ? "See My Score" : "Next Question"
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
  const score = scoreGame();
  const result = getResultMessage(score);
  const percent = `${(score / QUESTIONS.length) * 100}%`;

  return `
    <section class="panel result">
      <div class="score-ring" style="--pct: ${percent};"><span>${score}/${QUESTIONS.length}</span></div>
      <h2 class="result-title">${result.title}</h2>
      <p class="result-copy">${result.copy}</p>
      <div class="result-actions">
        <button class="button button-primary" type="button" id="play-again-button">Play Again</button>
        <button class="button button-secondary" type="button" id="show-board-button">View Leaderboard</button>
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
              <div class="player">${entry.score}/${QUESTIONS.length}</div>
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

    startGame(name);
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
  document.getElementById("play-again-button").addEventListener("click", () => {
    resetRun();
    render();
  });

  document.getElementById("show-board-button").addEventListener("click", async () => {
    state.view = "leaderboard";
    syncTabs();
    await refreshScores();
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

void refreshScores().then(() => {
  syncTabs();
  render();
});
