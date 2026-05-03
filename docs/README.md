# docs/

このディレクトリは README やソースから参照される **画像・GIF・追加ドキュメント** の置き場です。

## 推奨ファイル

| ファイル名 | 用途 | サイズ目安 |
| --- | --- | --- |
| `screenshot.png` | README のヒーロー画像 (静止画) | 横 1280〜1920px、~500KB 以下 |
| `demo.gif` | README に貼るデモ動画 (GIF) | 横 800〜1200px、~5MB 以下 |
| `architecture.png` | システム構成図 (任意) | — |

## スクリーンショットの撮り方

1. `npm run dev` でアプリを起動
2. 相談を1回投げて Council の発言が出ている状態にする
3. ブラウザで全画面表示にする (F11)
4. Windows: `Win + Shift + S` → 領域選択 → クリップボードコピー → ペイントなどに貼って PNG 保存
5. macOS: `Cmd + Shift + 4` → 領域選択 → デスクトップに自動保存
6. このディレクトリに `screenshot.png` として置く

## GIF の作り方 (任意)

- Windows: [ScreenToGif](https://www.screentogif.com/) (無料)
- macOS: QuickTime で動画録画 → [Gifski](https://gif.ski/) で GIF 化
- どちらも 5〜10秒、800〜1200px 横幅、~5MB 以下を目安に
