# WiiPhone

スマートフォンをWiiリモコンのように使用し、PCのマウスを遠隔操作するシステムです。

スマホのジャイロセンサーとトラックパッド操作を利用し、WindowsおよびLinux(Wayland)上のカーソル操作を実現します。


# 主な機能

## ジャイロマウス

スマホの傾きを利用してカーソルを移動します。

* センタリング対応
* 感度調整
* デッドゾーン設定
* ローパスフィルタ
* 左右反転
* 上下反転

## トラックパッド

画面中央のトラックパッド領域を使用します。

### 1本指

カーソル移動

### 2本指

スクロール

## マウスボタン

* Left Click
* Right Click
* Middle Click

押している間は押下状態を維持します。

## 一時停止

Pauseボタンで全入力送信を停止します。

Resume時には現在の姿勢を自動的にセンタリングします。

## セキュリティ

サーバー起動時にランダムトークンを生成します。

接続時にトークン認証を行い、認証失敗時は即切断されます。

# システム要件

## サーバー

* Python 3.11以上

### Windows

* Windows 10
* Windows 11

### Linux

* Wayland
* uinput
* evdev

X11専用実装は使用していないのでWaylandでも使えます。

# 使い方

## 1. リポジトリ取得

リポジトリをZIPダウンロード

または

```bash
git clone https://github.com/Kagami-omochi/WiiPhone.git
cd WiiPhone
```

## 2. Python依存関係

```bash
cd server
pip install -r requirements.txt
```

<details>
  <summary>Windowsセットアップ</summary>
  
  Windowsの場合は`main.py`を実行するだけです。
</details>

<details>
  <summary>Linuxセットアップ</summary>
  Linuxの場合は基本、`main.py`を実行するだけで動きますが、Linux環境（Wayland）で仮想マウスをエミュレートするため、`uinput`のカーネルモジュールと権限の設定が必要になる可能性があります。  
   
  その場合は以下の手順を実行してください。

  ## uinput有効化

  ```bash
  sudo modprobe uinput
  ```

  確認:

  ```bash
  ls /dev/uinput
  ```

  ## udevルール

  ```bash
  sudo tee /etc/udev/rules.d/99-uinput.rules << EOF
  KERNEL=="uinput", MODE="0660", GROUP="input"
  EOF
  ```

  ## グループ追加

  ```bash
  sudo usermod -aG input $USER
  ```

  再ログインしてください。
</details>

# 接続方法

1. サーバーを起動
```bash
python main.py
```

起動後に以下が表示されます。

(例)
```text
Listening on ws://192.168.1.10:8765

AUTH TOKEN:
ab12cd34
```

2. スマホで[wiiphone.pages.dev](https://wiiphone.pages.dev/)を開く

3. サーバーに表示されている接続情報を入力

4. Connectを押す

# 操作方法

## ジャイロ操作

スマホを傾けるとカーソルが移動します。

## トラックパッド

### 1本指

カーソル移動

### 2本指

スクロール

## 左右反転

X軸を反転します。

## 上下反転

Y軸を反転します。

## Pause

入力送信を停止します。

スマホを持ち直す際に便利です。

## Resume

入力送信を再開します。

再開時に自動センタリングされます。

---

# トラブルシューティング

## センサーが取得できない

iPhoneの場合

設定 → Safari → モーションと画面の向きへのアクセス

を許可してください。

## 接続できない

以下を確認してください。

* PCとスマホが同じネットワーク
* ポート8765が開放されている
* ファイアウォールでブロックされていない

## Linuxでマウスが動かない

```bash
ls -l /dev/uinput
```

権限を確認してください。

## Waylandで動かない

Waylandコンポジタによっては仮想入力デバイスを制限している場合があります。

以下で動作確認済みです。

* Hyprland
* Sway
* KDE Plasma Wayland

# セキュリティ注意事項

このソフトは接続したクライアントにPC操作権限を与えます。ご利用の際はご注意ください。
