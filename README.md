# WiiPhone

スマホのジャイロセンサーを利用して、WiiリモコンのようにPCのマウスを操作できるシステムです。

## 特徴
- **フロントエンド**: HTML/CSS/JSのみの静的ファイル。Cloudflare Pages等にデプロイして即利用可能。
- **バックエンド**: Python実装。Windows(`ctypes`)およびLinux Wayland(`evdev`/`uinput`)のネイティブAPIを直接叩き、高速に動作します。
- **セキュリティ**: 起動ごとにランダムなトークンを生成し、WebSocket接続時に認証を行います。

---

## サーバー (PC側) のセットアップ

Python 3.11以上が必要です。

### Windows の場合
1. リポジトリをクローンまたはダウンロードします。
2. コマンドプロンプトまたはPowerShellで `server` フォルダに移動します。
3. 依存ライブラリをインストールします。
   ```bash
   pip install -r requirements.txt

### Linux の場合
