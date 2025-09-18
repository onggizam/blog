export const I18N = {
  kr: {
    welcome: ` ██████╗ ███╗   ██╗ ██████╗  ██████╗ ██╗███████╗ █████╗ ███╗   ███╗
██╔═══██╗████╗  ██║██╔════╝ ██╔════╝ ██║╚══███╔╝██╔══██╗████╗ ████║
██║   ██║██╔██╗ ██║██║  ███╗██║  ███╗██║  ███╔╝ ███████║██╔████╔██║
██║   ██║██║╚██╗██║██║   ██║██║   ██║██║ ███╔╝  ██╔══██║██║╚██╔╝██║
╚██████╔╝██║ ╚████║╚██████╔╝╚██████╔╝██║███████╗██║  ██║██║ ╚═╝ ██║
 ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
                                                                   
██████╗ ██╗      ██████╗  ██████╗                                  
██╔══██╗██║     ██╔═══██╗██╔════╝                                  
██████╔╝██║     ██║   ██║██║  ███╗                                 
██╔══██╗██║     ██║   ██║██║   ██║                                 
██████╔╝███████╗╚██████╔╝╚██████╔╝                                 
╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝ `,
    help: `사용 가능한 명령어:\n - ls \t\t: 게시물 리스트 >> 옵션[-al, -topic]\n - open <name|slug>\t: 게시물 보기 (보기 화면으로 전환)\n - theme <name>\t: 테마 전환 [terminal|blog]\n - clear\t: 커맨드라인 클리어\n - help\t\t: 도움말\n`,
    no_posts:
      "게시물이 없습니다. blog/ 폴더에 .md 파일과 manifest.json을 추가하세요.",
    opened: (f) => `'${f}' 파일을 열었습니다.`,
    not_found: "파일을 찾을 수 없습니다.",
    bad_arg: "인수 형식이 잘못되었습니다.",
    theme_switched: (t) => `테마가 '${t}'(으)로 전환되었습니다.`,
    lang_switched: (l) => `언어가 '${l.toUpperCase()}'(으)로 전환되었습니다.`,
    posts: "게시물",
    back: "목록으로",
    search_placeholder: "제목이나 태그로 검색…",
    no_results: "검색 결과가 없습니다.",
  },
  en: {
    welcome: ` ██████╗ ███╗   ██╗ ██████╗  ██████╗ ██╗███████╗ █████╗ ███╗   ███╗
██╔═══██╗████╗  ██║██╔════╝ ██╔════╝ ██║╚══███╔╝██╔══██╗████╗ ████║
██║   ██║██╔██╗ ██║██║  ███╗██║  ███╗██║  ███╔╝ ███████║██╔████╔██║
██║   ██║██║╚██╗██║██║   ██║██║   ██║██║ ███╔╝  ██╔══██║██║╚██╔╝██║
╚██████╔╝██║ ╚████║╚██████╔╝╚██████╔╝██║███████╗██║  ██║██║ ╚═╝ ██║
 ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
                                                                   
██████╗ ██╗      ██████╗  ██████╗                                  
██╔══██╗██║     ██╔═══██╗██╔════╝                                  
██████╔╝██║     ██║   ██║██║  ███╗                                 
██╔══██╗██║     ██║   ██║██║   ██║                                 
██████╔╝███████╗╚██████╔╝╚██████╔╝                                 
╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝  `,
    help: `Available commands:\n - ls \t\t: list posts >> option[-al, -topic]\n - open <name|slug>\t: open a post (switches to reader)\n - theme <name>\t: switch theme [terminal|blog]\n - clear\t: clear console\n - help\t\t: help\n`,
    no_posts: "No posts found. Add .md files and manifest.json under blog/.",
    opened: (f) => `Opened '${f}'.`,
    not_found: "No such file.",
    bad_arg: "Invalid arguments.",
    theme_switched: (t) => `Theme switched to '${t}'.`,
    lang_switched: (l) => `Language switched to '${l.toUpperCase()}'.`,
    posts: "Posts",
    back: "Back to list",
    search_placeholder: "Search by title or tag…",
    no_results: "No results.",
  },
};

export function t(state, key, ...args) {
  const lang = state.lang;
  const table = I18N[lang] ?? I18N.en;
  const val = table[key] ?? I18N.en[key] ?? key;
  return typeof val === "function" ? val(...args) : val;
}
