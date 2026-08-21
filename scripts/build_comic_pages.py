#!/usr/bin/env python3
"""漫画ページ（ページ判型の画像）のHTMLブロックを生成して差し替える。

漫画は1枚の画像に複数コマが焼き込まれた「ページ」として作る。
構成上、1話が3枚になることも5枚になることもあるため、
枚数とコマの割り当てをこのファイルの STORIES で管理し、
実行するたびに各話のHTMLを作り直す。

使い方:

    python3 scripts/build_comic_pages.py            # 全話を更新
    python3 scripts/build_comic_pages.py mata-ashita  # 1話だけ更新

画像の置き場所:

    assets/images/stories/<slug>/page-1.jpg … page-5.jpg
    （1536 x 1024 の横長／3:2。PNGで受け取ったら sips で品質90のJPEGへ変換する）

追加のパッケージは不要（Python 3 標準ライブラリのみ）。
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 画像の実寸。生成時の指定と揃える。
IMG_W, IMG_H = 1536, 1024

# 各話のページ構成。
#   "pages" は1ページぶんを (コマの表示名, altに入れる説明) で並べる。
#   枚数を変えたいときは、この配列を増減するだけでよい（3〜5枚を想定）。
STORIES = {
    "mata-ashita": {
        "title": "閉店後の「また明日」",
        "pages": [
            ("第1〜2コマ", "閉店後の店内。店主がスマホの投稿画面を開くが、前回の投稿日を見て手を止める。"),
            ("第3〜4コマ", "ゆりんが後ろ姿でパソコンを差し出す。店主がパソコンへ今日の出来事を話し始める。"),
            ("第5〜6コマ", "AIが3つの投稿候補を整理して示し、店主がトラックパッドで2番を選ぶ。"),
            ("第7〜8コマ", "AIが下書きを示し、店主が自分の言葉へ直す。AIが伝わりやすい言い回しを添える。"),
            ("第9〜10コマ", "店主がスマホから投稿する。翌日の営業中、気づいたことをメモに書く。"),
        ],
    },
    "invoice": {
        "title": "毎月変わる、あの請求書",
        "pages": [
            ("第1〜2コマ", "月末の夜、代表が支払日のカレンダーを見て、請求書メールを遡る。"),
            ("第3〜4コマ", "ゆりんが後ろ姿でパソコンを差し出す。代表が請求書メールの悩みを話し始める。"),
            ("第5〜6コマ", "AIが対象にするメールの種類を3つ示し、代表が請求書メールを選ぶ。"),
            ("第7〜8コマ", "AIが検出・保存・通知の仕組みを示し、代表が驚きながら表情をゆるめる。"),
            ("第9〜10コマ", "代表がひとりで送信元と保存先を確認する。数日後、通知を見てパソコンで請求書を確かめる。"),
        ],
    },
    "mata-kono-shitsumon": {
        "title": "また、この質問",
        "pages": [
            ("第1〜3コマ", "接客の合間に同じ質問の通知が届き、店長が過去の返信を探す。ゆりんが後ろ姿でパソコンを差し出す。"),
            ("第4〜5コマ", "店長が繰り返し届く質問の悩みを話し、AIが整理の選択肢を3つ示す。"),
            ("第6〜8コマ", "店長がよくある質問から片付けることを選び、AIが下書きを示す。駐車場には地図も要ると気づく。"),
            ("第9〜10コマ", "店長が営業時間と駐車場の案内を確認して自分の言葉へ直す。数日後、個別相談に落ち着いて向き合う。"),
        ],
    },
    "what-to-post": {
        "title": "写真の前で、手が止まる",
        "pages": [
            ("第1〜2コマ", "開店前。店主が商品を撮影し「入荷しました」と入力したまま、文章にすることが苦手で手が止まる。"),
            ("第3〜4コマ", "ゆりんが後ろ姿でパソコンを差し出す。店主が商品にかけた想いや工夫を話し始める。"),
            ("第5〜6コマ", "AIが3つの投稿候補を示し、店主が店主のこだわり・視点を選ぶ。"),
            ("第7〜8コマ", "AIが下書きを作り、店主が自分の言葉に書き換える。AIが伝わりやすい言い回しを添える。"),
            ("第9〜10コマ", "店主が投稿案と写真を見比べて投稿する。翌日、開店準備へ戻る。"),
        ],
    },
    "admin-overload": {
        "title": "明日の準備が、また明日になる",
        "pages": [
            ("第1〜2コマ", "閉店後。代表が明日の仕入れを考えたいが、今日の事務がまだ残っている。"),
            ("第3〜4コマ", "ゆりんが後ろ姿でパソコンを差し出す。代表が事務と明日の仕入れの両方を抱えていることを話す。"),
            ("第5〜6コマ", "AIが仕分けを提案し、代表が今日残っている作業を全部話し始める。"),
            ("第7〜8コマ", "AIが「AIにできること」と「代表の判断が必要なこと」に仕分け、代表が気づく。"),
            ("第9〜10コマ", "AIが今後の使い方を伝える。数日後、代表が事務に追われず明日の仕入れに向き合えるようになる。"),
        ],
    },
    "many-inboxes": {
        "title": "通知が鳴る場所が、多すぎる",
        "pages": [
            ("第1〜2コマ", "接客の合間に通知が届く。店長がメール・LINE・フォームを順番に開き直す。"),
            ("第3〜4コマ", "ゆりんが後ろ姿でパソコンを差し出す。店長が届く場所と連絡の種類を話す。"),
            ("第5〜6コマ", "AIが3つの選択肢を示し、店長が返信前・返信済みを一覧で見ることを選ぶ。"),
            ("第7〜8コマ", "AIが自動でチェックがつく仕組みを提案し、店長がいちいち覚えなくていいと気づく。"),
            ("第9〜10コマ", "AIが今後の使い方を伝える。数日後、店長が返信漏れの不安から解放される。"),
        ],
    },
}


def build_html(slug, pages):
    """comic-pages ブロックのHTMLを組み立てる。"""
    out = [
        '<div class="comic-pages">',
        '<p class="comic-pages__hint">画像はタップすると大きく表示できます。</p>',
    ]
    for i, (label, desc) in enumerate(pages, start=1):
        src = f"../../assets/images/stories/{slug}/page-{i}.jpg"
        # コマ番号と拡大の案内は画面に出さず、リンクの読み上げ名として持たせる。
        # 縦に読み進める流れを、余白やラベルで切らないため。
        out.append(
            '<figure class="comic-page">'
            f'<a class="comic-page__zoom" href="{src}" target="_blank" rel="noopener noreferrer" '
            f'aria-label="{label}を拡大して見る（画像を新しいタブで開きます）">'
            f'<img src="{src}" width="{IMG_W}" height="{IMG_H}" '
            f'loading="lazy" decoding="async" alt="{label}。{desc}" />'
            "</a></figure>"
        )
    out.append("</div>")
    return "".join(out)


def update_story(slug, conf):
    path = os.path.join(ROOT, "stories", slug, "index.html")
    if not os.path.exists(path):
        print(f"  {slug}: index.html が見つかりません（スキップ）")
        return False

    with open(path, encoding="utf-8") as f:
        html = f.read()

    new_block = build_html(slug, conf["pages"])

    # すでにページ判型なら差し替え、旧い10コマ仮枠ならまとめて置き換える。
    if '<div class="comic-pages">' in html:
        updated = re.sub(
            r'<div class="comic-pages">.*?</div>\s*(?=<details)',
            new_block,
            html,
            flags=re.S,
        )
    else:
        scenes = re.findall(r'<section class="comic-scene".*?</section>', html, re.S)
        if not scenes:
            print(f"  {slug}: 漫画ブロックを見つけられませんでした（スキップ）")
            return False
        start = html.index(scenes[0])
        end = html.index(scenes[-1]) + len(scenes[-1])
        updated = html[:start] + new_block + html[end:]
        updated = updated.replace(
            '<div aria-label="10コマ漫画の開発用仮表示">', '<div aria-label="10コマ漫画">'
        )

    if updated == html:
        print(f"  {slug}: 変更なし")
        return False

    with open(path, "w", encoding="utf-8") as f:
        f.write(updated)
    print(f"  {slug}（{conf['title']}）: {len(conf['pages'])}ページで更新")
    return True


def main():
    targets = sys.argv[1:] or list(STORIES)
    unknown = [t for t in targets if t not in STORIES]
    if unknown:
        print(f"知らない話です: {', '.join(unknown)}")
        print(f"指定できるのは: {', '.join(STORIES)}")
        return 1

    print("漫画ページのHTMLを生成します")
    changed = 0
    for slug in targets:
        if update_story(slug, STORIES[slug]):
            changed += 1

    print(f"\n{changed}話を更新しました。")
    if changed:
        print("続けて次を実行してください。")
        print("  python3 scripts/bump_asset_version.py 20260819-変更内容がわかる名前")
        print("  python3 scripts/check_consistency.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
