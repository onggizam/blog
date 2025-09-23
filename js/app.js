import { wireHeaderButtons, setTheme, sceneSwitch } from "./ui.js";
import { loadManifest } from "./posts.js";
import { routeFromLocation } from "./router.js";
import { terminalBoot } from "./terminal.js";

wireHeaderButtons();

let TERMINAL_BOOTED = false;

function isPostsRoute() {
  return /\/posts\/?$/.test(window.location.pathname);
}

async function showTerminalOnce() {
  if (!TERMINAL_BOOTED) {
    setTheme("terminal");
    terminalBoot();
    TERMINAL_BOOTED = true;
  } else {
    setTheme("terminal");
    sceneSwitch("terminal");
  }
}

async function showBlogFromUrl() {
  setTheme("blog");
  await routeFromLocation();
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadManifest();
  if (isPostsRoute()) {
    await showBlogFromUrl();
  } else {
    await showTerminalOnce();
  }
});

window.addEventListener("popstate", async () => {
  if (isPostsRoute()) {
    await showBlogFromUrl();
  } else {
    await showTerminalOnce();
  }
});
