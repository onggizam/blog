import { STATE } from "./state.js";
import { t } from "./i18n.js";
import { print } from "./utils.js";
import { showBlogPost } from "./ui.js";

const postListEl = document.getElementById("post-list");
const postTitleEl = document.getElementById("post-title");
const postMetaEl = document.getElementById("post-meta");
const postContentEl = document.getElementById("post-content");

/* --- helpers --- */
const langBase = () => `./blog/${STATE.lang}`;

export async function loadManifest() {
  try {
    const res = await fetch(`${langBase()}/manifest.json`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("manifest not found");
    const data = await res.json();
    STATE.posts = (data.posts || []).map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
      date: p.date || "",
      tags: Array.isArray(p.tags) ? p.tags : [],
    }));
    STATE.indexBySlug = new Map(STATE.posts.map((p) => [p.slug, p]));
  } catch {
    STATE.posts = [];
    STATE.indexBySlug = new Map();
  }
}

export async function reloadPostsForLang() {
  await loadManifest();
  renderPostList("");
  // 포스트 뷰는 유지하지 않고 목록만 갱신 (원하면 여기서 postContentEl 비우기)
}

async function fetchPost(slug) {
  const res = await fetch(`${langBase()}/${slug}.md`, { cache: "no-store" });
  if (!res.ok) throw new Error("post not found");
  return await res.text();
}

/* ------- 검색 필터 ------- */
function getFilteredPosts(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return STATE.posts;
  return STATE.posts.filter((p) => {
    const inTitle = (p.title || "").toLowerCase().includes(q);
    const inTags = (p.tags || []).some((tag) =>
      String(tag).toLowerCase().includes(q)
    );
    const inSlug = (p.slug || "").toLowerCase().includes(q);
    return inTitle || inTags || inSlug;
  });
}

/* ------- 목록 렌더 (검색 반영) ------- */
export function renderPostList(query = STATE.searchQuery) {
  STATE.searchQuery = query || "";
  postListEl.innerHTML = "";

  const list = getFilteredPosts(STATE.searchQuery);
  if (list.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="post-title">${t(STATE, "no_results")}</span>`;
    postListEl.appendChild(li);
    return;
  }

  list.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="post-title">${p.title}</span>
      <span class="post-meta">${p.date || ""} • ${p.slug}.md</span>
      <div class="tags-row">
        ${p.tags
          .map(
            (tag) =>
              `<button class="tag" data-tag="${String(
                tag
              )}" type="button">${tag}</button>`
          )
          .join("")}
      </div>
    `;
    li.addEventListener("click", async (e) => {
      // 태그 클릭은 목록 필터링, 항목 본문 열기와 충돌 방지
      const tagBtn = e.target.closest(".tag");
      if (tagBtn) {
        const tag = tagBtn.dataset.tag || "";
        const searchInput = document.getElementById("post-search");
        STATE.searchQuery = tag;
        if (searchInput) {
          searchInput.value = tag;
        }
        renderPostList(tag);
        e.stopPropagation();
        return;
      }
      await openPost(p.slug);
      showBlogPost();
    });
    postListEl.appendChild(li);
  });
}

export async function openPost(slug) {
  try {
    const md = await fetchPost(slug);
    const filename = `${slug}.md`;
    const meta = STATE.indexBySlug.get(slug);
    const title = extractTitleFromMarkdown(md, meta?.title || filename);

    postTitleEl.textContent = title;

    let metaLine = filename;
    if (meta?.date) metaLine += ` • ${meta.date}`;

    let tagsLine = "";
    if (meta?.tags?.length) {
      tagsLine = `<div class="tags-inline">
        ${meta.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>`;
    }

    postMetaEl.innerHTML = `
  ${filename}${meta?.date ? ` • ${meta.date}` : ""}
  ${
    meta?.tags?.length
      ? meta.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")
      : ""
  }
`;

    postContentEl.innerHTML = renderMarkdown(md);
    print(t(STATE, "opened", filename), "ok");
  } catch {
    print(`${t(STATE, "not_found")}: ${slug}`, "error");
  }
}

function extractTitleFromMarkdown(md, fallback) {
  const m = md.match(/^\s*#\s+(.+)\s*$/m);
  return (m && m[1].trim()) || fallback;
}

/* --- renderMarkdown: highlight.js 연동 + 코드블록 개행 정리 포함 --- */
export function renderMarkdown(md) {
  const esc = (s) =>
    s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  let html = md
    .replace(/\r\n/g, "\n")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/```([a-z0-9_-]+)?\s*\n([\s\S]*?)\n?```/gi, (m, lang, code) => {
      const cleaned = code.replace(/^\n/, "").replace(/\n$/, "");
      const cls = lang ? ` class="language-${lang}"` : "";
      return `<pre><code${cls}>${esc(cleaned)}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

  html = html.replace(/^(?:- |\* )(.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");

  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (/^\s*<(h\d|ul|pre|blockquote|img)/.test(block)) return block;
      if (/^\s*<li>/.test(block)) return `<ul>${block}</ul>`;
      return `<p>${block}</p>`;
    })
    .join("\n");

  // highlight.js 적용
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll("pre code").forEach((block) => {
    if (window.hljs) {
      hljs.highlightElement(block);
    }
  });
  return container.innerHTML;
}

export function getMdFilenames() {
  return STATE.posts.map((p) => `${p.slug}.md`);
}
