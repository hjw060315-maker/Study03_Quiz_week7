// ===== 설정 =====
const CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"];

const MODES = {
  practice: { label: "연습", timeLimit: 0, hint: false, ranked: false, retry: true,
    rule: "시간 제한과 힌트 없음, 맞히면 1점, 틀린 문제 다시 풀기" },
  speed: { label: "스피드", timeLimit: 15, hint: false, ranked: true, retry: false,
    rule: "문항마다 15초, 시간이 지나면 오답" },
  hint: { label: "힌트", timeLimit: 0, hint: true, ranked: true, retry: false,
    rule: "문항마다 힌트 1번(오답 2개 지우기), 힌트를 쓰고 맞히면 0.5점" }
};
const URGENT_SECONDS = 5;

// ===== 순수 함수 =====
function shuffle(array, rand = Math.random) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatScore(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function prepareQuestion(q, rand = Math.random) {
  const order = shuffle([0, 1, 2, 3], rand);
  return { ...q, choices: order.map(i => q.choices[i]), answer: order.indexOf(q.answer) };
}

function buildRound(questions, category, rand = Math.random) {
  const picked = questions.filter(q => q.category === category);
  return shuffle(picked, rand).map(q => prepareQuestion(q, rand));
}

function validateQuestions(questions) {
  const errors = [];
  const seen = new Set();
  for (const q of questions) {
    const add = reason => errors.push({ id: q.id, category: q.category, reason });
    if (seen.has(q.id)) add("id 중복");
    seen.add(q.id);
    if (!CATEGORIES.includes(q.category)) add("알 수 없는 카테고리");
    if (!q.question) add("문제 문장 없음");
    if (!Array.isArray(q.choices) || q.choices.length !== 4) add("보기가 4개가 아님");
    else if (new Set(q.choices).size !== 4) add("보기 중복");
    if (![0, 1, 2, 3].includes(q.answer)) add("정답 인덱스가 0~3이 아님");
    if (!q.explanation) add("해설 없음");
    if (!q.source) add("출처 없음");
    if (!/^https?:\/\//.test(q.sourceUrl || "")) add("출처 주소가 http로 시작하지 않음");
  }
  const counts = CATEGORIES.map(c => questions.filter(q => q.category === c).length);
  const target = Math.max(...counts);
  CATEGORIES.forEach((c, i) => {
    if (target === 0) errors.push({ id: "-", category: c, reason: "문항 수 0개(1개 이상이어야 함)" });
    else if (counts[i] !== target) errors.push({ id: "-", category: c, reason: `문항 수 ${counts[i]}개(${target}개여야 함)` });
  });
  return errors;
}

function reportQuestions() {
  const errors = validateQuestions(QUESTIONS);
  for (const e of errors) console.log(`[${e.category}] ${e.id}: ${e.reason}`);
  console.log(`문항 ${QUESTIONS.length}개, 오류 ${errors.length}건`);
  return errors.length;
}

function scoreFor(correct, hintUsed) {
  if (!correct) return 0;
  return hintUsed ? 0.5 : 1;
}

function isUrgent(timeLeft) {
  return timeLeft <= URGENT_SECONDS;
}

function pickHintRemovals(answer, rand = Math.random) {
  const wrong = [0, 1, 2, 3].filter(i => i !== answer);
  return shuffle(wrong, rand).slice(0, 2).sort((a, b) => a - b);
}

// ===== 순위표 =====
const BOARD_KEY = "quizLeaderboard";
const BOARD_SIZE = 5;

function boardKey(mode, category) {
  return `${mode}|${category}`;
}

function parseBoard(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const board = {};
    for (const [key, list] of Object.entries(data)) {
      if (!Array.isArray(list)) continue;
      board[key] = list.filter(r => r && typeof r.name === "string" && typeof r.score === "number" && typeof r.date === "string");
    }
    return board;
  } catch (err) {
    return {};
  }
}

function insertRecord(list, record) {
  const next = list.slice();
  let pos = next.findIndex(r => r.score < record.score);
  if (pos === -1) pos = next.length;
  next.splice(pos, 0, record);
  return { list: next.slice(0, BOARD_SIZE), rank: pos < BOARD_SIZE ? pos + 1 : 0 };
}

function cleanName(name) {
  const trimmed = String(name || "").trim().slice(0, 10);
  return trimmed || "익명";
}

function todayString(date = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function loadBoard() {
  try {
    return parseBoard(localStorage.getItem(BOARD_KEY));
  } catch (err) {
    return {};
  }
}

function saveRecord(mode, category, name, score) {
  const board = loadBoard();
  const key = boardKey(mode, category);
  const { list, rank } = insertRecord(board[key] || [], { name: cleanName(name), score, date: todayString() });
  board[key] = list;
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(board));
  } catch (err) {
    return null;
  }
  return rank;
}

// ===== 자체 점검 =====
const TESTS = [];
function test(name, fn) {
  TESTS.push({ name, fn });
}
function assertEqual(actual, expected, label = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label} 기대 ${e}, 실제 ${a}`);
}
function runSelfTests() {
  let failed = 0;
  for (const t of TESTS) {
    try {
      t.fn();
      console.log("통과 " + t.name);
    } catch (err) {
      failed++;
      console.log("실패 " + t.name + ": " + err.message);
    }
  }
  console.log(`${TESTS.length - failed} / ${TESTS.length} 통과`);
  return failed;
}
const zero = () => 0;

test("shuffle: rand가 0이면 정해진 순서", () => assertEqual(shuffle([1, 2, 3, 4], zero), [2, 3, 4, 1]));
test("shuffle: 원본 배열을 바꾸지 않음", () => {
  const a = [1, 2, 3];
  shuffle(a);
  assertEqual(a, [1, 2, 3]);
});
test("formatScore: 정수와 0.5", () => {
  assertEqual(formatScore(8), "8");
  assertEqual(formatScore(7.5), "7.5");
  assertEqual(formatScore(0), "0");
});
function sampleQuestions() {
  return CATEGORIES.flatMap((c, ci) => Array.from({ length: 10 }, (_, i) => ({
    id: `t${ci}-${i}`, category: c, question: "문제", choices: ["가", "나", "다", "라"],
    answer: 0, explanation: "해설", source: "출처", sourceUrl: "https://example.com"
  })));
}
test("prepareQuestion: 섞은 뒤에도 정답 보기가 같음", () => {
  const q = { id: "x", choices: ["A", "B", "C", "D"], answer: 0 };
  const p = prepareQuestion(q, zero);
  assertEqual(p.choices, ["B", "C", "D", "A"]);
  assertEqual(p.answer, 3);
  assertEqual(q.choices, ["A", "B", "C", "D"], "원본 유지");
});
test("buildRound: 해당 카테고리 10개, 정답 유지", () => {
  const all = sampleQuestions();
  all[10].choices = ["정답", "오답1", "오답2", "오답3"];
  const round = buildRound(all, "세계지리");
  assertEqual(round.length, 10);
  assertEqual(round.every(q => q.category === "세계지리"), true);
  const moved = round.find(q => q.id === "t1-0");
  assertEqual(moved.choices[moved.answer], "정답");
});
test("validateQuestions: 올바른 40개는 오류 0건", () => assertEqual(validateQuestions(sampleQuestions()), []));
test("validateQuestions: 보기 3개", () => {
  const all = sampleQuestions();
  all[0].choices = ["가", "나", "다"];
  assertEqual(validateQuestions(all).map(e => e.reason), ["보기가 4개가 아님"]);
});
test("validateQuestions: 보기 중복", () => {
  const all = sampleQuestions();
  all[0].choices = ["가", "가", "다", "라"];
  assertEqual(validateQuestions(all).map(e => e.reason), ["보기 중복"]);
});
test("validateQuestions: id 중복", () => {
  const all = sampleQuestions();
  all[1].id = all[0].id;
  assertEqual(validateQuestions(all).map(e => e.reason), ["id 중복"]);
});
test("validateQuestions: 정답 인덱스 범위", () => {
  const all = sampleQuestions();
  all[0].answer = 4;
  assertEqual(validateQuestions(all).map(e => e.reason), ["정답 인덱스가 0~3이 아님"]);
});
test("validateQuestions: 해설·출처 누락", () => {
  const all = sampleQuestions();
  all[0].explanation = "";
  all[0].source = "";
  all[0].sourceUrl = "example.com";
  assertEqual(validateQuestions(all).map(e => e.reason), ["해설 없음", "출처 없음", "출처 주소가 http로 시작하지 않음"]);
});
test("validateQuestions: 카테고리 문항 수가 다르면 오류", () => {
  const all = sampleQuestions().slice(1);
  assertEqual(validateQuestions(all), [{ id: "-", category: "한국사", reason: "문항 수 9개(10개여야 함)" }]);
});
test("validateQuestions: 카테고리 문항 수가 같으면 10개가 아니어도 통과", () => {
  const all = sampleQuestions().filter(q => !q.id.endsWith("-9"));
  assertEqual(all.length, 36);
  assertEqual(validateQuestions(all), []);
});
test("validateQuestions: 문항이 하나도 없으면 오류", () => {
  assertEqual(validateQuestions([]).map(e => e.reason), CATEGORIES.map(() => "문항 수 0개(1개 이상이어야 함)"));
});
test("문항 데이터: 오류 0건", () => assertEqual(validateQuestions(QUESTIONS), []));
test("scoreFor: 정답 1점, 힌트 정답 0.5점, 오답 0점", () => {
  assertEqual(scoreFor(true, false), 1);
  assertEqual(scoreFor(true, true), 0.5);
  assertEqual(scoreFor(false, false), 0);
  assertEqual(scoreFor(false, true), 0);
});
test("MODES: 모드별 규칙", () => {
  assertEqual([MODES.practice.timeLimit, MODES.practice.hint, MODES.practice.ranked, MODES.practice.retry], [0, false, false, true]);
  assertEqual([MODES.speed.timeLimit, MODES.speed.hint, MODES.speed.ranked, MODES.speed.retry], [15, false, true, false]);
  assertEqual([MODES.hint.timeLimit, MODES.hint.hint, MODES.hint.ranked, MODES.hint.retry], [0, true, true, false]);
});
test("MODES: 모드마다 한 줄 규칙 설명이 있음", () => {
  for (const m of Object.values(MODES)) assertEqual(typeof m.rule === "string" && m.rule.length > 0, true, m.label);
});
test("isUrgent: 5초 이하에서만 경고", () => {
  assertEqual([15, 6, 5, 1, 0].map(isUrgent), [false, false, true, true, true]);
});
test("pickHintRemovals: rand가 0이면 정해진 2개", () => assertEqual(pickHintRemovals(2, zero), [1, 3]));
test("pickHintRemovals: 항상 오답 2개", () => {
  for (let answer = 0; answer < 4; answer++) {
    for (let k = 0; k < 20; k++) {
      const r = pickHintRemovals(answer);
      assertEqual(r.length, 2, "개수");
      assertEqual(r.includes(answer), false, "정답 제외");
      assertEqual(r[0] !== r[1], true, "서로 다름");
    }
  }
});
test("prepareQuestion: 두 번 적용해도 정답 보기가 같음", () => {
  const q = { id: "x", choices: ["A", "B", "C", "D"], answer: 2 };
  const p = prepareQuestion(prepareQuestion(q), Math.random);
  assertEqual(p.choices[p.answer], "C");
});
test("insertRecord: 빈 표에 넣으면 1위", () => {
  const { list, rank } = insertRecord([], { name: "A", score: 7, date: "d" });
  assertEqual(rank, 1);
  assertEqual(list.length, 1);
});
test("insertRecord: 같은 점수는 먼저 세운 기록이 위", () => {
  const { list, rank } = insertRecord([{ name: "A", score: 9, date: "d" }], { name: "B", score: 9, date: "d" });
  assertEqual(list.map(r => r.name), ["A", "B"]);
  assertEqual(rank, 2);
});
test("insertRecord: 5건을 넘으면 잘림", () => {
  const full = [10, 9, 8, 7, 6].map((s, i) => ({ name: "P" + i, score: s, date: "d" }));
  const low = insertRecord(full, { name: "L", score: 5, date: "d" });
  assertEqual(low.rank, 0);
  assertEqual(low.list.length, 5);
  const high = insertRecord(full, { name: "H", score: 9.5, date: "d" });
  assertEqual(high.rank, 2);
  assertEqual(high.list.map(r => r.name), ["P0", "H", "P1", "P2", "P3"]);
});
test("parseBoard: 깨진 값은 빈 순위표", () => {
  assertEqual(parseBoard("깨진값"), {});
  assertEqual(parseBoard(null), {});
  assertEqual(parseBoard("[1,2]"), {});
  assertEqual(parseBoard('{"speed|과학":"x"}'), {});
});
test("parseBoard: 올바른 기록만 남김", () => {
  const text = JSON.stringify({ "speed|과학": [{ name: "A", score: 8, date: "2026-10-08" }, { name: 3 }] });
  assertEqual(parseBoard(text), { "speed|과학": [{ name: "A", score: 8, date: "2026-10-08" }] });
});
test("cleanName: 공백 제거, 10자, 빈 이름은 익명", () => {
  assertEqual(cleanName("  민지  "), "민지");
  assertEqual(cleanName(""), "익명");
  assertEqual(cleanName("   "), "익명");
  assertEqual(cleanName("가나다라마바사아자차카"), "가나다라마바사아자차");
});
test("todayString: YYYY-MM-DD", () => assertEqual(todayString(new Date(2026, 9, 8)), "2026-10-08"));
function fakeStorage(failOnSet) {
  const data = {};
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => {
      if (failOnSet) throw new Error("저장 불가");
      data[k] = String(v);
    },
    data
  };
}
test("saveRecord: 저장하고 순위를 돌려줌", () => {
  globalThis.localStorage = fakeStorage(false);
  try {
    assertEqual(saveRecord("speed", "과학", "민지", 8), 1);
    assertEqual(saveRecord("speed", "과학", "", 9), 1);
    const board = JSON.parse(localStorage.data[BOARD_KEY]);
    assertEqual(board["speed|과학"].map(r => [r.name, r.score]), [["익명", 9], ["민지", 8]]);
  } finally {
    delete globalThis.localStorage;
  }
});
test("saveRecord: 저장할 수 없으면 null", () => {
  globalThis.localStorage = fakeStorage(true);
  try {
    assertEqual(saveRecord("hint", "한국사", "A", 5), null);
  } finally {
    delete globalThis.localStorage;
  }
});
test("loadBoard: localStorage가 없으면 빈 순위표", () => assertEqual(loadBoard(), {}));

// ===== 화면 =====
const state = {
  mode: "practice",
  category: null,
  questions: [],
  roundSize: 0,
  index: 0,
  score: 0,
  firstScore: 0,
  wrong: [],
  isRetry: false,
  hintUsed: false,
  timerId: null,
  timeLeft: 0
};
const boardView = { mode: "speed", category: CATEGORIES[0] };
let brokenCategories = new Set();

function $(id) {
  return document.getElementById(id);
}

function showScreen(name) {
  for (const section of document.querySelectorAll(".screen")) {
    section.hidden = section.id !== "screen-" + name;
  }
}

function renderOptionButtons(containerId, options, selected, onPick) {
  const box = $(containerId);
  box.innerHTML = "";
  for (const [value, label] of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.classList.toggle("selected", value === selected);
    btn.addEventListener("click", () => onPick(value));
    box.appendChild(btn);
  }
}

function renderStart() {
  const box = $("category-buttons");
  box.innerHTML = "";
  for (const c of CATEGORIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = c;
    btn.disabled = brokenCategories.has(c);
    btn.addEventListener("click", () => renderModeSelect(c));
    box.appendChild(btn);
  }
  showScreen("start");
}

function renderModeSelect(category) {
  state.category = category;
  $("mode-title").textContent = `${category} · 모드를 고르세요`;
  const box = $("mode-list");
  box.innerHTML = "";
  for (const [key, mode] of Object.entries(MODES)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mode-option";
    const parts = [["mode-name", mode.label], ["mode-rule", mode.rule]];
    if (!mode.ranked) parts.push(["mode-notice", "순위표에 기록되지 않음"]);
    for (const [cls, text] of parts) {
      const span = document.createElement("span");
      span.className = cls;
      span.textContent = text;
      btn.appendChild(span);
    }
    btn.addEventListener("click", () => startGame(key, category));
    box.appendChild(btn);
  }
  showScreen("mode");
}

function startGame(mode, category) {
  state.mode = mode;
  state.category = category;
  state.questions = buildRound(QUESTIONS, category);
  state.roundSize = state.questions.length;
  state.index = 0;
  state.score = 0;
  state.wrong = [];
  state.isRetry = false;
  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.index];
  const mode = MODES[state.mode];
  state.hintUsed = false;
  $("quiz-label").textContent = `${state.category} · ${mode.label}${state.isRetry ? " · 다시 풀기" : ""}`;
  $("quiz-progress").textContent = `${state.index + 1} / ${state.questions.length}`;
  $("quiz-score").textContent = `점수 ${formatScore(state.score)}`;
  $("quiz-question").textContent = q.question;
  const box = $("quiz-choices");
  box.innerHTML = "";
  q.choices.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = `${i + 1}. ${text}`;
    btn.addEventListener("click", () => selectAnswer(i));
    box.appendChild(btn);
  });
  $("quiz-feedback").hidden = true;
  $("hint-button").hidden = !mode.hint;
  $("hint-button").disabled = false;
  $("timer").hidden = mode.timeLimit === 0;
  if (mode.timeLimit > 0) startTimer();
}

function selectAnswer(i) {
  stopTimer();
  $("hint-button").disabled = true;
  const q = state.questions[state.index];
  const correct = i === q.answer;
  state.score += scoreFor(correct, state.hintUsed);
  if (!correct) state.wrong.push(q);
  for (const [j, btn] of document.querySelectorAll("#quiz-choices .choice").entries()) {
    btn.disabled = true;
    if (j === q.answer) btn.classList.add("correct");
    else if (j === i) btn.classList.add("wrong");
  }
  $("quiz-score").textContent = `점수 ${formatScore(state.score)}`;
  const result = $("feedback-result");
  result.textContent = correct ? "정답!" : (i === -1 ? "시간 초과 · 오답" : "오답");
  result.className = "feedback-result " + (correct ? "is-correct" : "is-wrong");
  $("feedback-explanation").textContent = `정답: ${q.choices[q.answer]} — ${q.explanation}`;
  $("feedback-source").textContent = q.source;
  $("feedback-source").href = q.sourceUrl;
  $("next-button").textContent = state.index === state.questions.length - 1 ? "결과 보기" : "다음";
  $("quiz-feedback").hidden = false;
}

function nextQuestion() {
  if (state.index < state.questions.length - 1) {
    state.index++;
    renderQuestion();
  } else {
    renderResult();
  }
}

function startTimer() {
  stopTimer();
  state.timeLeft = MODES[state.mode].timeLimit;
  updateTimer();
  state.timerId = setInterval(() => {
    state.timeLeft--;
    updateTimer();
    if (state.timeLeft <= 0) onTimeout();
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function updateTimer() {
  $("timer-text").textContent = `${state.timeLeft}초`;
  $("timer").classList.toggle("urgent", isUrgent(state.timeLeft));
  $("timer-fill").style.width = `${(state.timeLeft / MODES[state.mode].timeLimit) * 100}%`;
}

function onTimeout() {
  selectAnswer(-1);
}

function useHint() {
  const q = state.questions[state.index];
  state.hintUsed = true;
  const buttons = document.querySelectorAll("#quiz-choices .choice");
  for (const i of pickHintRemovals(q.answer)) {
    buttons[i].disabled = true;
    buttons[i].classList.add("removed");
  }
  $("hint-button").disabled = true;
}

function startRetry() {
  state.questions = shuffle(state.wrong).map(q => prepareQuestion(q));
  state.wrong = [];
  state.index = 0;
  state.score = 0;
  state.isRetry = true;
  showScreen("quiz");
  renderQuestion();
}

function renderResult() {
  const mode = MODES[state.mode];
  if (!state.isRetry) state.firstScore = state.score;
  $("result-label").textContent = `${state.category} · ${mode.label}`;
  $("result-score").textContent = `${formatScore(state.firstScore)} / ${state.roundSize}`;
  $("result-notice").hidden = mode.ranked;
  $("retry-summary").hidden = !state.isRetry;
  $("retry-summary").textContent = `다시 푼 결과 ${formatScore(state.score)} / ${state.questions.length}`;
  $("retry-button").hidden = !(mode.retry && state.wrong.length > 0);
  $("save-form").hidden = !mode.ranked;
  $("save-button").disabled = false;
  $("save-message").hidden = true;
  showScreen("result");
}

function onSaveRecord(event) {
  event.preventDefault();
  const rank = saveRecord(state.mode, state.category, $("name-input").value, state.firstScore);
  const message = $("save-message");
  if (rank === null) message.textContent = "기록을 저장할 수 없습니다";
  else if (rank === 0) message.textContent = "상위 5건에 들지 못했습니다";
  else message.textContent = `${rank}위로 기록했습니다`;
  message.hidden = false;
  $("save-button").disabled = true;
}

function renderLeaderboard() {
  renderOptionButtons("board-modes", ["speed", "hint"].map(k => [k, MODES[k].label]), boardView.mode, mode => {
    boardView.mode = mode;
    renderLeaderboard();
  });
  renderOptionButtons("board-categories", CATEGORIES.map(c => [c, c]), boardView.category, category => {
    boardView.category = category;
    renderLeaderboard();
  });
  const list = loadBoard()[boardKey(boardView.mode, boardView.category)] || [];
  const body = $("board-body");
  body.innerHTML = "";
  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "아직 기록이 없습니다";
    tr.appendChild(td);
    body.appendChild(tr);
  }
  list.forEach((r, i) => {
    const tr = document.createElement("tr");
    for (const value of [i + 1, r.name, formatScore(r.score), r.date]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  showScreen("board");
}

// ===== 시작 =====
function init() {
  const errors = validateQuestions(QUESTIONS);
  for (const e of errors) console.error(`문항 오류 [${e.category}] ${e.id}: ${e.reason}`);
  brokenCategories = new Set(errors.map(e => e.category));
  $("next-button").addEventListener("click", nextQuestion);
  $("hint-button").addEventListener("click", useHint);
  $("retry-button").addEventListener("click", startRetry);
  $("again-button").addEventListener("click", () => startGame(state.mode, state.category));
  $("home-button").addEventListener("click", renderStart);
  $("save-form").addEventListener("submit", onSaveRecord);
  $("board-button").addEventListener("click", renderLeaderboard);
  $("board-home-button").addEventListener("click", renderStart);
  $("mode-back-button").addEventListener("click", renderStart);
  renderStart();
}

if (typeof document !== "undefined") init();
