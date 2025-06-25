## clickup_to_calender

このアプリは、週表示カレンダー形式でタスクを管理し、ClickUpと連携してタスクの時間記録をワンクリックで送信できるWebアプリです。

---

## 1. 必要な環境

- Python 3.10 以上  
- pip    
- ClickUpアカウント（APIトークン取得のため）  

---

## 2. セットアップ手順

### 2.1. リポジトリのダウンロード

```bash
git clone https://github.com/TakuroOhashi-dmp/calendar-to-clickup.git
cd calendar-to-clickup
````

### 2.2. Pythonパッケージのインストール

```bash
pip install -r requirements.txt
```

### 2.3. データベースの初期化（初回のみ）

初回起動時に自動で `src/database/app.db` が作成されます。特別な操作は不要です。

---

## 3. サーバーの起動

```bash
python app.py
```

デフォルトで [http://localhost:5000](http://localhost:5000) で起動します。

---

## 4. Webアプリへのアクセス

ブラウザで [http://localhost:5000](http://localhost:5000) にアクセスしてください。

---

## 5. 初期設定・使い方

### 5.1. ClickUp連携の設定

* 画面右上の「ClickUp設定」ボタンをクリック
* ClickUpの「APIトークン」「チームID」「リストID」を入力し「保存」
* APIトークンは ClickUp の「設定 > Apps > APIトークン」から取得できます
* チームID・リストIDもClickUpのWeb画面から確認できます

### 5.2. タスクの作成・編集

* カレンダー上をドラッグしてタスクを作成
* タスクをクリックで編集・削除
* 30分単位でタスクを作成・調整可能
* タスクの上下端をドラッグで30分単位で時間を伸縮可能

### 5.3. ClickUpへの同期

* タスク作成・編集時にClickUpタスクを紐付け可能
* 「ClickUpに同期」ボタンでそのタスクのみClickUpに時間記録を送信
* 画面右下の「この月のタスクをすべてClickUpに同期」ボタンで、未同期のタスクのみを一覧で確認し、一括同期できます

### 5.4. CSV出力

* 「CSV出力」ボタンで今月のタスクをCSV形式でダウンロード可能

---

## 6. 注意事項

* タスク情報は各ユーザーのブラウザのLocalStorageに保存されます（サーバーDBには保存されません）
* ClickUp APIトークン等は他人に共有しないでください

---

## 7. よくあるトラブル

### ClickUp連携がうまくいかない場合

* APIトークンやIDが正しいか再確認してください
* サーバーのコンソールやブラウザの開発者ツールでエラー内容を確認してください

### カレンダーが表示されない場合

* サーバーを再起動し、ブラウザのキャッシュをクリアして再読み込みしてください

---

## 8. 開発・カスタマイズ

* サーバー側のコードは `src/routes/` 以下
* フロントエンドは `src/static/` 以下（`index.html`, `script.js`, `styles.css`）
