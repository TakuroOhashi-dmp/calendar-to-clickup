## clickup_to_calender

06/26 - UPDATE
URLをclickするだけで行けるようになりました。
あとは詳しい人が好きな場所にサーバーを立てるだけで、URLを知っているユーザーはIDとPASSを登録し、利用できます。

ユーザー情報はハッシュにより暗号化されるので、導入者は知りえません。
clickupからカレンダーに逆輸入することもできるので、初めて使う際はぜひ押してみてください。



このアプリは、週表示カレンダー形式でタスクを管理し、ClickUpと連携してタスクの時間記録をワンクリックで送信できるWebアプリです。

---
## 簡単な説明
- Web上のカレンダーに記録したタスクを、月末にワンボタンでその月の仕事内容をclickupに送信できます。
- このアプリから送信されるタスクは重複して記録されません。
![image](https://github.com/user-attachments/assets/f76c5ed5-712c-405d-a08a-70bbfd47c1b2)

![image](https://github.com/user-attachments/assets/3e123b61-6062-4cc9-92ad-82945d68bbdc)
- まずは画面最下部のclickup設定を押し、APIキーとリストID,チームIDを入力しましょう。
  - APIキーはclickup -> 右上のユーザーアイコン -> Settings -> Appsから取得できます。
  - リストID,チームIDはタスク一覧を開いた際のURL部分に書いてある、それぞれ8桁・13桁の数字となっています。
  - https: //app.clickup.com/**チームID**/v/l/6-**リストID**-1
- タスクの記録は任意の日付時間をドラッグドロップで実行できます。
- タイトルと、このタスクがclickup上ではどれにあたるかを指定し、保存します。
- 月末に右下のボタンを押すだけで、その月の**未同期タスク**がすべてclickupのTime trackingに送信されます。
- clickupに未送信の場合はインジケーターが黄色〇、送信済みは緑〇となります。
- 送信されるのは、黄色の〇で表示されるタスクのみなので、一日ごとに右下のボタンを押しても構いません。
![image](https://github.com/user-attachments/assets/f3f24d3f-0acd-45f4-977f-7625ae53d816)

