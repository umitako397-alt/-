# AIごみ分別ナビ（GitHub & Cloudflare Pages 対応版）

## フォルダ構成
- `index.html` : フロントエンド本体（APIキーを一切含まない安全版）
- `functions/api/config.js` : Google Maps JavaScript SDK 読み込み用設定API
- `functions/api/gemini.js` : Gemini API 中継プロキシ（`GEMINI_API_KEY` をサーバー側で付与）
- `functions/api/routes.js` : Google Routes API 中継プロキシ（`GOOGLE_MAPS_API_KEY` をサーバー側で付与）
- `.gitignore` : ローカル環境変数ファイル（`.dev.vars`）をGitHubへ誤送信しないための除外設定
- `.dev.vars.example` : ローカル開発用環境変数のひな形

## Cloudflare Pages でのデプロイ＆環境変数設定手順
1. このフォルダの中身をそのまま GitHub リポジトリのルートにプッシュします。
2. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** からリポジトリを選択します。
3. **ビルド設定**はフレームワークプリセット「なし（None）」、ビルドコマンド空欄、ビルド出力ディレクトリ `/` のままデプロイします（`functions/` ディレクトリが自動的に Cloudflare Pages Functions として認識されます）。
4. デプロイ後、Cloudflare Pages プロジェクトの **Settings（設定）** → **Variables and Secrets（環境変数）** で以下を追加し、再デプロイ（Retry deployment）します：
   - `GEMINI_API_KEY`（種類: **Secret / 暗号化**）：Google AI Studio で発行した Gemini API キー
   - `GOOGLE_MAPS_API_KEY`（種類: **Secret / 暗号化**）：Google Cloud Console で発行した Google Maps API キー（Maps JavaScript API / Routes API 有効）
