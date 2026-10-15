# 상식 퀴즈 웹 앱 구현 계획서

> **실행자에게:** 이 계획은 PRD.md와 함께 읽습니다. 문항을 만들거나 고칠 때는 CLAUDE.md의 문항 작성 규칙 10개를 따릅니다.
> 태스크는 순서대로 하나씩 실행하고, 각 단계(1·2·3단계)의 마지막 태스크가 끝나면 **반드시 멈추고** 사람이 "직접 확인할 항목"을 브라우저에서 확인할 때까지 기다립니다. 사람이 확인했다고 말하기 전에는 다음 단계로 넘어가지 않습니다.
> 체크박스(`- [ ]`)는 진행하면서 `- [x]`로 바꿉니다.

**목표:** 서버 없이 `index.html`을 더블클릭해 여는 4지선다 상식 퀴즈 웹 앱(카테고리 4개 × 10문제, 연습·스피드·힌트 모드, 순위표)을 3단계로 만든다.

**구조:** 화면 뼈대는 `index.html`에 `<section>` 4개로 미리 두고, `script.js`는 상태 객체 `state` 하나와 모드 설정표 `MODES`를 바탕으로 한 번에 한 화면만 보이게 하며 내용을 채운다. 문항은 `questions.js`의 전역 상수 `QUESTIONS`이다. 브라우저와 상관없는 계산(섞기, 점수, 문항 검사, 순위표 정렬)은 순수 함수로 나누고, `script.js` 안의 자체 점검 코드로 Node에서 확인한다.

**기술:** HTML, CSS, 순수 자바스크립트(라이브러리 없음), `localStorage`. 자체 점검은 Node.js(v24에서 확인)로 실행한다.

**명세:** [PRD.md](PRD.md), 문항 규칙은 [CLAUDE.md](CLAUDE.md)

## 전체 제약

- 파일은 `index.html`, `style.css`, `script.js`, `questions.js` 4개만 둔다. 점검 코드도 별도 파일 없이 `script.js` 안에 둔다.
- `file://`로 열어도 동작해야 하므로 `fetch`, ES 모듈(`import`/`export`), 외부 CDN을 쓰지 않는다. `index.html`은 `questions.js`를 먼저, 그다음 `script.js`를 `<script>`로 불러온다.
- 카테고리 4개(한국사, 세계지리, 과학, 예술과 문화), 카테고리마다 10문제, 총 40문제. `id` 접두사는 `kh`, `wg`, `sc`, `ac`.
- 점수: 맞히면 1점, 힌트 모드에서 힌트를 쓰고 맞히면 0.5점, 틀리면 모든 모드에서 0점.
- 연습 모드는 순위표에 기록하지 않고, 시작 화면과 결과 화면에 "순위표에 기록되지 않음"을 표시한다.
- 순위표는 `localStorage` 키 `quizLeaderboard` 하나, 모드(스피드·힌트)×카테고리별 표 8개, 표마다 상위 5건, 기록은 이름·점수·날짜.
- 사용자에게 보이는 문구는 한국어로 쓴다.

### 점검 명령

프로젝트 폴더에서 실행한다. 두 명령은 마지막 단어만 다르다.

**자체 점검** — `script.js`의 `runSelfTests()`를 실행한다. 실패가 하나라도 있으면 종료 코드가 1이다.

```bash
node -e "const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console});vm.runInContext(fs.readFileSync('questions.js','utf8')+'\n'+fs.readFileSync('script.js','utf8')+'\nglobalThis.__r='+process.argv[1]+'();',ctx);process.exit(ctx.__r===0?0:1)" runSelfTests
```

**문항 검사** — `reportQuestions()`를 실행해 문항 오류를 카테고리별로 출력한다.

```bash
node -e "const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console});vm.runInContext(fs.readFileSync('questions.js','utf8')+'\n'+fs.readFileSync('script.js','utf8')+'\nglobalThis.__r='+process.argv[1]+'();',ctx);process.exit(ctx.__r===0?0:1)" reportQuestions
```

`node`를 찾지 못한다는 오류가 나면 Node.js를 설치한 뒤 터미널(또는 세션)을 새로 연다.

### 커밋

각 태스크의 마지막 단계는 커밋이다. 점검 명령이 통과한 뒤에 커밋한다. 점검이 실패하면 커밋하지 않고 원인을 고친다.

---

## 파일 구조

| 파일 | 맡는 일 |
|---|---|
| `index.html` | 화면 뼈대 4개(`screen-start`, `screen-quiz`, `screen-result`, `screen-board`)와 스크립트 로드 순서 |
| `style.css` | 화면 스타일, 정답·오답 색, 타이머 막대, 순위표 표 |
| `questions.js` | `const QUESTIONS = [...]` 40문항 데이터만 |
| `script.js` | 아래 6개 구역으로 나눈다. 구역 머리 주석은 태스크 1에서 만들고, 이후 태스크는 "어느 구역 끝에 추가"로 위치를 가리킨다. |

`script.js`의 구역(위에서 아래 순서):

```
// ===== 설정 =====        상수: CATEGORIES, QUESTIONS_PER_ROUND, MODES
// ===== 순수 함수 =====    shuffle, formatScore, prepareQuestion, buildRound, validateQuestions, reportQuestions, scoreFor, pickHintRemovals
// ===== 순위표 =====      BOARD_KEY, BOARD_SIZE, boardKey, parseBoard, insertRecord, cleanName, todayString, loadBoard, saveRecord
// ===== 자체 점검 =====    test, assertEqual, runSelfTests, 점검 항목들
// ===== 화면 =====        state, $, showScreen, render…, startGame, selectAnswer, nextQuestion, 타이머, 힌트, 다시 풀기, 순위표 화면
// ===== 시작 =====        init()과 브라우저에서만 init()을 부르는 줄
```

"구역 끝에 추가"는 다음 구역의 머리 주석 바로 위에 넣는다는 뜻이다. 마지막 줄 `if (typeof document !== "undefined") init();` 덕분에 Node에서 불러올 때는 화면 코드가 실행되지 않는다.

---

# 1단계: 연습 모드와 점수 (태스크 1~8)

**만들 것:**
- 시작 화면에서 카테고리를 고르면 연습 모드로 10문제를 푼다.
- 답을 고르면 곧바로 정답 여부, 한 줄 해설, 출처 링크를 보여 준다.
- 결과 화면에서 점수를 보여 준다.
- 웹에서 출처 2곳으로 확인한 40문항을 넣는다.

모드 선택 화면, 틀린 문제 다시 풀기, 스피드·힌트 모드, 순위표는 아직 만들지 않는다.

### 태스크 1: 파일 뼈대와 자체 점검 틀

**파일:**
- 만들기: `index.html`, `style.css`, `questions.js`, `script.js`

**인터페이스:**
- 만드는 것: `shuffle(array, rand = Math.random) → 새 배열`, `formatScore(n) → 문자열`, `test(name, fn)`, `assertEqual(actual, expected, label)`, `runSelfTests() → 실패 개수`, 상수 `zero`(늘 0을 돌려주는 가짜 난수)

- [x] **1단계: `index.html` 만들기 (1단계용 화면 3개)**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>상식 퀴즈</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main id="app">
    <section id="screen-start" class="screen">
      <h1>상식 퀴즈</h1>
      <p id="start-notice" class="notice">순위표에 기록되지 않음</p>
      <h2>카테고리</h2>
      <div id="category-buttons" class="button-grid"></div>
    </section>

    <section id="screen-quiz" class="screen" hidden>
      <div class="quiz-header">
        <span id="quiz-label"></span>
        <span id="quiz-progress"></span>
        <span id="quiz-score"></span>
      </div>
      <p id="quiz-question" class="question"></p>
      <div id="quiz-choices" class="choices"></div>
      <div id="quiz-feedback" class="feedback" hidden>
        <p id="feedback-result" class="feedback-result"></p>
        <p id="feedback-explanation"></p>
        <p class="source">출처: <a id="feedback-source" target="_blank" rel="noopener"></a></p>
        <button id="next-button" type="button">다음</button>
      </div>
    </section>

    <section id="screen-result" class="screen" hidden>
      <h1>결과</h1>
      <p id="result-label"></p>
      <p id="result-score" class="big-score"></p>
      <p id="result-notice" class="notice">순위표에 기록되지 않음</p>
      <div class="button-row">
        <button id="again-button" type="button">다시 하기</button>
        <button id="home-button" type="button">처음으로</button>
      </div>
    </section>
  </main>
  <script src="questions.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

- [x] **2단계: `style.css` 만들기 (기본 스타일)**

```css
:root {
  --bg: #f6f7fb;
  --card: #ffffff;
  --text: #1f2430;
  --muted: #667085;
  --primary: #3b5bdb;
  --correct: #2f9e44;
  --wrong: #e03131;
  --border: #d0d5dd;
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }

body {
  margin: 0;
  font-family: system-ui, "Malgun Gothic", sans-serif;
  background: var(--bg);
  color: var(--text);
}

#app { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
.screen { background: var(--card); border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
h1 { margin-top: 0; }
h2 { font-size: 1rem; color: var(--muted); }

button {
  font: inherit;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
}
button:hover:not(:disabled) { border-color: var(--primary); }
button:disabled { cursor: default; opacity: 0.6; }

.button-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
.button-row { display: flex; gap: 8px; flex-wrap: wrap; }
.notice { color: var(--muted); font-size: 0.9rem; }

.quiz-header { display: flex; justify-content: space-between; color: var(--muted); margin-bottom: 12px; }
.question { font-size: 1.15rem; font-weight: 600; }
.choices { display: grid; gap: 8px; }
.choice { text-align: left; }
.choice:disabled { opacity: 1; }
.choice.correct { background: #ebfbee; border-color: var(--correct); color: var(--correct); font-weight: 600; }
.choice.wrong { background: #fff5f5; border-color: var(--wrong); color: var(--wrong); }

.feedback { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); }
.feedback-result.is-correct { color: var(--correct); font-weight: 700; }
.feedback-result.is-wrong { color: var(--wrong); font-weight: 700; }
.source { font-size: 0.85rem; color: var(--muted); }
.big-score { font-size: 2.5rem; font-weight: 700; margin: 8px 0; }
```

`[hidden] { display: none !important; }`는 `display: grid` 같은 규칙이 `hidden` 속성을 덮어쓰지 못하게 한다.

- [x] **3단계: `questions.js` 만들기 (빈 목록)**

```js
const QUESTIONS = [
];
```

- [x] **4단계: `script.js` 만들기 — 구역 머리와 점검 틀, 실패할 점검 항목**

```js
// ===== 설정 =====

// ===== 순수 함수 =====

// ===== 순위표 =====

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

// ===== 화면 =====

// ===== 시작 =====
```

- [x] **5단계: 자체 점검을 실행해 실패를 확인**

실행: 자체 점검 명령
기대: `실패 shuffle: … shuffle is not defined` 등 실패 3건, `0 / 3 통과`, 종료 코드 1

- [x] **6단계: `// ===== 순수 함수 =====` 구역 끝에 `shuffle`, `formatScore` 추가**

```js
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
```

- [x] **7단계: 자체 점검을 실행해 통과를 확인**

실행: 자체 점검 명령
기대: `3 / 3 통과`, 종료 코드 0

- [x] **8단계: 커밋**

```bash
git add index.html style.css questions.js script.js
git commit -m "feat: 파일 뼈대와 자체 점검 틀"
```

### 태스크 2: 문항 섞기와 문항 검사

**파일:**
- 고치기: `script.js` (설정, 순수 함수, 자체 점검 구역)

**인터페이스:**
- 쓰는 것: `shuffle`, `test`, `assertEqual`, `zero`
- 만드는 것: `CATEGORIES`(배열), `QUESTIONS_PER_ROUND`(10), `prepareQuestion(q, rand) → 보기를 섞고 answer를 다시 계산한 새 문항`, `buildRound(questions, category, rand) → 그 카테고리 문항을 섞은 배열`, `validateQuestions(questions) → [{ id, category, reason }]`, `reportQuestions() → 오류 개수`

- [x] **1단계: `// ===== 자체 점검 =====` 구역 끝에 점검 항목 추가**

```js
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
test("validateQuestions: 카테고리 문항 수", () => {
  const all = sampleQuestions().slice(1);
  assertEqual(validateQuestions(all), [{ id: "-", category: "한국사", reason: "문항 수 9개(10개여야 함)" }]);
});
```

- [x] **2단계: 자체 점검을 실행해 실패를 확인**

실행: 자체 점검 명령
기대: 새 항목 9개가 `… is not defined`로 실패, `3 / 12 통과`, 종료 코드 1

- [x] **3단계: `// ===== 설정 =====` 구역 끝에 상수 추가**

```js
const CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"];
const QUESTIONS_PER_ROUND = 10;
```

- [x] **4단계: `// ===== 순수 함수 =====` 구역 끝에 함수 추가**

```js
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
  for (const c of CATEGORIES) {
    const n = questions.filter(q => q.category === c).length;
    if (n !== QUESTIONS_PER_ROUND) errors.push({ id: "-", category: c, reason: `문항 수 ${n}개(10개여야 함)` });
  }
  return errors;
}

function reportQuestions() {
  const errors = validateQuestions(QUESTIONS);
  for (const e of errors) console.log(`[${e.category}] ${e.id}: ${e.reason}`);
  console.log(`문항 ${QUESTIONS.length}개, 오류 ${errors.length}건`);
  return errors.length;
}
```

`prepareQuestion`은 보기 문자열이 아니라 위치(0~3)를 섞은 뒤 정답 위치를 다시 찾는다. 그래서 보기 문자열이 겹쳐도 정답이 바뀌지 않는다.

- [x] **5단계: 자체 점검을 실행해 통과를 확인**

실행: 자체 점검 명령
기대: `12 / 12 통과`, 종료 코드 0

- [x] **6단계: 문항 검사 명령이 빈 목록을 잡아내는지 확인**

실행: 문항 검사 명령
기대: `[한국사] -: 문항 수 0개(10개여야 함)` 등 카테고리 4줄, `문항 0개, 오류 4건`

- [x] **7단계: 커밋**

```bash
git add script.js
git commit -m "feat: 문항 섞기와 문항 검사 함수"
```

### 태스크 3~6 공통: 문항 작성 절차

태스크 3~6은 카테고리마다 10문항을 `questions.js`에 넣는다. 네 태스크 모두 아래 절차를 그대로 따른다.

1. **주제 고르기:** 그 카테고리에서 대학 1학년이 상식으로 알 만한 주제를 12개쯤 고른다. 한 주제는 한 문항이 되고, 확인이 안 되는 주제를 버릴 수 있게 2개를 여유로 둔다.
2. **사실 확인 (CLAUDE.md 규칙 4):**
   - 문항마다 정답과 해설에 쓴 사실을 웹 검색으로 출처 **2곳 이상**에서 확인한다. 실제 페이지를 열어 읽는다.
   - 출처는 공공기관, 백과사전, 박물관·학회 같은 교육 사이트를 우선하고, 위키백과, 나무위키, 블로그는 쓰지 않는다(CLAUDE.md 규칙 4).
   - 출처끼리 값(연도, 수치, 순위)이 다르면 그 값은 문제와 해설에 쓰지 않는다.
   - 확인이 안 되는 주제는 버리고 여유 주제로 바꾼다.
3. **문항 쓰기:**
   - CLAUDE.md 규칙 1~3, 5, 7~10을 지킨다. 정답은 하나뿐이고, 최상급 표현에는 기준과 시점을 밝히고, 보기 4개는 서로 다르다.
   - 출처 문장을 옮겼으면 다시 읽어 문법을 확인한다. 오답 3개는 정답과 같은 유형으로 그럴듯하게 쓴다.
   - 보기 길이와 형식을 비슷하게 맞추고, 부정문과 "모두 맞음" 같은 보기를 쓰지 않는다.
   - 해설은 PRD 2.2를 따른다. 60자 이내의 한 줄로 쓰고, `source`에 기관(사이트)명, `sourceUrl`에 실제로 연 페이지 주소를 적는다.
4. **형식:** 아래 모양으로 `QUESTIONS` 배열 끝에 이어 붙인다. `answer`는 정답 보기의 위치(0~3)다. 정답 위치는 판마다 섞이므로 데이터에서는 어디에 두어도 된다.

```js
  {
    id: "kh-01",
    category: "한국사",
    question: "문제 문장",
    choices: ["보기1", "보기2", "보기3", "보기4"],
    answer: 0,
    explanation: "60자 이내의 한 줄 해설",
    source: "확인한 기관(사이트)명",
    sourceUrl: "https://실제로-연-페이지-주소"
  },
```

5. **검수표:** 대화에 아래 표를 적어 보고한다. 규칙 6(정답 번호와 해설이 서로 맞는지)도 이 표를 쓰면서 확인한다.

| id | 정답 | 확인한 출처 2곳 | 갈린 값과 처리 | 걸린 규칙과 고친 내용 |
|---|---|---|---|---|

6. **검사:** 문항 검사 명령을 실행해 출력에 그 카테고리의 줄이 하나도 없는지 확인한다. 아직 넣지 않은 카테고리의 `문항 수 0개` 줄은 남아 있어도 된다.

### 태스크 3: 한국사 문항 10개 (`kh-01`~`kh-10`)

**파일:**
- 고치기: `questions.js`

**인터페이스:**
- 만드는 것: `QUESTIONS`에 `category: "한국사"` 문항 10개

- [x] **1단계:** 공통 절차 1~2(주제 고르기, 출처 2곳 확인)
- [x] **2단계:** 공통 절차 3~4로 `kh-01`~`kh-10`을 `QUESTIONS`에 넣기
- [x] **3단계:** 공통 절차 5의 검수표를 대화에 보고
- [x] **4단계:** 문항 검사 명령 실행. 기대: `[한국사]`로 시작하는 줄이 없음, `문항 10개, 오류 3건`(나머지 카테고리의 문항 수 오류)
- [x] **5단계:** 자체 점검 명령 실행. 기대: `12 / 12 통과`
- [x] **6단계: 커밋**

```bash
git add questions.js
git commit -m "feat: 한국사 문항 10개"
```

### 태스크 4: 세계지리 문항 10개 (`wg-01`~`wg-10`)

**파일:**
- 고치기: `questions.js`

**인터페이스:**
- 만드는 것: `QUESTIONS`에 `category: "세계지리"` 문항 10개

- [x] **1단계:** 공통 절차 1~2(주제 고르기, 출처 2곳 확인). 세계지리는 면적, 인구, 길이, 높이처럼 최상급과 수치가 많은 분야다. 그래서 규칙 2(기준과 시점)와 규칙 4(출처끼리 값이 다르면 쓰지 않음)를 특히 확인한다.
- [x] **2단계:** 공통 절차 3~4로 `wg-01`~`wg-10`을 `QUESTIONS` 끝에 넣기
- [x] **3단계:** 공통 절차 5의 검수표를 대화에 보고
- [x] **4단계:** 문항 검사 명령 실행. 기대: `[세계지리]`, `[한국사]` 줄이 없음, `문항 20개, 오류 2건`
- [x] **5단계:** 자체 점검 명령 실행. 기대: `12 / 12 통과`
- [x] **6단계: 커밋**

```bash
git add questions.js
git commit -m "feat: 세계지리 문항 10개"
```

### 태스크 5: 과학 문항 10개 (`sc-01`~`sc-10`)

**파일:**
- 고치기: `questions.js`

**인터페이스:**
- 만드는 것: `QUESTIONS`에 `category: "과학"` 문항 10개

- [x] **1단계:** 공통 절차 1~2(주제 고르기, 출처 2곳 확인). 과학 수치(두께, 거리, 속도)는 자료마다 근삿값이 달라지기 쉽다. 출처끼리 다르면 수치를 쓰지 않는다(규칙 4).
- [x] **2단계:** 공통 절차 3~4로 `sc-01`~`sc-10`을 `QUESTIONS` 끝에 넣기
- [x] **3단계:** 공통 절차 5의 검수표를 대화에 보고
- [x] **4단계:** 문항 검사 명령 실행. 기대: `[과학]`, `[세계지리]`, `[한국사]` 줄이 없음, `문항 30개, 오류 1건`
- [x] **5단계:** 자체 점검 명령 실행. 기대: `12 / 12 통과`
- [x] **6단계: 커밋**

```bash
git add questions.js
git commit -m "feat: 과학 문항 10개"
```

### 태스크 6: 예술과 문화 문항 10개 (`ac-01`~`ac-10`)와 문항 데이터 점검

**파일:**
- 고치기: `questions.js`, `script.js` (자체 점검 구역)

**인터페이스:**
- 만드는 것: `QUESTIONS`에 `category: "예술과 문화"` 문항 10개. 자체 점검 항목 "문항 데이터: 오류 0건"

- [x] **1단계: `// ===== 자체 점검 =====` 구역 끝에 데이터 점검 항목 추가**

```js
test("문항 데이터: 오류 0건", () => assertEqual(validateQuestions(QUESTIONS), []));
```

- [x] **2단계: 자체 점검을 실행해 실패를 확인**

실행: 자체 점검 명령
기대: `실패 문항 데이터: 오류 0건: … 문항 수 0개(10개여야 함)…`, `12 / 13 통과`, 종료 코드 1

- [x] **3단계:** 공통 절차 1~2(주제 고르기, 출처 2곳 확인)
- [x] **4단계:** 공통 절차 3~4로 `ac-01`~`ac-10`을 `QUESTIONS` 끝에 넣기
- [x] **5단계:** 공통 절차 5의 검수표를 대화에 보고
- [x] **6단계:** 문항 검사 명령 실행. 기대: 오류 줄 없이 `문항 40개, 오류 0건`, 종료 코드 0
- [x] **7단계:** 자체 점검 명령 실행. 기대: `13 / 13 통과`, 종료 코드 0
- [x] **8단계: 커밋**

```bash
git add questions.js script.js
git commit -m "feat: 예술과 문화 문항 10개와 문항 데이터 점검"
```

### 태스크 7: 모드 설정표와 점수 계산

**파일:**
- 고치기: `script.js` (설정, 순수 함수, 자체 점검 구역)

**인터페이스:**
- 만드는 것: `MODES`(키 `practice`, `speed`, `hint`, 각 값은 `{ label, timeLimit, hint, ranked, retry }`), `scoreFor(correct, hintUsed) → 0 | 0.5 | 1`

- [x] **1단계: `// ===== 자체 점검 =====` 구역 끝에 점검 항목 추가**

```js
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
```

- [x] **2단계: 자체 점검을 실행해 실패를 확인**

실행: 자체 점검 명령
기대: 새 항목 2개 실패, `13 / 15 통과`, 종료 코드 1

- [x] **3단계: `// ===== 설정 =====` 구역 끝에 `MODES` 추가**

```js
const MODES = {
  practice: { label: "연습", timeLimit: 0, hint: false, ranked: false, retry: true },
  speed: { label: "스피드", timeLimit: 15, hint: false, ranked: true, retry: false },
  hint: { label: "힌트", timeLimit: 0, hint: true, ranked: true, retry: false }
};
```

- [x] **4단계: `// ===== 순수 함수 =====` 구역 끝에 `scoreFor` 추가**

```js
function scoreFor(correct, hintUsed) {
  if (!correct) return 0;
  return hintUsed ? 0.5 : 1;
}
```

- [x] **5단계: 자체 점검을 실행해 통과를 확인**

실행: 자체 점검 명령
기대: `15 / 15 통과`, 종료 코드 0

- [x] **6단계: 커밋**

```bash
git add script.js
git commit -m "feat: 모드 설정표와 점수 계산"
```

### 태스크 8: 연습 모드 화면 연결 (시작 → 문항 10개 → 결과)

**파일:**
- 고치기: `script.js` (화면, 시작 구역)

**인터페이스:**
- 쓰는 것: `CATEGORIES`, `QUESTIONS_PER_ROUND`, `MODES`, `buildRound`, `validateQuestions`, `scoreFor`, `formatScore`
- 만드는 것:
  - 상태: `state`(PRD 5절의 필드 전부. 1단계에서는 `mode`가 늘 `"practice"`), `brokenCategories`
  - 화면 도우미: `$(id)`, `showScreen(name)`(`name`은 `"start"`, `"quiz"`, `"result"`, `"board"`)
  - 화면 함수: `renderStart()`, `startGame(mode, category)`, `renderQuestion()`, `selectAnswer(i)`(`i`는 고른 보기 위치, `-1`은 시간 초과), `nextQuestion()`, `renderResult()`, `init()`

이 태스크는 화면 코드라 Node 점검 대상이 아니다. 대신 자체 점검이 그대로 통과하는지 확인해서, 화면 코드가 Node 실행을 깨지 않는지 본다. 화면 동작은 1단계 끝에서 사람이 브라우저로 확인한다.

- [x] **1단계: `// ===== 화면 =====` 구역 끝에 추가**

```js
const state = {
  mode: "practice",
  category: null,
  questions: [],
  index: 0,
  score: 0,
  firstScore: 0,
  wrong: [],
  isRetry: false,
  hintUsed: false,
  timerId: null,
  timeLeft: 0
};
let brokenCategories = new Set();

function $(id) {
  return document.getElementById(id);
}

function showScreen(name) {
  for (const section of document.querySelectorAll(".screen")) {
    section.hidden = section.id !== "screen-" + name;
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
    btn.addEventListener("click", () => startGame(state.mode, c));
    box.appendChild(btn);
  }
  showScreen("start");
}

function startGame(mode, category) {
  state.mode = mode;
  state.category = category;
  state.questions = buildRound(QUESTIONS, category);
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
}

function selectAnswer(i) {
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
  result.textContent = correct ? "정답!" : "오답";
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

function renderResult() {
  const mode = MODES[state.mode];
  state.firstScore = state.score;
  $("result-label").textContent = `${state.category} · ${mode.label}`;
  $("result-score").textContent = `${formatScore(state.firstScore)} / ${QUESTIONS_PER_ROUND}`;
  $("result-notice").hidden = mode.ranked;
  showScreen("result");
}
```

- [x] **2단계: `// ===== 시작 =====` 구역 끝에 추가**

```js
function init() {
  const errors = validateQuestions(QUESTIONS);
  for (const e of errors) console.error(`문항 오류 [${e.category}] ${e.id}: ${e.reason}`);
  brokenCategories = new Set(errors.map(e => e.category));
  $("next-button").addEventListener("click", nextQuestion);
  $("again-button").addEventListener("click", () => startGame(state.mode, state.category));
  $("home-button").addEventListener("click", renderStart);
  renderStart();
}

if (typeof document !== "undefined") init();
```

- [x] **3단계: 자체 점검과 문항 검사 실행**

실행: 자체 점검 명령, 문항 검사 명령
기대: `15 / 15 통과`, `문항 40개, 오류 0건`, 둘 다 종료 코드 0

- [x] **4단계: 커밋**

```bash
git add script.js
git commit -m "feat: 연습 모드 화면 연결"
```

- [x] **5단계: 멈추고 1단계 확인을 사람에게 요청**

아래 1단계 완료 기준을 실행자가 점검해 보고한 뒤, "1단계 직접 확인할 항목"을 사람에게 보여 주고 확인을 기다린다.

## 1단계 완료 기준 (실행자가 점검)

- [x] 자체 점검 `15 / 15 통과`, 종료 코드 0
- [x] 문항 검사 `문항 40개, 오류 0건`
- [x] 태스크 3~6의 검수표 40행이 모두 대화에 보고되었고, 모든 문항이 출처 2곳으로 확인되었다
- [x] 파일이 `index.html`, `style.css`, `script.js`, `questions.js` 4개뿐이다(문서 파일 제외)
- [x] `script.js`에 `fetch`, `import`, `export`가 없다

## 1단계 직접 확인할 항목 (사람이 브라우저에서)

`index.html`을 더블클릭해 연다.

1. 제목 "상식 퀴즈"와 카테고리 버튼 4개(한국사, 세계지리, 과학, 예술과 문화)가 보인다.
2. 시작 화면에 "순위표에 기록되지 않음"이 보인다.
3. [한국사]를 누르면 상단에 "한국사 · 연습", "1 / 10", "점수 0"이 보인다.
4. 문제 문장 아래에 번호가 붙은 보기 4개가 보인다.
5. 정답 보기를 누르면 그 보기가 초록색이 되고 "정답!"이 나오며, 상단 점수가 1 오른다.
6. 오답 보기를 누르면 고른 보기는 빨간색, 정답 보기는 초록색이 되고 "오답"이 나오며, 점수는 그대로다.
7. 답을 고른 뒤에는 다른 보기를 눌러도 아무 변화가 없다.
8. 답을 고르면 "정답: …"으로 시작하는 한 줄 해설과 "출처: 기관명" 링크가 나온다.
9. 출처 링크를 누르면 새 탭에서 출처 페이지가 열린다.
10. 10번째 문항에서 답을 고르면 버튼이 [다음]이 아니라 [결과 보기]로 바뀐다.
11. 결과 화면의 점수가 내가 맞힌 개수와 같고(예: `7 / 10`), "순위표에 기록되지 않음"이 보인다.
12. [다시 하기]를 누르면 같은 카테고리로 새 판이 시작되고, 문항 순서나 보기 위치가 앞 판과 다르다.
13. [처음으로]를 누르면 시작 화면으로 돌아간다. 나머지 카테고리 3개도 시작되고, F12 콘솔에 빨간 오류가 없다.

---

# 2단계: 스피드 모드, 힌트 모드, 모드 선택 화면, 틀린 문제 다시 풀기 (태스크 9~12)

**만들 것:**
- 카테고리를 고르면 나오는 모드 선택 화면. 모드 3개와 한 줄 규칙을 보여 주고, [뒤로]로 시작 화면에 돌아간다.
- 스피드 모드의 15초 타이머. 시간이 지나면 오답이고, 해설이 보이는 동안 멈췄다가 [다음]을 누르면 15초부터 다시 센다. 5초 이하에서 빨간색이 된다.
- 힌트 모드. 문항마다 1번, 오답 보기 2개를 지우고, 힌트를 쓰고 맞히면 0.5점이다.
- 연습 모드의 틀린 문제 다시 풀기. 다 맞힐 때까지 반복할 수 있고, 처음 점수는 그대로다.

### 태스크 9: 모드 선택 화면

**파일:**
- 고치기: `index.html`, `style.css`, `script.js` (화면 구역)

**인터페이스:**
- 쓰는 것: `MODES`, `CATEGORIES`, `brokenCategories`, `startGame(mode, category)`
- 만드는 것: `MODES[모드].rule`(한 줄 규칙 문자열), `renderModeSelect(category)`, 화면 이름 `"mode"`(`screen-mode`)

노트 5.5.2.2처럼 시작 화면에서는 카테고리만 고르고, 카테고리를 누르면 모드 선택 화면이 나온다. "순위표에 기록되지 않음"은 시작 화면에서 빼고 연습 모드 버튼으로 옮긴다.

- [x] **1단계: `// ===== 자체 점검 =====` 구역 끝에 점검 항목 추가**

```js
test("MODES: 모드마다 한 줄 규칙 설명이 있음", () => {
  for (const m of Object.values(MODES)) assertEqual(typeof m.rule === "string" && m.rule.length > 0, true, m.label);
});
```

- [x] **2단계: 자체 점검을 실행해 실패를 확인**

실행: 자체 점검 명령
기대: 새 항목 1개 실패, `15 / 16 통과`, 종료 코드 1

- [x] **3단계: `MODES`에 `rule` 추가**

```js
const MODES = {
  practice: { label: "연습", timeLimit: 0, hint: false, ranked: false, retry: true,
    rule: "시간 제한과 힌트 없음, 맞히면 1점, 틀린 문제 다시 풀기" },
  speed: { label: "스피드", timeLimit: 15, hint: false, ranked: true, retry: false,
    rule: "문항마다 15초, 시간이 지나면 오답" },
  hint: { label: "힌트", timeLimit: 0, hint: true, ranked: true, retry: false,
    rule: "문항마다 힌트 1번(오답 2개 지우기), 힌트를 쓰고 맞히면 0.5점" }
};
```

- [x] **4단계: `index.html`의 시작 화면을 바꾸고 모드 선택 화면 추가**

시작 화면에서 `<p id="start-notice" …>순위표에 기록되지 않음</p>` 줄을 지운다. 시작 화면 `</section>` 바로 아래에 추가한다.

```html

    <section id="screen-mode" class="screen" hidden>
      <h1 id="mode-title"></h1>
      <div id="mode-list" class="mode-list"></div>
      <button id="mode-back-button" type="button">뒤로</button>
    </section>
```

- [x] **5단계: `style.css` 끝에 추가**

```css
.mode-list { display: grid; gap: 8px; margin-bottom: 16px; }
.mode-option { display: flex; flex-direction: column; gap: 4px; text-align: left; }
.mode-name { font-weight: 700; }
.mode-rule { color: var(--muted); font-size: 0.9rem; }
.mode-notice { color: var(--muted); font-size: 0.85rem; }
```

- [x] **6단계: `renderStart`를 고치고 `renderModeSelect` 추가**

```js
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
```

`init` 함수에서 `$("home-button").addEventListener("click", renderStart);` 바로 아래에 추가한다.

```js
  $("mode-back-button").addEventListener("click", renderStart);
```

- [x] **7단계: 자체 점검 실행**

실행: 자체 점검 명령
기대: `16 / 16 통과`, 종료 코드 0

- [x] **8단계: 커밋**

```bash
git add index.html style.css script.js
git commit -m "feat: 모드 선택 화면"
```

### 태스크 10: 스피드 모드 타이머

**파일:**
- 고치기: `index.html`, `style.css`, `script.js` (화면 구역)

**인터페이스:**
- 쓰는 것: `MODES[mode].timeLimit`, `state.timerId`, `state.timeLeft`, `selectAnswer(-1)`
- 만드는 것: `URGENT_SECONDS`(5), `isUrgent(timeLeft) → 5초 이하이면 true`, `startTimer()`, `stopTimer()`, `updateTimer()`, `onTimeout()`

- [x] **0단계: 5초 경고를 점검 항목부터 추가**

`// ===== 자체 점검 =====` 구역 끝에 추가하고, 자체 점검이 `16 / 17 통과`로 실패하는지 확인한다.

```js
test("isUrgent: 5초 이하에서만 경고", () => {
  assertEqual([15, 6, 5, 1, 0].map(isUrgent), [false, false, true, true, true]);
});
```

`// ===== 설정 =====` 구역 끝(`MODES` 아래)과 `// ===== 순수 함수 =====` 구역 끝에 각각 추가하고, `17 / 17 통과`를 확인한다.

```js
const URGENT_SECONDS = 5;
```

```js
function isUrgent(timeLeft) {
  return timeLeft <= URGENT_SECONDS;
}
```

- [x] **1단계: `index.html`의 문항 화면에서 `<div class="quiz-header">…</div>` 바로 아래에 추가**

```html
      <div id="timer" class="timer" hidden>
        <span id="timer-text"></span>
        <div class="timer-bar"><div id="timer-fill" class="timer-fill"></div></div>
      </div>
```

- [x] **2단계: `style.css` 끝에 추가**

```css
.timer { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.timer-bar { flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
.timer-fill { height: 100%; background: var(--primary); transition: width 1s linear; }
.timer.urgent #timer-text { color: var(--wrong); font-weight: 700; }
.timer.urgent .timer-fill { background: var(--wrong); }
```

- [x] **3단계: `script.js`의 `nextQuestion` 함수 바로 아래에 타이머 함수 추가**

```js
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
```

- [x] **4단계: `renderQuestion` 함수의 마지막 줄 `$("quiz-feedback").hidden = true;` 바로 아래에 추가**

```js
  $("timer").hidden = mode.timeLimit === 0;
  if (mode.timeLimit > 0) startTimer();
```

- [x] **5단계: `selectAnswer` 함수를 두 군데 고치기**

함수 첫 줄(`const q = state.questions[state.index];`) 바로 위에 추가한다. 답을 고르거나 시간이 다 되면 타이머가 멈춘다.

```js
  stopTimer();
```

그리고 아래 줄을 바꾼다.

```js
  result.textContent = correct ? "정답!" : "오답";
```

바꿀 내용:

```js
  result.textContent = correct ? "정답!" : (i === -1 ? "시간 초과 · 오답" : "오답");
```

- [x] **6단계: 자체 점검 실행**

실행: 자체 점검 명령
기대: `17 / 17 통과`, 종료 코드 0

- [x] **7단계: 커밋**

```bash
git add index.html style.css script.js
git commit -m "feat: 스피드 모드 15초 타이머"
```

### 태스크 11: 힌트 모드

**파일:**
- 고치기: `index.html`, `style.css`, `script.js` (순수 함수, 자체 점검, 화면, 시작 구역)

**인터페이스:**
- 쓰는 것: `shuffle`, `scoreFor(correct, state.hintUsed)`, `MODES[mode].hint`
- 만드는 것: `pickHintRemovals(answer, rand) → 지울 오답 위치 2개(오름차순)`, `useHint()`

- [x] **1단계: `// ===== 자체 점검 =====` 구역 끝에 점검 항목 추가**

```js
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
```

- [x] **2단계: 자체 점검을 실행해 실패를 확인**

실행: 자체 점검 명령
기대: 새 항목 2개 실패, `17 / 19 통과`, 종료 코드 1

- [x] **3단계: `// ===== 순수 함수 =====` 구역 끝에 추가**

```js
function pickHintRemovals(answer, rand = Math.random) {
  const wrong = [0, 1, 2, 3].filter(i => i !== answer);
  return shuffle(wrong, rand).slice(0, 2).sort((a, b) => a - b);
}
```

- [x] **4단계: 자체 점검을 실행해 통과를 확인**

실행: 자체 점검 명령
기대: `19 / 19 통과`, 종료 코드 0

- [x] **5단계: `index.html`의 문항 화면에서 `<p id="quiz-question" class="question"></p>` 바로 아래에 추가**

```html
      <button id="hint-button" type="button" class="hint-button" hidden>힌트 (오답 2개 지우기)</button>
```

- [x] **6단계: `style.css` 끝에 추가**

```css
.hint-button { margin-bottom: 12px; }
.choice.removed { display: none; }
```

- [x] **7단계: `script.js`의 `onTimeout` 함수 바로 아래에 `useHint` 추가**

```js
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
```

- [x] **8단계: `renderQuestion`에서 `$("quiz-feedback").hidden = true;` 바로 아래(타이머 두 줄 위)에 추가**

```js
  $("hint-button").hidden = !mode.hint;
  $("hint-button").disabled = false;
```

- [x] **9단계: `selectAnswer`에서 `stopTimer();` 바로 아래에 추가 (답을 고른 뒤 힌트 버튼을 끈다)**

```js
  $("hint-button").disabled = true;
```

- [x] **10단계: `init` 함수에서 `$("next-button").addEventListener("click", nextQuestion);` 바로 아래에 추가**

```js
  $("hint-button").addEventListener("click", useHint);
```

- [x] **11단계: 자체 점검 실행**

실행: 자체 점검 명령
기대: `19 / 19 통과`, 종료 코드 0

- [x] **12단계: 커밋**

```bash
git add index.html style.css script.js
git commit -m "feat: 힌트 모드"
```

### 태스크 12: 틀린 문제 다시 풀기 (연습 모드)

**파일:**
- 고치기: `index.html`, `script.js` (자체 점검, 화면, 시작 구역)

**인터페이스:**
- 쓰는 것: `state.wrong`, `state.firstScore`, `state.isRetry`, `shuffle`, `prepareQuestion`, `MODES[mode].retry`
- 만드는 것: `startRetry()`. `renderResult()`는 다시 푼 판이면 `state.firstScore`를 바꾸지 않는다.

- [x] **1단계: `// ===== 자체 점검 =====` 구역 끝에 점검 항목 추가**

다시 풀기는 이미 섞인 문항을 한 번 더 섞는다. 두 번 섞어도 정답이 유지되는지 확인한다. 태스크 2의 구현이 이미 이 조건을 만족하므로 바로 통과하는 것이 정상이다.

```js
test("prepareQuestion: 두 번 적용해도 정답 보기가 같음", () => {
  const q = { id: "x", choices: ["A", "B", "C", "D"], answer: 2 };
  const p = prepareQuestion(prepareQuestion(q), Math.random);
  assertEqual(p.choices[p.answer], "C");
});
```

- [x] **2단계: 자체 점검 실행**

실행: 자체 점검 명령
기대: `20 / 20 통과`, 종료 코드 0

- [x] **3단계: `index.html`의 결과 화면에서 `<p id="result-score" class="big-score"></p>` 바로 아래에 추가**

```html
      <p id="retry-summary" hidden></p>
```

그리고 `<div class="button-row">` 바로 아래(`다시 하기` 버튼 위)에 추가한다.

```html
        <button id="retry-button" type="button" hidden>틀린 문제 다시 풀기</button>
```

- [x] **4단계: `script.js`의 `useHint` 함수 바로 아래에 `startRetry` 추가**

```js
function startRetry() {
  state.questions = shuffle(state.wrong).map(q => prepareQuestion(q));
  state.wrong = [];
  state.index = 0;
  state.score = 0;
  state.isRetry = true;
  showScreen("quiz");
  renderQuestion();
}
```

- [x] **5단계: `renderResult` 함수 전체를 아래로 바꾸기**

```js
function renderResult() {
  const mode = MODES[state.mode];
  if (!state.isRetry) state.firstScore = state.score;
  $("result-label").textContent = `${state.category} · ${mode.label}`;
  $("result-score").textContent = `${formatScore(state.firstScore)} / ${QUESTIONS_PER_ROUND}`;
  $("result-notice").hidden = mode.ranked;
  $("retry-summary").hidden = !state.isRetry;
  $("retry-summary").textContent = `다시 푼 결과 ${formatScore(state.score)} / ${state.questions.length}`;
  $("retry-button").hidden = !(mode.retry && state.wrong.length > 0);
  showScreen("result");
}
```

- [x] **6단계: `init` 함수에서 `$("hint-button").addEventListener("click", useHint);` 바로 아래에 추가**

```js
  $("retry-button").addEventListener("click", startRetry);
```

- [x] **7단계: 자체 점검과 문항 검사 실행**

실행: 자체 점검 명령, 문항 검사 명령
기대: `20 / 20 통과`, `문항 40개, 오류 0건`, 둘 다 종료 코드 0

- [x] **8단계: 커밋**

```bash
git add index.html script.js
git commit -m "feat: 연습 모드 틀린 문제 다시 풀기"
```

- [x] **9단계: 멈추고 2단계 확인을 사람에게 요청**

아래 2단계 완료 기준을 점검해 보고한 뒤, "2단계 직접 확인할 항목"을 사람에게 보여 주고 확인을 기다린다.

## 2단계 완료 기준 (실행자가 점검)

- [x] 자체 점검 `20 / 20 통과`, 종료 코드 0
- [x] 문항 검사 `문항 40개, 오류 0건`
- [x] `MODES`의 값이 PRD 2.1 표와 같다(자체 점검 "MODES: 모드별 규칙" 통과)
- [x] 힌트로 지우는 보기에 정답이 들어가지 않는다(자체 점검 "pickHintRemovals" 통과)
- [x] 파일이 여전히 4개뿐이다

## 2단계 직접 확인할 항목 (사람이 브라우저에서)

`index.html`을 새로고침한다.

1. 시작 화면에는 카테고리 버튼 4개만 있고 "순위표에 기록되지 않음" 문구가 없다.
2. 카테고리(예: [과학])를 누르면 "과학 · 모드를 고르세요"와 모드 버튼 3개(연습, 스피드, 힌트)가 나오고, 버튼마다 한 줄 규칙이 있다. "순위표에 기록되지 않음"은 연습 버튼에만 있고, [뒤로]를 누르면 시작 화면으로 돌아간다.
3. [스피드]를 누르면 상단에 "… · 스피드"가 보이고, "15초"와 막대가 나타난다.
4. 숫자가 1초에 1씩 줄고 막대도 함께 줄어들며, 5초 이하가 되면 숫자와 막대가 빨간색으로 바뀐다.
5. 답을 고르지 않고 기다리면 0초가 될 때 "시간 초과 · 오답"이 나오고, 정답 보기가 초록색으로 표시된다.
6. 해설이 보이는 동안에는 몇 초를 기다려도 남은 초가 줄지 않는다.
7. [다음]을 누르면 다음 문항에서 다시 "15초"부터 센다.
8. 시간 안에 정답을 고르면 타이머가 그 자리에서 멈추고 점수가 1 오른다.
9. 스피드 모드 결과 화면에는 "순위표에 기록되지 않음"이 없다.
10. [힌트] 모드에서는 문항마다 [힌트 (오답 2개 지우기)] 버튼이 보이고, 연습·스피드 모드에서는 보이지 않는다.
11. [힌트]를 누르면 보기 2개가 사라지고 남은 2개 중 하나가 정답이다.
12. 힌트를 한 번 누르면 그 문항에서는 버튼이 꺼져 다시 누를 수 없다.
13. 힌트를 쓰고 정답을 고르면 상단 점수가 0.5 오른다(예: "점수 0.5").
14. 힌트를 쓰지 않고 정답을 고르면 1 오른다. 다음 문항에서는 힌트 버튼이 다시 켜진다.
15. 답을 고른 뒤에는 힌트 버튼이 꺼진다. 결과 점수는 `8.5 / 10`처럼 소수 한 자리로 나온다.
16. 연습 모드에서 1개 이상 틀리면 결과 화면에 [틀린 문제 다시 풀기]가 보이고, 10개 다 맞히면 보이지 않는다.
17. [틀린 문제 다시 풀기]를 누르면 다음과 같이 동작한다.
    - 틀린 문항만 나오고 상단에 "… · 연습 · 다시 풀기"가 보인다.
    - 결과 화면의 큰 점수는 처음 판 점수 그대로이고, "다시 푼 결과 n / m"이 따로 나온다.
    - 또 틀리면 버튼이 다시 나오고, 다 맞히면 사라진다.

---

# 3단계: 점수 저장과 순위표 (태스크 13~14)

**만들 것:**
- 스피드·힌트 모드 결과 화면에서 이름을 입력해 기록을 `localStorage`에 저장한다.
- 순위표 화면에서 모드×카테고리 표 8개를 골라 상위 5건을 본다.
- 같은 점수는 먼저 세운 기록이 위에 오고, 저장된 값이 깨져 있어도 앱이 멈추지 않는다.

### 태스크 13: 순위표 저장 로직

**파일:**
- 고치기: `script.js` (순위표, 자체 점검 구역)

**인터페이스:**
- 만드는 것:
  - 상수: `BOARD_KEY`(`"quizLeaderboard"`), `BOARD_SIZE`(5)
  - `boardKey(mode, category) → "speed|한국사"`
  - `parseBoard(text) → { [키]: [{ name, score, date }] }`. 깨진 값이면 `{}`이다.
  - `insertRecord(list, record) → { list, rank }`. `rank`는 1~5이고, 상위 5건에 못 들면 0이다.
  - `cleanName(name) → 앞뒤 공백을 지운 최대 10자`. 비어 있으면 `"익명"`이다.
  - `todayString(date) → "YYYY-MM-DD"`
  - `loadBoard() → 순위표 객체`
  - `saveRecord(mode, category, name, score) → rank`. 저장할 수 없으면 `null`이다.

- [x] **1단계: `// ===== 자체 점검 =====` 구역 끝에 점검 항목 추가**

```js
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
```

`saveRecord` 점검은 Node 안에 가짜 `localStorage`를 잠깐 만들고, 끝나면 지운다. 자체 점검은 Node에서만 실행하므로 브라우저의 실제 순위표에는 영향이 없다.

- [x] **2단계: 자체 점검을 실행해 실패를 확인**

실행: 자체 점검 명령
기대: 새 항목 10개 실패, `20 / 30 통과`, 종료 코드 1

- [x] **3단계: `// ===== 순위표 =====` 구역 끝에 추가**

```js
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
```

같은 점수에서 먼저 세운 기록이 위에 오는 이유는 다음과 같다. `insertRecord`는 새 기록을 "자기보다 점수가 **낮은** 첫 기록" 앞에 넣으므로, 같은 점수의 기존 기록들 뒤에 들어간다. 깨진 값은 `parseBoard`가 빈 순위표로 바꾸고, 다음 저장 때 올바른 값으로 덮어쓴다.

- [x] **4단계: 자체 점검을 실행해 통과를 확인**

실행: 자체 점검 명령
기대: `30 / 30 통과`, 종료 코드 0

- [x] **5단계: 커밋**

```bash
git add script.js
git commit -m "feat: 순위표 저장 로직"
```

### 태스크 14: 기록 저장 화면과 순위표 화면

**파일:**
- 고치기: `index.html`, `style.css`, `script.js` (화면, 시작 구역)

**인터페이스:**
- 쓰는 것: `saveRecord`, `loadBoard`, `boardKey`, `MODES`, `CATEGORIES`, `formatScore`, `state.firstScore`
- 만드는 것: `renderOptionButtons(containerId, options, selected, onPick)`(`options`는 `[값, 표시 이름]` 쌍의 배열, 고른 버튼에 `selected` 클래스), `boardView`(`{ mode, category }`, 순위표 화면에서 고른 표), `onSaveRecord(event)`, `renderLeaderboard()`

2단계에서 모드 선택을 별도 화면으로 바꾸면서 `renderOptionButtons`를 쓰지 않게 되었다. 순위표 화면의 모드·카테고리 고르기에 필요하므로 이 태스크에서 만든다.

- [x] **1단계: `index.html` 세 군데 고치기**

시작 화면의 `<div id="category-buttons" class="button-grid"></div>` 바로 아래에 추가한다.

```html
      <button id="board-button" type="button">순위표</button>
```

결과 화면의 `<p id="result-notice" class="notice">순위표에 기록되지 않음</p>` 바로 아래에 추가한다.

```html
      <form id="save-form" class="save-form" hidden>
        <label for="name-input">이름(별명)</label>
        <input id="name-input" maxlength="10" placeholder="비워 두면 익명">
        <button id="save-button" type="submit">기록 저장</button>
      </form>
      <p id="save-message" hidden></p>
```

결과 화면 `</section>` 바로 아래(`</main>` 위)에 순위표 화면을 추가한다.

```html

    <section id="screen-board" class="screen" hidden>
      <h1>순위표</h1>
      <div id="board-modes" class="button-grid"></div>
      <div id="board-categories" class="button-grid"></div>
      <table class="board-table">
        <thead><tr><th>순위</th><th>이름</th><th>점수</th><th>날짜</th></tr></thead>
        <tbody id="board-body"></tbody>
      </table>
      <button id="board-home-button" type="button">처음으로</button>
    </section>
```

- [x] **2단계: `style.css` 끝에 추가**

```css
.save-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 16px 0; }
.save-form input { font: inherit; padding: 9px 10px; border: 1px solid var(--border); border-radius: 8px; }
.board-table { width: 100%; border-collapse: collapse; margin: 12px 0 16px; }
.board-table th, .board-table td { padding: 8px; border-bottom: 1px solid var(--border); text-align: center; }
button.selected { background: var(--primary); border-color: var(--primary); color: #fff; }
```

- [x] **3단계: `script.js`의 `let brokenCategories = new Set();` 바로 위에 `boardView`를, `renderStart` 함수 바로 위에 `renderOptionButtons`를 추가**

```js
const boardView = { mode: "speed", category: CATEGORIES[0] };
```

```js
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
```

- [x] **4단계: `renderResult` 함수 전체를 아래로 바꾸기**

```js
function renderResult() {
  const mode = MODES[state.mode];
  if (!state.isRetry) state.firstScore = state.score;
  $("result-label").textContent = `${state.category} · ${mode.label}`;
  $("result-score").textContent = `${formatScore(state.firstScore)} / ${QUESTIONS_PER_ROUND}`;
  $("result-notice").hidden = mode.ranked;
  $("retry-summary").hidden = !state.isRetry;
  $("retry-summary").textContent = `다시 푼 결과 ${formatScore(state.score)} / ${state.questions.length}`;
  $("retry-button").hidden = !(mode.retry && state.wrong.length > 0);
  $("save-form").hidden = !mode.ranked;
  $("save-button").disabled = false;
  $("save-message").hidden = true;
  showScreen("result");
}
```

- [x] **5단계: `renderResult` 함수 바로 아래에 추가**

```js
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
```

이름은 `textContent`로만 넣는다. `innerHTML`을 쓰면 이름 칸에 입력한 HTML이 화면에서 실행될 수 있다. 기록을 저장하면 [기록 저장] 버튼을 꺼서, 같은 판을 두 번 저장하지 못하게 한다.

- [x] **6단계: `init` 함수에서 `$("home-button").addEventListener("click", renderStart);` 바로 아래에 추가**

```js
  $("save-form").addEventListener("submit", onSaveRecord);
  $("board-button").addEventListener("click", renderLeaderboard);
  $("board-home-button").addEventListener("click", renderStart);
```

- [x] **7단계: 자체 점검과 문항 검사 실행**

실행: 자체 점검 명령, 문항 검사 명령
기대: `30 / 30 통과`, `문항 40개, 오류 0건`, 둘 다 종료 코드 0

- [x] **8단계: 커밋**

```bash
git add index.html style.css script.js
git commit -m "feat: 기록 저장과 순위표 화면"
```

- [x] **9단계: 멈추고 3단계 확인을 사람에게 요청**

아래 3단계 완료 기준을 점검해 보고한 뒤, "3단계 직접 확인할 항목"을 사람에게 보여 주고 확인을 기다린다.

## 3단계 완료 기준 (실행자가 점검)

- [x] 자체 점검 `30 / 30 통과`, 종료 코드 0
- [x] 문항 검사 `문항 40개, 오류 0건`
- [x] 같은 점수 처리, 5건 초과분 삭제, 깨진 값 처리, 저장 실패 처리를 자체 점검이 모두 확인한다(`insertRecord`, `parseBoard`, `saveRecord` 항목 통과)
- [x] 순위표에 이름을 넣을 때 `innerHTML`을 쓰지 않는다
- [x] 파일이 여전히 4개뿐이다

## 3단계 직접 확인할 항목 (사람이 브라우저에서)

`index.html`을 새로고침한다.

1. 시작 화면(카테고리 버튼 아래)에 [순위표] 버튼이 있다.
2. 기록이 없을 때 [순위표]를 누르면 "아직 기록이 없습니다"가 보이고, [처음으로]로 돌아갈 수 있다.
3. 스피드 모드로 한 판을 끝내면 결과 화면에 이름 입력칸과 [기록 저장]이 보인다. 연습 모드 결과 화면에는 보이지 않는다.
4. 이름을 넣고 [기록 저장]을 누르면 "1위로 기록했습니다"가 나오고 버튼이 꺼진다.
5. 순위표에서 [스피드]와 방금 푼 카테고리를 고르면 내 이름, 점수, 오늘 날짜(YYYY-MM-DD)가 1위로 보인다.
6. 이름을 비우고 저장하면 순위표에 "익명"으로 나온다.
7. 같은 점수를 두 번 저장하면 먼저 저장한 기록이 위에 있다.
8. 같은 표에 6번 이상 저장하면 5건만 남는다. 5위보다 낮은 점수를 저장하면 "상위 5건에 들지 못했습니다"가 나온다.
9. 힌트 모드 기록은 [힌트] 표에만 나오고 스피드 표에는 나오지 않는다. 0.5점이 섞인 점수는 `7.5`처럼 보인다.
10. 새로고침하거나 브라우저를 닫았다가 다시 열어도 순위표가 그대로 남아 있다.
11. 저장된 값을 깨뜨려도 앱이 멈추지 않는다.
    - F12 → Application(애플리케이션) → Local Storage에서 `quizLeaderboard` 값을 `깨진값`으로 바꾸고 새로고침한다.
    - 앱이 멈추지 않고, 순위표는 "아직 기록이 없습니다"로 보인다.
    - 새 기록을 저장하면 다시 정상으로 쌓인다.

---

## PRD 대응표

| PRD 항목 | 구현 태스크 |
|---|---|
| 1 개요: 카테고리 4개 × 10문제, 파일 4개, 서버 없음 | 1, 2, 3~6 |
| 2.1 연습: 1점, 순위표 미기록과 안내 문구 | 1(안내 문구), 7, 8, 9 |
| 2.1 연습: 틀린 문제 다시 풀기, 처음 점수 유지 | 12 |
| 2.1 스피드: 15초, 시간 초과는 오답, 해설 중 정지, [다음]에서 재시작 | 10 |
| 2.1 힌트: 문항마다 1번, 오답 2개 제거, 0.5점, 답 고른 뒤 비활성 | 7, 11 |
| 2.1 틀리면 모든 모드 0점 | 7 |
| 2.2 해설 출처(기관명과 URL), 60자 이내 한 줄 / CLAUDE.md 규칙 10개 | 2(검사), 3~6(작성 절차와 검수표) |
| 3.1 시작 화면: 카테고리, [순위표] / 3.1.1 모드 선택 화면: 모드별 한 줄 규칙, 연습 모드 안내 문구, [뒤로] | 8, 9, 14 |
| 3.2 문항 화면: 판마다 섞기, 상단 정보, 보기 잠금과 색, 해설·출처, [다음]/[결과 보기] | 2, 8 |
| 3.2 스피드 타이머 막대, 힌트 버튼 | 10, 11 |
| 3.3 결과 화면: 점수 형식, 안내 문구, 다시 풀기, [다시 하기]/[처음으로] | 8, 12 |
| 3.3 결과 화면: 이름 입력, 기록 저장, 순위 알림 | 14 |
| 3.4 순위표 화면: 표 8개, 상위 5건, 기록 없음 표시 | 13, 14 |
| 4.1 문항 데이터 형식, `file://`용 전역 상수 | 1, 3~6 |
| 4.2 순위표 저장: 키 하나, 정렬, 같은 점수, 상위 5건, 이름 규칙, 깨진 값과 저장 실패 처리 | 13, 14 |
| 5 `script.js` 구조: `state`, `MODES`, 함수 묶음, 열 때 `validateQuestions` 실행과 카테고리 버튼 끄기 | 1, 2, 7, 8, 9~14 |
| 6 구현 단계와 완료 기준 | 각 단계 끝의 완료 기준과 직접 확인할 항목 |
| 7 검증 방법: 자동 검사, 규칙 점검, 수동 확인 | 점검 명령, 태스크 3~6 검수표, 직접 확인할 항목 |
| 8 범위 밖(난이도 구분 등) | 구현하지 않음 |
