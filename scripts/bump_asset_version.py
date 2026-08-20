#!/usr/bin/env python3
"""CSS・JSのキャッシュ更新用バージョン指定を、全ページで一括更新する。

ブラウザがCSS・JSをキャッシュするため、編集しても古い表示のままになる。
全ページの `?v=` を同じ新しい値へ揃えることで、確実に新しい内容を読ませる。

使い方:

    python3 scripts/bump_asset_version.py 20260819-hero-fix

引数を省略すると、今日の日付から候補を作って表示するだけで、書き換えは行わない。
追加のパッケージは不要（Python 3 標準ライブラリのみ）。
"""

import datetime
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE_DIRS = {".git", "demos"}

PATTERNS = [
    (r"(href=\")([^\"]*assets/css/styles\.css)(\?[^\"]*)?(\")", "CSS"),
    (r"(src=\")([^\"]*assets/js/site\.js)(\?[^\"]*)?(\")", "JS"),
]


def html_files():
    found = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for name in filenames:
            if name.endswith(".html"):
                found.append(os.path.join(dirpath, name))
    return sorted(found)


def main():
    if len(sys.argv) < 2:
        today = datetime.date.today().strftime("%Y%m%d")
        print("バージョン名を引数で指定してください。")
        print(f"  例: python3 scripts/bump_asset_version.py {today}-変更内容がわかる名前")
        print("\n（何も書き換えていません）")
        return 1

    version = sys.argv[1].strip()
    if not re.fullmatch(r"[A-Za-z0-9._-]+", version):
        print(f"バージョン名に使えない文字が含まれています: {version}")
        print("英数字とハイフン・アンダースコア・ドットだけで指定してください。")
        return 1

    changed = []
    for path in html_files():
        with open(path, encoding="utf-8") as f:
            original = f.read()
        updated = original
        for pattern, _label in PATTERNS:
            updated = re.sub(pattern, rf"\1\2?v={version}\4", updated)
        if updated != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(updated)
            changed.append(os.path.relpath(path, ROOT))

    if not changed:
        print(f"すべて既に {version} になっています。書き換えはありません。")
        return 0

    print(f"バージョンを {version} に更新しました（{len(changed)}ファイル）:")
    for name in changed:
        print(f"  {name}")
    print("\n確認のため、続けて次を実行してください。")
    print("  python3 scripts/check_consistency.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
