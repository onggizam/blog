export const outEl = document.getElementById("terminal-output");

export function print(html = "", cls = "") {
  const div = document.createElement("div");
  div.className = `terminal-line${cls ? ` ${cls}` : ""}`;
  div.innerHTML = html;
  outEl.appendChild(div);
  outEl.scrollTop = outEl.scrollHeight;
}

export function printPlain(text = "") {
  const div = document.createElement("div");
  div.className = "terminal-line";
  div.textContent = text;
  outEl.appendChild(div);
  outEl.scrollTop = outEl.scrollHeight;
}

export function escHtml(s) {
  return String(s).replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])
  );
}

export function printSuggestions(items) {
  if (!items?.length) return;
  print(
    `<div class="ac-suggestions">${items
      .map(escHtml)
      .join("&nbsp;&nbsp;")}</div>`
  );
}

export function longestCommonPrefix(arr) {
  if (!arr.length) return "";
  let s1 = arr[0],
    end = s1.length;
  for (let i = 1; i < arr.length; i++) {
    let j = 0;
    while (
      j < end &&
      j < arr[i].length &&
      s1[j].toLowerCase() === arr[i][j].toLowerCase()
    )
      j++;
    end = j;
    if (end === 0) return "";
  }
  return s1.slice(0, end);
}
