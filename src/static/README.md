# カレンダータスク管理システム（ClickUp連携版）

## 概要
ドラッグ操作でタスクを作成できるカレンダー形式のタスク管理システムです。
ClickUpとの連携機能により、カレンダー上で作成したタスクをワンクリックでClickUpに時間記録として送信できます。

## 主な機能
- **週表示カレンダー**: 直感的な週表示でタスクを管理
- **ドラッグ操作**: カレンダー上をドラッグしてタスクを簡単作成
- **タスク編集・削除**: 作成済みタスクのクリックで編集・削除
- **ローカルストレージ**: ブラウザにデータを自動保存
- **CSV出力**: 月単位でタスクデータをCSV形式で出力
- **ClickUp連携**: タスクをClickUpに自動同期
  - ClickUpタスク一覧の取得・表示
  - ワンクリックでの時間記録作成

## 使用方法

### 基本操作
1. `index.html`をブラウザで開く
2. カレンダー上をドラッグしてタスクを作成
3. タスクブロックをクリックして編集・削除
4. 「CSV出力」ボタンで月単位のデータをダウンロード

### ClickUp連携設定
1. 「ClickUp設定」ボタンをクリック
2. 以下の情報を入力：
   - **APIトークン**: ClickUpの個人用APIトークン
   - **チームID**: ClickUpのチームID
   - **リストID**: 時間記録を作成するリストのID
3. 「保存」ボタンで設定を保存

### ClickUp APIトークンの取得方法
1. ClickUpにログイン
2. 右上のプロフィール → 「Settings」
3. 「Apps」タブ → 「API」
4. 「Generate」ボタンでAPIトークンを生成

### チームIDとリストIDの取得方法
1. ClickUpでチーム/リストのURLを確認
2. URL例: `https://app.clickup.com/123456/v/li/987654`
   - チームID: `123456`
   - リストID: `987654`

### ClickUpへの時間記録
1. タスクを作成または編集
2. 「ClickUpタスク」プルダウンから対象タスクを選択
3. 「ClickUpに同期」ボタンをクリック
4. 自動的にClickUpに時間記録が作成されます

## バックエンドサーバー
ClickUp連携機能を使用するには、付属のFlaskバックエンドサーバーを起動する必要があります。

### サーバー起動方法
```bash
cd clickup-calendar-backend
source venv/bin/activate
python src/main.py
```

サーバーは `http://localhost:5000` で起動します。

## ファイル構成
```
calendar-task-manager-enhanced/
├── index.html          # メインHTMLファイル
├── styles.css          # スタイルシート
├── script.js           # JavaScript（ClickUp連携機能含む）
└── README.md           # このファイル

clickup-calendar-backend/
├── src/
│   ├── main.py         # Flaskアプリケーション
│   └── routes/
│       └── clickup.py  # ClickUp API連携ルート
├── requirements.txt    # Python依存関係
└── venv/              # Python仮想環境
```

## 技術仕様
- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **バックエンド**: Python Flask
- **データ保存**: ブラウザのローカルストレージ
- **外部API**: ClickUp REST API v2
- **対応ブラウザ**: モダンブラウザ（Chrome, Firefox, Safari, Edge）

## CSV出力形式
```csv
日付,タスク名,開始時刻,終了時刻,
2025/6/2,No.122 Fleet management investigation,10:00,15:00,
```

## 注意事項
- ClickUp連携機能を使用するにはインターネット接続が必要です
- APIトークンは安全に管理してください
- バックエンドサーバーはローカル環境でのみ動作します
- データはブラウザのローカルストレージに保存されるため、ブラウザデータを削除すると失われます

## トラブルシューティング
- **ClickUpタスクが表示されない**: API設定を確認し、「更新」ボタンをクリック
- **同期エラー**: APIトークンとID設定を再確認
- **バックエンドエラー**: サーバーが起動しているか確認（`http://localhost:5000`）

