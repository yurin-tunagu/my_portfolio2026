# フォントのライセンスと配信方針

確認日：2026-08-17

## 使用フォント

### Zen Kaku Gothic New

- 用途：見出し、ナビゲーション、ボタン
- 使用ウェイト：500 / 700
- ライセンス：SIL Open Font License 1.1
- 公式ソース：<https://github.com/googlefonts/zen-kakugothic>

### Noto Sans JP

- 用途：本文、フォーム、注釈
- 使用ウェイト：400 / 500
- ライセンス：SIL Open Font License 1.1
- 公式ライセンス：<https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE>

## 配信方針

- ローカルプレビューではGoogle Fonts CSS APIから配信する。
- `display=swap`を指定し、フォント取得中も本文を表示する。
- Google Fontsへ接続できない場合は、`Hiragino Kaku Gothic ProN`、`Yu Gothic`、`sans-serif`の順で代替する。
- 本番公開前に、外部配信の継続またはセルフホストを、表示速度とプライバシーポリシーに照らして決定する。
- セルフホストへ変更する場合は、OFL本文と著作権表示をフォントファイルとともに保管する。
