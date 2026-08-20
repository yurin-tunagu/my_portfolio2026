#!/usr/bin/env python3
"""サイト内で重複している内容がズレていないかを検査する。

同じ文言が複数のファイルに手でコピーされている箇所があるため、
片方だけ直して片方が取り残される事故を防ぐ目的で使う。

使い方（このファイルの場所に関係なく動く）:

    python3 scripts/check_consistency.py

すべて一致していれば終了コード 0、ズレがあれば 1 を返す。
追加のパッケージは不要（Python 3 標準ライブラリのみ）。
"""

import collections
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 検査から除外するフォルダ（体験版デモは独立した1枚ものなので共通パーツを持たない）
EXCLUDE_DIRS = {".git", "demos"}


def html_files():
    found = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for name in filenames:
            if name.endswith(".html"):
                found.append(os.path.join(dirpath, name))
    return sorted(found)


def rel(path):
    return os.path.relpath(path, ROOT)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def visible_text(fragment):
    """HTMLタグを除いて、画面に表示される文言だけを取り出す。"""
    fragment = re.sub(r"<span class=\"sr-only\">.*?</span>", "", fragment, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", "\x00", fragment))
    return tuple(t for t in (s.strip() for s in text.split("\x00")) if t)


def find(pattern, source):
    match = re.search(pattern, source, re.S)
    return match.group(0) if match else None


class Report:
    def __init__(self):
        self.failures = []

    def check(self, title, groups):
        """groups: {内容: [ファイル名, ...]} が1種類なら一致。"""
        if len(groups) <= 1:
            count = sum(len(v) for v in groups.values())
            print(f"  OK   {title}（{count}箇所すべて一致）")
            return
        print(f"  NG   {title}: {len(groups)}種類に分かれています")
        for content, files in sorted(groups.items(), key=lambda x: -len(x[1])):
            shown = content if isinstance(content, str) else " / ".join(content)
            if len(shown) > 200:
                shown = shown[:200] + "…"
            print(f"         [{len(files)}箇所] {shown}")
            print(f"            → {', '.join(files)}")
        self.failures.append(title)


def check_shared_parts(report):
    """全ページに複製されているヘッダー・フッターの文言を照合する。"""
    print("[1] 共通パーツ（ヘッダー・フッター）")
    targets = [
        ("ヘッダーの表示文言", r"<header class=\"site-header\".*?</header>"),
        ("フッターの表示文言", r"<footer class=\"site-footer\".*?</footer>"),
    ]
    for title, pattern in targets:
        groups = collections.defaultdict(list)
        for path in html_files():
            fragment = find(pattern, read(path))
            if fragment:
                groups[visible_text(fragment)].append(rel(path))
        report.check(title, dict(groups))


def check_values_section(report):
    """「大切にしていること」がトップとプロフィールで一致しているか。"""
    print("[2] 「大切にしていること」（トップ / プロフィール）")

    def extract(path, pattern):
        fragment = find(pattern, read(os.path.join(ROOT, path)))
        if fragment is None:
            return None
        items = []
        for m in re.finditer(r"<h3>(.*?)</h3>\s*<p>(.*?)</p>", fragment, re.S):
            heading = re.sub(r"\s+", "", html.unescape(re.sub(r"<[^>]+>", "", m.group(1))))
            body = re.sub(r"\s+", "", html.unescape(re.sub(r"<br\s*/?>", "／", m.group(2))))
            body = re.sub(r"<[^>]+>", "", body).strip("／")
            items.append(f"{heading}｜{body}")
        return tuple(items)

    top = extract("index.html", r"<section class=\"section profile-intro\".*?</ol>")
    about = extract(
        "about/index.html",
        r"aria-labelledby=\"values-heading\".*?<p class=\"section-action\">",
    )

    if top is None or about is None:
        print("  NG   セクションを見つけられませんでした（構造が変わった可能性）")
        report.failures.append("大切にしていることの抽出")
        return

    groups = collections.defaultdict(list)
    groups[top].append("index.html")
    groups[about].append("about/index.html")
    report.check("3つの項目（見出しと本文）", dict(groups))


def check_concern_titles(report):
    """困りごと15件のタイトルが3箇所で一致しているか。"""
    print("[3] 困りごと15件のタイトル（site.js 内2箇所 + お問い合わせフォーム）")
    js = read(os.path.join(ROOT, "assets", "js", "site.js"))
    contact = read(os.path.join(ROOT, "contact", "index.html"))

    from_array = set(re.findall(r"title:\s*\"([^\"]+)\"", js))
    from_map = set(re.findall(r"\"\d-\d\":\s*\"([^\"]+)\"", js))
    from_form = {
        t.strip()
        for t in re.findall(r"<option[^>]*data-category[^>]*>([^<]+)</option>", contact)
    }

    print(f"       site.js の concerns配列   : {len(from_array)}件")
    print(f"       site.js の concernTitles  : {len(from_map)}件")
    print(f"       contact のフォーム選択肢  : {len(from_form)}件")

    if from_array == from_map == from_form:
        print("  OK   困りごとタイトル（3箇所すべて一致）")
        return

    print("  NG   困りごとタイトルが3箇所で食い違っています")
    for label, only in [
        ("concerns配列にだけある", from_array - from_map - from_form),
        ("concernTitlesにだけある", from_map - from_array - from_form),
        ("フォーム選択肢にだけある", from_form - from_array - from_map),
        ("concernTitlesに無い", from_array - from_map),
        ("フォーム選択肢に無い", from_array - from_form),
    ]:
        if only:
            print(f"         {label}: {sorted(only)}")
    report.failures.append("困りごと15件のタイトル")


def check_asset_versions(report):
    """CSS・JSのキャッシュ更新用バージョン指定が全ページで揃っているか。

    揃っていないと、修正しても古い表示のままのページが出る。
    """
    print("[4] CSS・JSのキャッシュ更新用バージョン指定")
    for label, pattern in [
        ("CSS", r"href=\"[^\"]*assets/css/styles\.css(\?v=[^\"]*)?\""),
        ("JS", r"src=\"[^\"]*assets/js/site\.js(\?v=[^\"]*)?\""),
    ]:
        groups = collections.defaultdict(list)
        for path in html_files():
            for m in re.finditer(pattern, read(path)):
                version = m.group(1) or "（バージョン指定なし）"
                groups[version].append(rel(path))
        if groups:
            report.check(f"{label}のバージョン指定", dict(groups))


def main():
    print(f"重複内容の整合性チェック: {ROOT}\n")
    report = Report()
    check_shared_parts(report)
    print()
    check_values_section(report)
    print()
    check_concern_titles(report)
    print()
    check_asset_versions(report)
    print()

    if report.failures:
        print(f"結果: {len(report.failures)}件のズレが見つかりました。")
        print("　　　上のNG行を確認し、どちらが正しいか決めて両方を揃えてください。")
        return 1
    print("結果: ズレはありません。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
