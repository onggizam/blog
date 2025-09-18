import { STATE } from "./state.js";
import { t } from "./i18n.js";
import {
  print,
  printPlain,
  printSuggestions,
  longestCommonPrefix,
} from "./utils.js";
import { sceneSwitch, setTheme, setLang, showBlogPost } from "./ui.js";
import {
  loadManifest,
  renderPostList,
  openPost,
  getMdFilenames,
} from "./posts.js";

/* =========================
   Pipeline-enabled Terminal
   - supports: |
   - stream commands: ls, grep, head, tail, sort, uniq, wc -l, cut -f
   - open: accepts stdin (first line) if arg missing
   ========================= */

/* ======= Commands (stream-friendly) ======= */
const COMMANDS = {
  /* help */
  help(arg, stdin) {
    const text = t(STATE, "help");
    if (stdin) return text.split("\n");
    print(text);
  },

  /* ls: filenames only / -al / -topic */
  ls(opt, stdin) {
    if (STATE.posts.length === 0) {
      const msg = t(STATE, "no_posts");
      if (stdin) return [msg];
      print(msg);
      return;
    }
    if (opt && !["-al", "-topic"].includes(opt)) {
      if (stdin) return [t(STATE, "bad_arg")];
      print(t(STATE, "bad_arg"), "error");
      return;
    }
    const showAll = opt === "-al";
    const showTopic = opt === "-topic";

    const lines = STATE.posts.map((p) => {
      const fname = `${p.slug}.md`;
      if (showAll) {
        const size = String((p.title || p.slug).length * 32).padStart(6, " ");
        const date = (p.date || "").padEnd(12, " ");
        return `-rw-r--r-- 1 ${STATE.user} ${STATE.user} ${size} ${date} ${fname}`;
      } else if (showTopic) {
        const tags = (p.tags || []).join(", ") || "-";
        return `${fname}\t[${tags}]`;
      } else {
        return fname;
      }
    });

    if (stdin) return lines;
    lines.forEach((l) =>
      print(
        `<span class="file">${l.replace(/\t.*/, "")}</span>${
          l.includes("\t") ? l.slice(l.indexOf("\t")) : ""
        }`
      )
    );
  },

  /* open: arg가 없고 stdin이 있으면 첫 줄을 파일명으로 사용 */
  async open(arg, stdin) {
    let targetArg = arg?.trim();
    if (
      (!targetArg || targetArg.length === 0) &&
      Array.isArray(stdin) &&
      stdin.length
    ) {
      targetArg = String(stdin[0]).trim();
    }
    if (!targetArg) {
      const msg = t(STATE, "bad_arg");
      if (stdin) return [msg];
      print(msg, "error");
      return;
    }
    const slug = targetArg.endsWith(".md") ? targetArg.slice(0, -3) : targetArg;
    let found = STATE.indexBySlug.get(slug);
    try {
      await openPost(found ? found.slug : slug);
      setTheme("blog");
      showBlogPost();
      if (!stdin) print(t(STATE, "opened", `${slug}.md`), "ok");
    } catch {
      const msg = t(STATE, "not_found");
      if (stdin) return [msg];
      print(msg, "error");
    }
  },

  /* theme / translate / clear : 파이프라인에서는 부가효과만 내고 line pass-through */
  theme(arg, stdin) {
    if (!arg) {
      if (stdin) return ["bad arg"];
      print(t(STATE, "bad_arg"), "error");
      return;
    }
    const key = arg.toLowerCase();
    if (key === "terminal" || key === "blog") setTheme(key);
    else {
      if (stdin) return [t(STATE, "bad_arg")];
      print(t(STATE, "bad_arg"), "error");
    }
    return stdin || [];
  },
  translate(arg, stdin) {
    if (!arg) {
      if (stdin) return ["bad arg"];
      print(t(STATE, "bad_arg"), "error");
      return;
    }
    setLang(arg.toLowerCase() === "en" ? "en" : "kr");
    return stdin || [];
  },
  clear(arg, stdin) {
    document.getElementById("terminal-output").innerHTML = "";
    return [];
  },

  /* ---- Stream utilities ---- */

  /* grep [-i] <pattern> */
  grep(args, stdin) {
    const parts = (args || "").trim().split(/\s+/).filter(Boolean);
    let icase = false,
      pattern = "";
    if (parts[0] === "-i") {
      icase = true;
      pattern = parts.slice(1).join(" ");
    } else {
      pattern = parts.join(" ");
    }
    if (!pattern) {
      return stdin || [];
    }
    const re = new RegExp(pattern, icase ? "i" : "");
    const src = stdin || [];
    return src.filter((line) => re.test(String(line)));
  },

  /* head [-n N] */
  head(args, stdin) {
    const m = /-n\s+(\d+)/.exec(args || "");
    const n = m ? Math.max(0, parseInt(m[1], 10)) : 10;
    const src = stdin || [];
    return src.slice(0, n);
  },

  /* tail [-n N] */
  tail(args, stdin) {
    const m = /-n\s+(\d+)/.exec(args || "");
    const n = m ? Math.max(0, parseInt(m[1], 10)) : 10;
    const src = stdin || [];
    return src.slice(Math.max(0, src.length - n));
  },

  /* sort (문자열 기본 정렬) */
  sort(args, stdin) {
    const src = (stdin || []).slice();
    return src.sort((a, b) => String(a).localeCompare(String(b)));
  },

  /* uniq (인접 중복 제거) */
  uniq(args, stdin) {
    const src = stdin || [];
    const out = [];
    let prev;
    for (const line of src) {
      if (line !== prev) out.push(line);
      prev = line;
    }
    return out;
  },

  /* wc -l (라인 수) */
  wc(args, stdin) {
    if (/\-l\b/.test(args || "")) {
      return [String((stdin || []).length)];
    }
    // 기타 옵션은 미구현: 전체 길이 리포트
    const chars = (stdin || []).join("\n");
    return [
      `${(stdin || []).length} ${chars.split(/\s+/).filter(Boolean).length} ${
        chars.length
      }`,
    ];
  },

  /* cut -f N (탭 구분) */
  cut(args, stdin) {
    const m = /-f\s+(\d+)/.exec(args || "");
    const f = m ? Math.max(1, parseInt(m[1], 10)) : 1;
    const idx = f - 1;
    const src = stdin || [];
    return src.map((line) => {
      const parts = String(line).split("\t");
      return parts[idx] ?? "";
    });
  },
};

/* ======= Pipeline runner ======= */
async function runPipeline(cmdline) {
  const stages = cmdline
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (stages.length === 0) return;

  const multi = stages.length > 1;
  let stdin = multi ? [] : null;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const [cmd, ...rest] = stage.split(/\s+/);
    const args = rest.join(" ");
    const fn = COMMANDS[cmd];
    if (!fn) {
      if (!multi) {
        print(`command not found: ${cmd}`, "error");
        return;
      }
      stdin = (stdin || []).map((x) => String(x));
      continue;
    }
    const res = await fn(args, stdin);
    stdin = typeof res === "undefined" ? stdin : res;
  }

  if (multi && Array.isArray(stdin)) {
    stdin.forEach((line) => print(escapeForTerminal(line)));
  }
}

function escapeForTerminal(line) {
  return String(line).replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])
  );
}

const AC = {
  commands: [
    "help",
    "ls",
    "open",
    "theme",
    "translate",
    "clear",
    "grep",
    "head",
    "tail",
    "sort",
    "uniq",
    "wc",
    "cut",
  ],
  optionsFor(cmd) {
    if (cmd === "ls") return ["-al", "-topic"];
    if (cmd === "theme") return ["terminal", "blog"];
    if (cmd === "translate") return ["en", "kr"];
    if (cmd === "grep") return ["-i"];
    if (cmd === "head" || cmd === "tail") return ["-n 10", "-n 20", "-n 50"];
    if (cmd === "wc") return ["-l"];
    if (cmd === "cut") return ["-f 1", "-f 2"];
    if (cmd === "open") {
      return Array.from(new Set(getMdFilenames()));
    }
    return [];
  },
};
function computeCandidates(inputValue, caretPos) {
  // 파이프 기준 현재 스테이지만 추출
  const upToCaret = inputValue.slice(0, caretPos);
  const lastBar = upToCaret.lastIndexOf("|");
  const stageStr = upToCaret.slice(lastBar + 1);
  const stageOffset = lastBar + 1;

  const parts = stageStr.split(/\s+/);
  const isAtBoundary = /\s$/.test(stageStr);
  const tokenCount = parts.filter((x) => x.length > 0).length;
  let current = isAtBoundary ? "" : parts[parts.length - 1] || "";
  const firstToken = parts[0] || "";
  let pool =
    tokenCount <= 1 && !isAtBoundary
      ? AC.commands
      : AC.optionsFor(firstToken) || [];

  const cand = pool
    .filter((x) => x.toLowerCase().startsWith(current.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  const replaceStart = stageOffset + (stageStr.length - current.length);
  return { candidates: cand, fragment: current, replaceStart };
}
function applyCompletion(input, replaceStart, fragment, text) {
  const v = input.value;
  const before = v.slice(0, replaceStart);
  const after = v.slice(replaceStart + fragment.length);
  input.value = before + text + after;
  const newPos = (before + text).length;
  input.setSelectionRange(newPos, newPos);
  updateFakeCaret();
}
function resetAC() {
  STATE.ac = { base: "", candidates: [], idx: -1, lastTs: 0 };
}

/* ======= Fake Caret ======= */
const mirror = createMirror();
function createMirror() {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.left = "-9999px";
  el.style.top = "0";
  el.style.whiteSpace = "pre";
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  document.body.appendChild(el);
  return el;
}
function mirrorTextWidth(input, text) {
  const s = getComputedStyle(input);
  mirror.style.fontFamily = s.fontFamily;
  mirror.style.fontSize = s.fontSize;
  mirror.style.letterSpacing = s.letterSpacing;
  mirror.style.fontWeight = s.fontWeight;
  mirror.style.padding = s.padding;
  mirror.style.border = "0";
  mirror.style.whiteSpace = "pre";
  mirror.textContent = text;
  return mirror.offsetWidth;
}
function ensureCaret(line) {
  let caret = line.querySelector(".fake-caret");
  if (!caret) {
    caret = document.createElement("span");
    caret.className = "fake-caret";
    line.appendChild(caret);
  }
  return caret;
}
export function updateFakeCaret() {
  const input = STATE.activeInput;
  if (!input) return;
  const line = input.parentElement;
  const caret = ensureCaret(line);
  STATE.activeCaret = caret;
  const val = input.value;
  const pos = input.selectionStart ?? val.length;
  const x = input.offsetLeft + mirrorTextWidth(input, val.slice(0, pos));
  const y = input.offsetTop + input.offsetHeight / 2;
  caret.style.left = `${x}px`;
  caret.style.top = `${y}px`;
  caret.style.height = `${Math.max(16, input.offsetHeight * 0.9)}px`;
}

/* ======= Prompt lines ======= */
export function newPromptLine(initialText = "") {
  const outEl = document.getElementById("terminal-output");
  const line = document.createElement("div");
  line.className = "prompt-line";
  const ps1 = document.createElement("span");
  ps1.className = "ps1";
  ps1.textContent = `${STATE.user}@${STATE.host}:${STATE.cwd}$`;
  const input = document.createElement("input");
  input.className = "prompt-input";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  input.value = initialText;

  line.appendChild(ps1);
  line.appendChild(input);
  const caret = document.createElement("span");
  caret.className = "fake-caret";
  line.appendChild(caret);

  outEl.appendChild(line);
  outEl.scrollTop = outEl.scrollHeight;
  STATE.activeInput = input;
  STATE.activeCaret = caret;
  input.focus();
  updateFakeCaret();

  input.addEventListener("keydown", onPromptKeydown);
  input.addEventListener("keyup", () => updateFakeCaret());
  input.addEventListener("input", () => updateFakeCaret());
  input.addEventListener("click", () => updateFakeCaret());
  input.addEventListener("focus", () => updateFakeCaret());
  input.addEventListener("blur", () => updateFakeCaret());
  outEl.onclick = () => STATE.activeInput?.focus();
}

export function freezeActiveLine() {
  const line = STATE.activeInput?.parentElement;
  if (!line) return;
  freezePromptLine(line, STATE.activeInput.value);
}

function freezePromptLine(line, raw) {
  line.classList.add("readonly");
  const echo = document.createElement("span");
  echo.className = "echo";
  echo.textContent = raw; // 앞공백 추가 안 함
  line.appendChild(echo);
  const inp = line.querySelector(".prompt-input");
  if (inp) inp.style.display = "none";
  const c = line.querySelector(".fake-caret");
  if (c) c.remove();
}

export function focusPrompt() {
  if (STATE.activeInput) {
    STATE.activeInput.focus();
    const v = STATE.activeInput.value;
    STATE.activeInput.value = "";
    STATE.activeInput.value = v;
    updateFakeCaret();
  }
}

function onPromptKeydown(e) {
  const input = e.target;

  if (e.key === "Enter") {
    const rawText = input.value;
    const execText = rawText.trim();
    input.blur();
    input.disabled = true;
    freezePromptLine(input.parentElement, rawText);
    handleInput(execText).finally(() => {
      resetAC();
      newPromptLine();
    });
    e.preventDefault();
    return;
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const now = Date.now();
    const caretPos = input.selectionStart ?? input.value.length;
    const { candidates, fragment, replaceStart } = computeCandidates(
      input.value,
      caretPos
    );

    const isSameBase =
      STATE.ac.base === input.value && STATE.ac.candidates?.length;
    if (isSameBase && candidates.length === STATE.ac.candidates.length) {
      const step = e.shiftKey ? -1 : 1;
      STATE.ac.idx =
        (STATE.ac.idx + step + STATE.ac.candidates.length) %
        STATE.ac.candidates.length;
      const pick = STATE.ac.candidates[STATE.ac.idx];
      applyCompletion(input, replaceStart, fragment, pick);
      STATE.ac.lastTs = now;
      return;
    }
    if (candidates.length === 0) {
      resetAC();
      return;
    }
    if (candidates.length === 1) {
      applyCompletion(input, replaceStart, fragment, candidates[0]);
      resetAC();
      return;
    }
    const lcp = longestCommonPrefix(candidates);
    if (lcp && lcp.length > fragment.length) {
      applyCompletion(input, replaceStart, fragment, lcp);
      STATE.ac = { base: input.value, candidates, idx: -1, lastTs: now };
      return;
    }
    if (now - STATE.ac.lastTs < 600) {
      printSuggestions(candidates);
    }
    STATE.ac = { base: input.value, candidates, idx: -1, lastTs: now };
    return;
  }
  if (e.key === "ArrowUp") {
    if (STATE.history.length) {
      if (STATE.historyIdx < 0) STATE.historyIdx = STATE.history.length - 1;
      else STATE.historyIdx = Math.max(0, STATE.historyIdx - 1);
      input.value = STATE.history[STATE.historyIdx] || "";
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = input.value.length;
        updateFakeCaret();
      }, 0);
    }
    e.preventDefault();
    resetAC();
    return;
  }
  if (e.key === "ArrowDown") {
    if (STATE.history.length) {
      if (STATE.historyIdx >= 0) STATE.historyIdx++;
      if (STATE.historyIdx >= STATE.history.length) {
        STATE.historyIdx = -1;
        input.value = "";
      } else {
        input.value = STATE.history[STATE.historyIdx] || "";
      }
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = input.value.length;
        updateFakeCaret();
      }, 0);
    }
    e.preventDefault();
    resetAC();
    return;
  }
  if (e.key === "c" && e.ctrlKey) {
    input.value = "";
    printPlain("^C");
    newPromptLine();
    e.preventDefault();
    resetAC();
    return;
  }
  if (
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "Home" ||
    e.key === "End"
  ) {
    setTimeout(() => updateFakeCaret(), 0);
  }
}

/* ======= exec entry ======= */
async function handleInput(cmdline) {
  if (!cmdline) {
    STATE.historyIdx = -1;
    return;
  }
  STATE.history.push(cmdline);
  STATE.historyIdx = -1;

  // 파이프라인 지원
  await runPipeline(cmdline);
}

/* ======= public boot helpers ======= */
export async function terminalBoot() {
  await loadManifest();
  renderPostList();
  print(t(STATE, "welcome"));
  print(t(STATE, "help"));
  newPromptLine();
}
