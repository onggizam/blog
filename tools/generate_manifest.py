#!/usr/bin/env python3
# -*- coding: utf-8 -*-

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
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

@dataclass
class PostMeta:
    slug: str
    title: str
    date: str = ""
    tags: List[str] = None  # type: ignore

    def as_dict(self) -> Dict[str, Any]:
        return {"slug": self.slug, "title": self.title, "date": self.date, "tags": self.tags or []}

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate manifest.json for blog/<lang>")
    p.add_argument("--root", default="blog")
    p.add_argument("--langs", nargs="*", default=["en", "kr"])
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--verbose", "-v", action="store_true")
    return p.parse_args()

def safe_read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1")

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

def normalize_tags(tags: Any) -> List[str]:
    if tags is None:
        return []
    if isinstance(tags, str):
        if tags.strip().startswith("[") and tags.strip().endswith("]"):
            inner = tags.strip()[1:-1]
            parts = [x.strip() for x in inner.split(",")]
        else:
            parts = re.split(r"[,\s]+", tags.strip())
    elif isinstance(tags, (list, tuple)):
        parts = [str(x) for x in tags]
    else:
        return []
    out, seen = [], set()
    for x in parts:
        x = x.strip().strip("'\"").lstrip("#")
        if not x:
            continue
        key = x.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(x)
    return out

def extract_last4_meta(md: str) -> Tuple[Dict[str, Any], str]:
    lines = md.rstrip().splitlines()
    if len(lines) < 4:
        return {}, md
    last4 = lines[-4:]
    meta_block = "\n".join(last4)
    meta: Dict[str, Any] = {}
    if yaml:
        try:
            y = yaml.safe_load(meta_block) or {}
            if isinstance(y, dict):
                meta = {k: y.get(k) for k in ("title", "date", "tags") if k in y}
        except Exception:
            pass
    if not meta:
        for line in last4:
            m = re.match(r"^\s*(title|date|tags)\s*:\s*(.+?)\s*$", line)
            if m:
                k, v = m.group(1), m.group(2).strip()
                meta[k] = v
    title = (meta.get("title") or "").strip().strip("'\"")
    date = normalize_date(meta.get("date"))
    tags = normalize_tags(meta.get("tags"))
    meta_norm = {"title": title, "date": date, "tags": tags}
    cleaned = "\n".join(lines[:-4]).rstrip() + "\n"
    return meta_norm, cleaned

def collect_post(lang_dir: Path, md_path: Path, dry_run: bool=False, verbose: bool=False) -> Optional[PostMeta]:
    slug = md_path.stem
    md = safe_read_text(md_path)
    footer_meta, cleaned = extract_last4_meta(md)
    title = footer_meta.get("title") or first_h1_as_title(md) or slug
    date = footer_meta.get("date") or ""
    tags = footer_meta.get("tags") or []
    if cleaned != md and not dry_run:
        md_path.write_text(cleaned, encoding="utf-8")
        if verbose:
            print(f"[clean] stripped last 4 lines as meta: {md_path.name}")
    elif cleaned != md and dry_run and verbose:
        print(f"[dry-run] would strip last 4 lines as meta: {md_path.name}")
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

def load_existing_manifest(lang_dir: Path, verbose: bool=False) -> List[Dict[str, Any]]:
    out_path = lang_dir / "manifest.json"
    if not out_path.exists():
        return []
    try:
        data = json.loads(out_path.read_text(encoding="utf-8"))
        return data.get("posts", [])
    except Exception as e:
        if verbose:
            print(f"[warn] failed to parse existing manifest: {e}", file=sys.stderr)
        return []

def write_manifest(lang_dir: Path, posts: List[PostMeta], dry_run: bool=False, verbose: bool=False) -> None:
    existing = load_existing_manifest(lang_dir, verbose=verbose)
    existing_map = {p["slug"]: p for p in existing}
    for p in posts:
        if p.slug not in existing_map:  # 절대 갱신하지 않고 신규만 추가
            existing_map[p.slug] = p.as_dict()
    merged = list(existing_map.values())
    merged_posts = sort_by_date_desc([PostMeta(**p) for p in merged])
    payload = {"posts": [p.as_dict() for p in merged_posts]}
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
        write_manifest(lang_dir, posts, dry_run=args.dry_run, verbose=args.verbose)
    if args.dry_run:
        print("[dry-run] no files were written.")

if __name__ == "__main__":
    main()
