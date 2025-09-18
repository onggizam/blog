from __future__ import annotations
import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

try:
    import yaml  # type: ignore
except Exception:
    yaml = None

H1_RE = re.compile(r"^\s*#\s+(.+?)\s*$", re.MULTILINE)
FRONT_RE = re.compile(r"^---\s*\n([\s\S]*?)\n---\s*", re.UNICODE)
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

@dataclass
class PostMeta:
    slug: str
    title: str
    date: str = ""
    tags: List[str] = None  # type: ignore

    def as_dict(self) -> Dict[str, Any]:
        return {
            "slug": self.slug,
            "title": self.title,
            "date": self.date,
            "tags": self.tags or [],
        }

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate manifest.json for blog/<lang> and clean tags footer in *.md")
    p.add_argument("--root", default="blog", help="Root directory (default: blog)")
    p.add_argument("--langs", nargs="*", default=["en", "kr"], help="Language folders to scan (default: en kr)")
    p.add_argument("--dry-run", action="store_true", help="Do not write files; just print results")
    p.add_argument("--verbose", "-v", action="store_true", help="Verbose logs")
    return p.parse_args()

def safe_read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1")

def parse_front_matter_for_title_date(md: str) -> Dict[str, Any]:
    m = FRONT_RE.match(md)
    if not m:
        return {}
    raw = m.group(1).strip()
    if yaml:
        try:
            data = yaml.safe_load(raw) or {}
            if isinstance(data, dict):
                return {k: data.get(k) for k in ("title", "date")}
        except Exception:
            return {}

    out: Dict[str, Any] = {}
    for line in raw.splitlines():
        m2 = re.match(r"^\s*(title|date)\s*:\s*(.+?)\s*$", line)
        if m2:
            k, v = m2.group(1), m2.group(2).strip().strip("'\"")
            out[k] = v
    return out

def first_h1_as_title(md: str) -> Optional[str]:
    m = H1_RE.search(md)
    return m.group(1).strip() if m else None

def normalize_date(val: Optional[str]) -> str:
    if not val:
        return ""
    s = str(val).strip()
    if ISO_DATE_RE.match(s):
        return s
    for fmt in ("%Y/%m/%d", "%Y.%m.%d", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except Exception:
            pass
    try:
        from dateutil.parser import parse as dtparse  # type: ignore
        return dtparse(s).date().isoformat()
    except Exception:
        return ""

def extract_and_strip_tags_footer(md: str) -> Tuple[List[str], str]:
    lines = md.rstrip().splitlines()
    if not lines:
        return [], md

    tag_start_idx = None
    for i in range(len(lines) - 1, -1, -1):
        if re.match(r"^\s*tags\s*:", lines[i], flags=re.IGNORECASE):
            tag_start_idx = i
            break
        if lines[i].strip() != "":
            break

    if tag_start_idx is None:
        return [], md 
    
    tag_block = [lines[tag_start_idx]]
    j = tag_start_idx + 1
    while j < len(lines) and (lines[j].strip().startswith("-") or lines[j].strip().startswith("*") or lines[j].strip() == "" or re.match(r"^\s+\S+", lines[j])):
        tag_block.append(lines[j])
        j += 1

    raw = "\n".join(tag_block)

    m_inline = re.match(r"(?is)^\s*tags\s*:\s*\[(.*?)\]\s*$", raw)
    if m_inline:
        inner = m_inline.group(1)
        tags = [x.strip().strip("'\"").lstrip("#") for x in inner.split(",") if x.strip()]
    else:
        m_csv = re.match(r"(?is)^\s*tags\s*:\s*(.+?)\s*$", lines[tag_start_idx])
        tags: List[str] = []
        if m_csv:
            rest = m_csv.group(1).strip()
            if rest:
                parts = re.split(r"[,\s]+", rest)
                tags.extend([p.strip().strip("'\"").lstrip("#") for p in parts if p.strip()])
        if len(tag_block) > 1:
            for ln in tag_block[1:]:
                m_item = re.match(r"^\s*[-*]\s*(.+?)\s*$", ln)
                if m_item:
                    tags.append(m_item.group(1).strip().strip("'\"").lstrip("#"))

    out, seen = [], set()
    for t in tags:
        t = t.strip()
        if not t:
            continue
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(t)

    cleaned_lines = lines[:tag_start_idx] + lines[j:]
    cleaned_md = ("\n".join(cleaned_lines)).rstrip() + "\n"
    return out, cleaned_md

def collect_post(lang_dir: Path, md_path: Path, dry_run: bool=False, verbose: bool=False) -> Optional[PostMeta]:
    slug = md_path.stem
    md = safe_read_text(md_path)

    fm = parse_front_matter_for_title_date(md)
    title = fm.get("title") or first_h1_as_title(md) or slug
    date = normalize_date(fm.get("date"))

    tags, cleaned = extract_and_strip_tags_footer(md)
    if cleaned != md and not dry_run:
        md_path.write_text(cleaned, encoding="utf-8")
        if verbose:
            print(f"[clean] stripped tags footer: {md_path.name}")
    elif cleaned != md and dry_run and verbose:
        print(f"[dry-run] would strip tags footer: {md_path.name}")

    if verbose:
        print(f"[info] {lang_dir.name}/{md_path.name} → title='{title}', date='{date}', tags={tags}")

    return PostMeta(slug=slug, title=title, date=date, tags=tags)

def sort_by_date_desc(posts: List[PostMeta]) -> List[PostMeta]:
    def keyfn(p: PostMeta):
        try:
            ts = int(datetime.strptime(p.date, "%Y-%m-%d").timestamp())
            return (0, -ts, p.slug.lower())
        except Exception:
            return (1, 0, p.slug.lower())
    return sorted(posts, key=keyfn)

def write_manifest(lang_dir: Path, posts: List[PostMeta], dry_run: bool=False, verbose: bool=False) -> None:
    payload = {"posts": [p.as_dict() for p in posts]}
    out_path = lang_dir / "manifest.json"
    if dry_run:
        print(f"--- {lang_dir.name}/manifest.json (dry-run) ---")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if verbose:
        print(f"[ok] wrote {out_path}")

def main():
    args = parse_args()
    root = Path(args.root)
    if not root.exists():
        print(f"[error] root not found: {root}", file=sys.stderr)
        sys.exit(1)

    for lang in args.langs:
        lang_dir = root / lang
        if not lang_dir.exists():
            if args.verbose:
                print(f"[warn] skip missing dir: {lang_dir}", file=sys.stderr)
            continue

        posts: List[PostMeta] = []
        for md_path in sorted(lang_dir.glob("*.md")):
            meta = collect_post(lang_dir, md_path, dry_run=args.dry_run, verbose=args.verbose)
            if meta:
                posts.append(meta)

        posts = sort_by_date_desc(posts)
        write_manifest(lang_dir, posts, dry_run=args.dry_run, verbose=args.verbose)

    if args.dry_run:
        print("[dry-run] no files were written.")

if __name__ == "__main__":
    main()