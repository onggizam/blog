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
  const rawHtml = marked.parse(md || "");
  const safeHtml = window.DOMPurify
    ? DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
    : rawHtml; // DOMPurify 미사용 시 이 라인으로 렌더(보안 주의)
  return safeHtml;
}

export function getMdFilenames() {
  return STATE.posts.map((p) => `${p.slug}.md`);
}
