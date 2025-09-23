import { STATE } from "./state.js";
import { renderPostList, openPost } from "./posts.js";
import { setTheme, showBlogPost, sceneSwitch } from "./ui.js";

function slugHash(slug) {
  let h = 5381 >>> 0;
  for (let i = 0; i < slug.length; i++) {
    h = (((h << 5) + h) ^ slug.charCodeAt(i)) >>> 0;
  }
  return h % 10000000;
}

function buildHashMaps() {
  STATE.slugToHash = new Map();
  STATE.hashToSlug = new Map();
  for (const p of STATE.posts) {
    const id = slugHash(p.slug);
    let final = id,
      suffix = 0;
    while (
      STATE.hashToSlug.has(String(final)) &&
      STATE.hashToSlug.get(String(final)) !== p.slug
    ) {
      suffix++;
      final = (id + suffix) % 10000000;
      if (suffix > 9) break;
    }
    STATE.slugToHash.set(p.slug, final);
    STATE.hashToSlug.set(String(final), p.slug);
  }
}

function parseQueryNumber(qs) {
  const q = (qs || "").replace(/^\?/, "");
  if (!q) return null;
  const [k, v] = q.split("=");
  if (!v && k) {
    const n = Number(k);
    return Number.isFinite(n) ? n : null;
  }
  if (k === "" && v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseQuerySlug(qs) {
  const q = (qs || "").replace(/^\?/, "");
  if (!q) return null;
  const [k, v] = q.split("=");
  if (k === "id" && v) return decodeURIComponent(v).replace(/\.md$/, "");
  return null;
}

export async function routeFromLocation() {
  const { pathname, search } = window.location;
  if (pathname.endsWith("/posts") || pathname.endsWith("/posts/")) {
    if (!STATE.slugToHash) buildHashMaps();

    const num = parseQueryNumber(search);
    if (num !== null) {
      const slug = STATE.hashToSlug.get(String(num));
      if (slug) {
        await openPost(slug);
        setTheme("blog");
        showBlogPost();
        return;
      }
    }
    const slugQ = parseQuerySlug(search);
    if (slugQ) {
      await openPost(slugQ);
      setTheme("blog");
      showBlogPost();
      return;
    }
    setTheme("blog");
    renderPostList();
    sceneSwitch("blog");
    return;
  }

  setTheme("blog");
  renderPostList();
  sceneSwitch("blog");
}

export function navigateToList(replace = false) {
  const url = "/posts";
  if (replace) history.replaceState({ view: "list" }, "", url);
  else history.pushState({ view: "list" }, "", url);
}

export function navigateToPostBySlug(slug) {
  if (!STATE.slugToHash) buildHashMaps();
  const id = STATE.slugToHash.get(slug);
  if (id == null) {
    history.pushState(
      { view: "post", slug },
      "",
      `/posts?id=${encodeURIComponent(slug)}`
    );
    return;
  }
  history.pushState({ view: "post", id }, "", `/posts?=${id}`);
}
