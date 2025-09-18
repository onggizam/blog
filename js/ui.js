import { STATE } from "./state.js";
import { t } from "./i18n.js";
import { print } from "./utils.js";
import { newPromptLine, freezeActiveLine, focusPrompt } from "./terminal.js";
import { renderPostList, reloadPostsForLang } from "./posts.js";

const sceneTerminal = document.getElementById("terminal-scene");
const sceneBlog = document.getElementById("blog-scene");
const blogContainer = document.querySelector(".blog-container"); // ← 추가

export function showBlogList() {
  blogContainer.classList.add("list-mode");
  blogContainer.classList.remove("detail-mode");
}

export function showBlogPost() {
  blogContainer.classList.remove("list-mode");
  blogContainer.classList.add("detail-mode");
}

export function sceneSwitch(target) {
  if (target === "blog") {
    sceneTerminal.classList.add("hidden");
    sceneBlog.classList.remove("hidden");
    showBlogList();
    const searchEl = document.getElementById("post-search");
    if (searchEl) searchEl.placeholder = t(STATE, "search_placeholder");
  } else {
    sceneBlog.classList.add("hidden");
    sceneTerminal.classList.remove("hidden");
    focusPrompt();
  }
  STATE.view = target;
  updateHeaderButtons();
}

export function ensureNewPromptLine() {
  if (STATE.view !== "terminal") return;
  if (STATE.activeInput && !STATE.activeInput.disabled) freezeActiveLine();
  newPromptLine();
}

export function updateHeaderButtons() {
  const themeBtn = document.getElementById("btnThemeToggle");
  const langBtn = document.getElementById("btnLangToggle");
  if (themeBtn)
    themeBtn.textContent = STATE.theme === "blog" ? "Blog" : "Terminal";
  if (langBtn) langBtn.textContent = STATE.lang.toUpperCase();
}

export function setTheme(name, { promptAfter = false } = {}) {
  const next = name.toLowerCase() === "blog" ? "blog" : "terminal";
  if (STATE.theme === next) {
    updateHeaderButtons();
    if (promptAfter) ensureNewPromptLine();
    return;
  }

  STATE.theme = next;
  document.body.classList.remove("theme-terminal", "theme-blog");
  document.body.classList.add(`theme-${next}`);

  if (next === "blog") {
    STATE.view = "blog";
    sceneSwitch("blog");
  } else {
    STATE.view = "terminal";
    sceneSwitch("terminal");
  }

  print(t(STATE, "theme_switched", next), "ok");
  updateHeaderButtons();
  if (promptAfter && next === "terminal") ensureNewPromptLine();
}

export async function setLang(code, { promptAfter = false } = {}) {
  const next = code === "en" ? "en" : "kr";
  if (STATE.lang === next) {
    updateHeaderButtons();
    if (promptAfter) ensureNewPromptLine();
    return;
  }

  STATE.lang = next;
  document.body.setAttribute("data-lang", STATE.lang);
  await reloadPostsForLang();
  showBlogList();

  // 검색창 placeholder와 값 초기화
  const searchEl = document.getElementById("post-search");
  if (searchEl) {
    searchEl.placeholder = t(STATE, "search_placeholder");
    searchEl.value = "";
  }

  const postsHdr = document.querySelector('[data-i18n="posts"]');
  const backBtn = document.querySelector('[data-i18n="back"]');
  if (postsHdr) postsHdr.textContent = t(STATE, "posts");
  if (backBtn) backBtn.textContent = t(STATE, "back");

  print(t(STATE, "lang_switched", STATE.lang), "ok");
  updateHeaderButtons();
  if (promptAfter && STATE.view === "terminal") ensureNewPromptLine();
}

export function wireHeaderButtons() {
  const themeBtn = document.getElementById("btnThemeToggle");
  const langBtn = document.getElementById("btnLangToggle");
  const backBtn = document.getElementById("btnBackToList");
  const searchEl = document.getElementById("post-search"); // ← 추가

  themeBtn?.addEventListener("click", () => {
    const next = STATE.theme === "terminal" ? "blog" : "terminal";
    setTheme(next, { promptAfter: next === "terminal" });
  });

  langBtn?.addEventListener("click", async () => {
    const next = STATE.lang === "en" ? "kr" : "en";
    await setLang(next, { promptAfter: STATE.view === "terminal" });
  });

  backBtn?.addEventListener("click", () => showBlogList());

  /* 검색 입력: 디바운스 */
  if (searchEl) {
    let tId;
    const handler = (e) => {
      const q = e.target.value || "";
      clearTimeout(tId);
      tId = setTimeout(() => renderPostList(q), 120);
    };
    searchEl.addEventListener("input", handler);
  }

  updateHeaderButtons();
}
