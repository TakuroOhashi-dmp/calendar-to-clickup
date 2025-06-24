class CalendarTaskManager {
    constructor() {
        this.currentDate = new Date();
        this.tasks = this.loadTasks();
        this.selectedTask = null;
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.selectionStart = null;
        this.selectionEnd = null;
        this.resizingTask = null;
        this.resizingDirection = null; // 'top' or 'bottom'
        this.resizeStartY = 0;
        this.resizeStartTime = null;

        // ClickUp関連の設定
        this.clickupConfig = this.loadClickupConfig();
        this.clickupTasks = [];
        this.backendUrl = 'http://localhost:5000';

        this.init();
    }

    init() {
        this.renderCalendar();
        this.bindEvents();
        this.updateDateRange();
        this.updateClickupStatus();
    }

    // カレンダーの描画
    renderCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = '';

        const startOfWeek = this.getStartOfWeek(this.currentDate);

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);

            const dayColumn = this.createDayColumn(date);
            calendarGrid.appendChild(dayColumn);
        }

        this.renderTasks();
    }

    // 日付列の作成
    createDayColumn(date) {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.dataset.date = this.formatDate(date);

        // 今日の日付をハイライト
        if (this.isToday(date)) {
            dayColumn.classList.add('today');
        }

        // ヘッダー
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';

        const dayName = document.createElement('div');
        dayName.className = 'day-name';
        dayName.textContent = this.getDayName(date);

        const dayDate = document.createElement('div');
        dayDate.className = 'day-date';
        dayDate.textContent = date.getDate();

        dayHeader.appendChild(dayName);
        dayHeader.appendChild(dayDate);
        dayColumn.appendChild(dayHeader);

        // 時間グリッド（30分単位）
        const timeGrid = document.createElement('div');
        timeGrid.className = 'time-grid';

        for (let hour = 6; hour <= 22; hour++) {
            for (let min = 0; min < 60; min += 30) {
                const hourSlot = document.createElement('div');
                hourSlot.className = 'hour-slot';
                hourSlot.dataset.hour = hour;
                hourSlot.dataset.minute = min;
                hourSlot.dataset.date = this.formatDate(date);
                timeGrid.appendChild(hourSlot);
            }
        }

        dayColumn.appendChild(timeGrid);
        return dayColumn;
    }

    // タスクの描画
    renderTasks() {
        // 既存のタスクブロックを削除
        document.querySelectorAll('.task-block').forEach(block => block.remove());

        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        this.tasks.forEach(task => {
            const taskDate = new Date(task.date);
            if (taskDate >= startOfWeek && taskDate <= endOfWeek) {
                this.renderTask(task);
            }
        });
    }

    // 個別タスクの描画
    renderTask(task) {
        const dateStr = this.formatDate(new Date(task.date));
        const dayColumn = document.querySelector(`[data-date="${dateStr}"] .time-grid`);

        if (!dayColumn) return;

        const taskBlock = document.createElement('div');
        taskBlock.className = 'task-block';
        taskBlock.dataset.taskId = task.id;

        const startTime = this.parseTime(task.startTime);
        const endTime = this.parseTime(task.endTime);
        const duration = (endTime - startTime) / (1000 * 60); // 分単位

        // 位置とサイズの計算（30分=30px）
        const startHour = startTime.getHours();
        const startMinute = startTime.getMinutes();
        const topOffset = ((startHour * 60 + startMinute) - 360) / 30 * 30; // 6:00=360分
        const height = duration / 30 * 30;

        taskBlock.style.top = `${topOffset}px`;
        taskBlock.style.height = `${height}px`;
        taskBlock.style.left = '2px';
        taskBlock.style.right = '2px';

        // タスク内容
        if (duration === 30) {
            // 30分タスクは1行で
            const oneLine = document.createElement('div');
            oneLine.className = 'task-oneline';
            oneLine.textContent = `${task.startTime} ${task.name}`;
            taskBlock.appendChild(oneLine);
        } else {
            // 1時間以上は従来通り
            const taskTime = document.createElement('div');
            taskTime.className = 'task-time';
            taskTime.textContent = `${task.startTime} - ${task.endTime}`;

            const taskName = document.createElement('div');
            taskName.className = 'task-name';
            taskName.textContent = task.name;

            taskBlock.appendChild(taskTime);
            taskBlock.appendChild(taskName);
        }
        
        const handleTop = document.createElement('div');
        handleTop.className = 'task-resize-handle top';
        taskBlock.appendChild(handleTop);

        const handleBottom = document.createElement('div');
        handleBottom.className = 'task-resize-handle bottom';
        taskBlock.appendChild(handleBottom);

        // --- リサイズイベント ---
        handleTop.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startResizing(task, 'top', e);
        });
        handleBottom.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startResizing(task, 'bottom', e);
        });

        // インジケータ追加
        const indicator = document.createElement('span');
        indicator.className = 'clickup-indicator';

        if (!task.clickupTaskId) {
            indicator.classList.add('indicator-none');
        } else if (task.clickupTaskId && !task.clickupSynced) {
            indicator.classList.add('indicator-unsynced');
        } else if (task.clickupTaskId && task.clickupSynced) {
            indicator.classList.add('indicator-synced');
        }
        taskBlock.appendChild(indicator);


        dayColumn.appendChild(taskBlock);
    }

    startResizing(task, direction, e) {
        this.resizingTask = task;
        this.resizingDirection = direction;
        this.resizeStartY = e.clientY;
        this.resizeStartTime = {
            start: task.startTime,
            end: task.endTime
        };
        document.body.classList.add('resizing');
        document.addEventListener('mousemove', this.handleResizeMove);
        document.addEventListener('mouseup', this.handleResizeUp);
        // ハイライト
        const taskBlock = document.querySelector(`.task-block[data-task-id="${task.id}"]`);
        if (taskBlock) taskBlock.classList.add('resizing');
    }

    handleResizeMove = (e) => {
        if (!this.resizingTask) return;
        const task = this.resizingTask;
        const direction = this.resizingDirection;
        const taskBlock = document.querySelector(`.task-block[data-task-id="${task.id}"]`);
        if (!taskBlock) return;

        const deltaY = e.clientY - this.resizeStartY;
        // 30pxごとに30分
        const steps = Math.round(deltaY / 30);
        let newStart = task.startTime;
        let newEnd = task.endTime;

        if (direction === 'top') {
            // 開始時刻を変更
            const [h, m] = this.resizeStartTime.start.split(':').map(Number);
            let total = h * 60 + m + steps * 30;
            // 下限: 終了時刻の30分前まで
            const [eh, em] = task.endTime.split(':').map(Number);
            const endTotal = eh * 60 + em;
            total = Math.min(total, endTotal - 30);
            total = Math.max(total, 6 * 60); // 6:00より前は不可
            const nh = Math.floor(total / 60);
            const nm = total % 60;
            newStart = `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
        } else if (direction === 'bottom') {
            // 終了時刻を変更
            const [h, m] = this.resizeStartTime.end.split(':').map(Number);
            let total = h * 60 + m + steps * 30;
            // 上限: 開始時刻の30分後まで
            const [sh, sm] = task.startTime.split(':').map(Number);
            const startTotal = sh * 60 + sm;
            total = Math.max(total, startTotal + 30);
            total = Math.min(total, 22 * 60); // 22:00より後は不可
            const nh = Math.floor(total / 60);
            const nm = total % 60;
            newEnd = `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
        }

        // 仮描画
        if (direction === 'top') {
            const startTime = this.parseTime(newStart);
            const endTime = this.parseTime(task.endTime);
            const duration = (endTime - startTime) / (1000 * 60);
            const startHour = startTime.getHours();
            const startMinute = startTime.getMinutes();
            const topOffset = ((startHour * 60 + startMinute) - 360) / 30 * 30;
            const height = duration / 30 * 30;
            taskBlock.style.top = `${topOffset}px`;
            taskBlock.style.height = `${height}px`;
        } else if (direction === 'bottom') {
            const startTime = this.parseTime(task.startTime);
            const endTime = this.parseTime(newEnd);
            const duration = (endTime - startTime) / (1000 * 60);
            const startHour = startTime.getHours();
            const startMinute = startTime.getMinutes();
            const topOffset = ((startHour * 60 + startMinute) - 360) / 30 * 30;
            const height = duration / 30 * 30;
            taskBlock.style.top = `${topOffset}px`;
            taskBlock.style.height = `${height}px`;
        }
        // 時間表示も仮更新
        const timeDiv = taskBlock.querySelector('.task-time');
        const oneLineDiv = taskBlock.querySelector('.task-oneline');
        if (timeDiv) timeDiv.textContent = `${direction === 'top' ? newStart : task.startTime} - ${direction === 'bottom' ? newEnd : task.endTime}`;
        if (oneLineDiv) oneLineDiv.textContent = `${direction === 'top' ? newStart : task.startTime} ${task.name}`;
    };

    handleResizeUp = (e) => {
        if (!this.resizingTask) return;
        const task = this.resizingTask;
        const direction = this.resizingDirection;
        const deltaY = e.clientY - this.resizeStartY;
        const steps = Math.round(deltaY / 30);

        let newStart = task.startTime;
        let newEnd = task.endTime;

        if (direction === 'top') {
            const [h, m] = this.resizeStartTime.start.split(':').map(Number);
            let total = h * 60 + m + steps * 30;
            const [eh, em] = task.endTime.split(':').map(Number);
            const endTotal = eh * 60 + em;
            total = Math.min(total, endTotal - 30);
            total = Math.max(total, 6 * 60);
            const nh = Math.floor(total / 60);
            const nm = total % 60;
            newStart = `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
        } else if (direction === 'bottom') {
            const [h, m] = this.resizeStartTime.end.split(':').map(Number);
            let total = h * 60 + m + steps * 30;
            const [sh, sm] = task.startTime.split(':').map(Number);
            const startTotal = sh * 60 + sm;
            total = Math.max(total, startTotal + 30);
            total = Math.min(total, 22 * 60);
            const nh = Math.floor(total / 60);
            const nm = total % 60;
            newEnd = `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
        }

        // 変更を保存
        if (direction === 'top' && newStart !== task.startTime) {
            task.startTime = newStart;
        }
        if (direction === 'bottom' && newEnd !== task.endTime) {
            task.endTime = newEnd;
        }
        this.saveTasks();
        this.renderTasks();

        // 後処理
        this.resizingTask = null;
        this.resizingDirection = null;
        this.resizeStartY = 0;
        this.resizeStartTime = null;
        document.body.classList.remove('resizing');
        document.removeEventListener('mousemove', this.handleResizeMove);
        document.removeEventListener('mouseup', this.handleResizeUp);
    };


    // イベントバインディング
    bindEvents() {
        // ナビゲーション
        document.getElementById('prevWeek').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
            this.renderCalendar();
            this.updateDateRange();
        });

        document.getElementById('nextWeek').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
            this.renderCalendar();
            this.updateDateRange();
        });

        document.getElementById('todayBtn').addEventListener('click', () => {
            this.currentDate = new Date();
            this.renderCalendar();
            this.updateDateRange();
        });

        // ドラッグ選択
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // タスククリック
        document.addEventListener('click', this.handleTaskClick.bind(this));

        // モーダル
        this.bindModalEvents();

        // CSV出力
        document.getElementById('exportCsv').addEventListener('click', () => {
            this.exportToCSV();
        });

        // ClickUp設定
        document.getElementById('clickupConfig').addEventListener('click', () => {
            this.showClickupConfigModal();
        });

        // ClickUpタスク同期
        document.getElementById('syncAllToClickup').addEventListener('click', () => {
            this.syncAllTasksToClickup();
        });
    }

    // マウスダウンイベント
    handleMouseDown(e) {
        const hourSlot = e.target.closest('.hour-slot');
        if (!hourSlot) return;

        this.isDragging = true;
        this.selectionStart = {
            date: hourSlot.dataset.date,
            hour: parseInt(hourSlot.dataset.hour),
            minute: parseInt(hourSlot.dataset.minute),
            y: e.clientY
        };

        // 既存の選択範囲を削除
        document.querySelectorAll('.selection-highlight').forEach(el => el.remove());

        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.selectionStart) return;

        const hourSlot = e.target.closest('.hour-slot');
        if (!hourSlot || hourSlot.dataset.date !== this.selectionStart.date) return;

        this.selectionEnd = {
            date: hourSlot.dataset.date,
            hour: parseInt(hourSlot.dataset.hour),
            minute: parseInt(hourSlot.dataset.minute),
            y: e.clientY
        };

        this.updateSelectionHighlight();
    }

    // マウスアップイベント
    handleMouseUp(e) {
        if (!this.isDragging) return;

        this.isDragging = false;

        if (this.selectionStart && this.selectionEnd) {
            this.showTaskModal();
        }

        // 選択範囲をクリア
        setTimeout(() => {
            document.querySelectorAll('.selection-highlight').forEach(el => el.remove());
        }, 100);
    }

    // 選択範囲のハイライト更新
    updateSelectionHighlight() {
        if (!this.selectionStart || !this.selectionEnd) return;

        // 既存のハイライトを削除
        document.querySelectorAll('.selection-highlight').forEach(el => el.remove());

        // 開始・終了を分単位で比較
        const startTotal = this.selectionStart.hour * 60 + this.selectionStart.minute;
        const endTotal = this.selectionEnd.hour * 60 + this.selectionEnd.minute;
        const minTotal = Math.min(startTotal, endTotal);
        const maxTotal = Math.max(startTotal, endTotal);

        const dayColumn = document.querySelector(`[data-date="${this.selectionStart.date}"] .time-grid`);
        if (!dayColumn) return;

        const highlight = document.createElement('div');
        highlight.className = 'selection-highlight';

        const topOffset = ((minTotal - 360) / 30) * 30; // 6:00=360分
        const height = ((maxTotal - minTotal) + 30) / 30 * 30;

        highlight.style.top = `${topOffset}px`;
        highlight.style.height = `${height}px`;
        highlight.style.left = '2px';
        highlight.style.right = '2px';

        dayColumn.appendChild(highlight);
    }

    // タスククリックイベント
    handleTaskClick(e) {
        const taskBlock = e.target.closest('.task-block');
        if (!taskBlock) return;

        const taskId = taskBlock.dataset.taskId;
        this.selectedTask = this.tasks.find(task => task.id === taskId);

        if (this.selectedTask) {
            this.showTaskModal(true);
        }
    }

    // タスクモーダル表示
    showTaskModal(isEdit = false) {
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const deleteBtn = document.getElementById('deleteTask');
        const syncBtn = document.getElementById('syncToClickup');

        modalTitle.textContent = isEdit ? 'タスクを編集' : 'タスクを作成';
        deleteBtn.style.display = isEdit ? 'block' : 'none';
        syncBtn.style.display = isEdit ? 'block' : 'none';


        const parentSelect = document.getElementById('clickupParentTask');
        const childSelect = document.getElementById('clickupChildTask');
        const grandchildSelect = document.getElementById('clickupGrandchildTask');
        // いったん全てリセット
        parentSelect.value = '';
        childSelect.value = '';
        grandchildSelect.value = '';
        childSelect.style.display = 'none';
        grandchildSelect.style.display = 'none';

        // 編集時、clickupTaskIdに応じて選択状態を復元
        if (isEdit && this.selectedTask && this.selectedTask.clickupTaskId && this.clickupTasks.length > 0) {
            // 対象タスクを検索
            const selected = this.clickupTasks.find(t => t.id === this.selectedTask.clickupTaskId);
            if (selected) {
                // 親・子・孫のどれかを選択
                if (!selected.parent) {
                    // 親タスク
                    parentSelect.value = selected.id;
                } else {
                    // 子または孫
                    const parent = this.clickupTasks.find(t => t.id === selected.parent);
                    if (parent && !parent.parent) {
                        // 子タスク
                        parentSelect.value = parent.id;
                        // 子セレクトを表示・選択
                        childSelect.style.display = '';
                        // 子セレクトを再構築
                        childSelect.innerHTML = '<option value="">子タスクを選択</option>';
                        this.clickupTasks.filter(t => t.parent === parent.id).forEach(task => {
                            const option = document.createElement('option');
                            option.value = task.id;
                            option.textContent = task.name;
                            childSelect.appendChild(option);
                        });
                        childSelect.value = selected.id;
                    } else if (parent && parent.parent) {
                        // 孫タスク
                        const grandParent = this.clickupTasks.find(t => t.id === parent.parent);
                        if (grandParent) {
                            parentSelect.value = grandParent.id;
                            // 子セレクトを表示・選択
                            childSelect.style.display = '';
                            childSelect.innerHTML = '<option value="">子タスクを選択</option>';
                            this.clickupTasks.filter(t => t.parent === grandParent.id).forEach(task => {
                                const option = document.createElement('option');
                                option.value = task.id;
                                option.textContent = task.name;
                                childSelect.appendChild(option);
                            });
                            childSelect.value = parent.id;
                            // 孫セレクトを表示・選択
                            grandchildSelect.style.display = '';
                            grandchildSelect.innerHTML = '<option value="">孫タスクを選択</option>';
                            this.clickupTasks.filter(t => t.parent === parent.id).forEach(task => {
                                const option = document.createElement('option');
                                option.value = task.id;
                                option.textContent = task.name;
                                grandchildSelect.appendChild(option);
                            });
                            grandchildSelect.value = selected.id;
                        }
                    }
                }
            }
        }

        if (isEdit && this.selectedTask) {
            document.getElementById('taskName').value = this.selectedTask.name;
            document.getElementById('taskDate').value = this.selectedTask.date;
            document.getElementById('startTime').value = this.selectedTask.startTime;
            document.getElementById('endTime').value = this.selectedTask.endTime;
        } else if (this.selectionStart && this.selectionEnd) {
            // 30分単位で開始・終了を計算
            const startTotal = this.selectionStart.hour * 60 + this.selectionStart.minute;
            const endTotal = this.selectionEnd.hour * 60 + this.selectionEnd.minute;
            const minTotal = Math.min(startTotal, endTotal);
            const maxTotal = Math.max(startTotal, endTotal) + 30;

            const startHour = Math.floor(minTotal / 60);
            const startMinute = minTotal % 60;
            const endHour = Math.floor(maxTotal / 60);
            const endMinute = maxTotal % 60;

            document.getElementById('taskName').value = '';
            document.getElementById('taskDate').value = this.selectionStart.date;
            document.getElementById('startTime').value = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
            document.getElementById('endTime').value = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        }

        // ClickUpタスクが読み込まれていない場合は読み込む
        if (this.clickupTasks.length === 0 && this.clickupConfig.apiToken) {
            this.loadClickupTasks();
        }

        modal.style.display = 'block';
    }

    // モーダルイベント
    bindModalEvents() {
        const modal = document.getElementById('taskModal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelTask');
        const saveBtn = document.getElementById('saveTask');
        const deleteBtn = document.getElementById('deleteTask');
        const syncBtn = document.getElementById('syncToClickup');
        const refreshBtn = document.getElementById('refreshTasks');
        const form = document.getElementById('taskForm');

        const clearSelection = () => {
            modal.style.display = 'none';
            this.selectedTask = null;
            this.selectionStart = null;
            this.selectionEnd = null;
        };
        closeBtn.addEventListener('click', clearSelection);
        cancelBtn.addEventListener('click', clearSelection);

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                clearSelection();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        deleteBtn.addEventListener('click', () => {
            if (confirm('このタスクを削除しますか？')) {
                this.deleteTask();
            }
        });

        syncBtn.addEventListener('click', () => {
            this.syncToClickup();
        });

        refreshBtn.addEventListener('click', () => {
            this.loadClickupTasks();
        });

        // ClickUp設定モーダルのイベント
        this.bindClickupConfigEvents();
    }

    // タスク保存
    saveTask() {
        const name = document.getElementById('taskName').value.trim();
        const date = document.getElementById('taskDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        // ▼ 追加: ClickUpタスクIDの取得
        let clickupTaskId = '';
        const grandchildId = document.getElementById('clickupGrandchildTask').value;
        const childId = document.getElementById('clickupChildTask').value;
        const parentId = document.getElementById('clickupParentTask').value;
        if (grandchildId) {
            clickupTaskId = grandchildId;
        } else if (childId) {
            clickupTaskId = childId;
        } else if (parentId) {
            clickupTaskId = parentId;
        }

        if (!name || !date || !startTime || !endTime) {
            alert('すべての項目を入力してください。');
            return;
        }

        if (startTime >= endTime) {
            alert('終了時刻は開始時刻より後に設定してください。');
            return;
        }

        const task = {
            id: this.selectedTask ? this.selectedTask.id : this.generateId(),
            name,
            date,
            startTime,
            endTime,
            clickupTaskId,
            clickupSynced: false // 新規・編集時は未同期
        };

        if (this.selectedTask) {
            // 編集
            const index = this.tasks.findIndex(t => t.id === this.selectedTask.id);
            this.tasks[index] = task;
        } else {
            // 新規作成
            this.tasks.push(task);
        }

        this.saveTasks();
        this.renderTasks();

        document.getElementById('taskModal').style.display = 'none';
        this.selectedTask = null;
    }

    // タスク削除
    deleteTask() {
        if (!this.selectedTask) return;

        this.tasks = this.tasks.filter(task => task.id !== this.selectedTask.id);
        this.saveTasks();
        this.renderTasks();

        document.getElementById('taskModal').style.display = 'none';
        this.selectedTask = null;
    }

    // CSV出力
    exportToCSV() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;

        // 月の最初と最後の日を取得
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        // 該当月のタスクをフィルタリング
        const monthTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate >= firstDay && taskDate <= lastDay;
        });

        // CSVヘッダー
        let csv = '日付,タスク名,開始時刻,終了時刻,\n';

        // タスクデータを追加
        monthTasks.forEach(task => {
            const formattedDate = this.formatDateForCSV(new Date(task.date));
            csv += `${formattedDate},${task.name},${task.startTime},${task.endTime},\n`;
        });

        // 空行を追加（要件に合わせて）
        for (let i = 0; i < 6; i++) {
            csv += ',,,,\n';
        }

        // ファイルダウンロード
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `calendar_${year}_${month.toString().padStart(2, '0')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ユーティリティメソッド
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    getDayName(date) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateForCSV(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    updateDateRange() {
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];

        const startMonth = months[startOfWeek.getMonth()];
        const endMonth = months[endOfWeek.getMonth()];
        const year = startOfWeek.getFullYear();

        let dateRangeText;
        if (startMonth === endMonth) {
            dateRangeText = `${startMonth} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${year}`;
        } else {
            dateRangeText = `${startMonth} ${startOfWeek.getDate()} – ${endMonth} ${endOfWeek.getDate()}, ${year}`;
        }

        document.getElementById('dateRange').textContent = dateRangeText;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // ローカルストレージ
    loadTasks() {
        const saved = localStorage.getItem('calendarTasks');
        return saved ? JSON.parse(saved) : [];
    }

    saveTasks() {
        localStorage.setItem('calendarTasks', JSON.stringify(this.tasks));
    }

    // ClickUp設定の読み込み
    loadClickupConfig() {
        const config = localStorage.getItem('clickupConfig');
        return config ? JSON.parse(config) : {
            apiToken: '',
            teamId: '',
            listId: ''
        };
    }

    // ClickUp設定の保存
    saveClickupConfig(config) {
        localStorage.setItem('clickupConfig', JSON.stringify(config));
        this.clickupConfig = config;
        this.updateClickupStatus();
    }

    // ClickUp設定モーダルの表示
    showClickupConfigModal() {
        const modal = document.getElementById('clickupConfigModal');

        // 現在の設定値を入力フィールドに設定
        document.getElementById('apiToken').value = this.clickupConfig.apiToken || '';
        document.getElementById('teamId').value = this.clickupConfig.teamId || '';
        document.getElementById('listId').value = this.clickupConfig.listId || '';

        modal.style.display = 'block';
    }

    // ClickUp設定モーダルのイベント
    bindClickupConfigEvents() {
        const modal = document.getElementById('clickupConfigModal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelClickupConfig');
        const saveBtn = document.getElementById('saveClickupConfig');
        const form = document.getElementById('clickupConfigForm');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const config = {
                apiToken: document.getElementById('apiToken').value.trim(),
                teamId: document.getElementById('teamId').value.trim(),
                listId: document.getElementById('listId').value.trim()
            };

            if (!config.apiToken || !config.teamId || !config.listId) {
                alert('すべての項目を入力してください。');
                return;
            }

            this.saveClickupConfig(config);
            modal.style.display = 'none';

            // 設定保存後にタスクを読み込み
            this.loadClickupTasks();
        });
    }

    // ClickUpタスクの読み込み
    async loadClickupTasks() {
        if (!this.clickupConfig.apiToken || !this.clickupConfig.listId) {
            console.log('ClickUp設定が不完全です');
            return;
        }

        this.updateClickupStatus('loading');

        try {
            const response = await fetch(`${this.backendUrl}/api/clickup/tasks?list_id=${this.clickupConfig.listId}`, {
                headers: {
                    'X-ClickUp-Token': this.clickupConfig.apiToken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.clickupTasks = data.tasks || [];
            this.updateTaskDropdown();
            this.updateClickupStatus('connected');

        } catch (error) {
            console.error('ClickUpタスクの読み込みに失敗:', error);
            this.updateClickupStatus('disconnected');
            alert('ClickUpタスクの読み込みに失敗しました。設定を確認してください。');
        }
    }

    // タスクドロップダウンの更新
    updateTaskDropdown() {
        const parentSelect = document.getElementById('clickupParentTask');
        const childSelect = document.getElementById('clickupChildTask');
        const grandchildSelect = document.getElementById('clickupGrandchildTask');

        // 初期化
        parentSelect.innerHTML = '<option value="">親タスクを選択</option>';
        childSelect.innerHTML = '<option value="">子タスクを選択</option>';
        grandchildSelect.innerHTML = '<option value="">孫タスクを選択</option>';
        childSelect.style.display = 'none';
        grandchildSelect.style.display = 'none';

        // 親タスクのみ抽出
        const parents = this.clickupTasks.filter(t => !t.parent);
        parents.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.name;
            parentSelect.appendChild(option);
        });

        // 親タスク選択時
        parentSelect.onchange = () => {
            const parentId = parentSelect.value;
            childSelect.innerHTML = '<option value="">子タスクを選択</option>';
            grandchildSelect.innerHTML = '<option value="">孫タスクを選択</option>';
            grandchildSelect.style.display = 'none';

            if (!parentId) {
                childSelect.style.display = 'none';
                return;
            }

            // 子タスク抽出
            const children = this.clickupTasks.filter(t => t.parent === parentId);
            if (children.length > 0) {
                childSelect.style.display = '';
                children.forEach(task => {
                    const option = document.createElement('option');
                    option.value = task.id;
                    option.textContent = task.name;
                    childSelect.appendChild(option);
                });
            } else {
                childSelect.style.display = 'none';
            }
        };

        // 子タスク選択時
        childSelect.onchange = () => {
            const childId = childSelect.value;
            grandchildSelect.innerHTML = '<option value="">孫タスクを選択</option>';

            if (!childId) {
                grandchildSelect.style.display = 'none';
                return;
            }

            // 孫タスク抽出
            const grandchildren = this.clickupTasks.filter(t => t.parent === childId);
            if (grandchildren.length > 0) {
                grandchildSelect.style.display = '';
                grandchildren.forEach(task => {
                    const option = document.createElement('option');
                    option.value = task.id;
                    option.textContent = task.name;
                    grandchildSelect.appendChild(option);
                });
            } else {
                grandchildSelect.style.display = 'none';
            }
        };
    }

    // ClickUp接続状態の更新
    updateClickupStatus(status = null) {
        // 既存のステータス表示を削除
        const existingStatus = document.querySelector('.clickup-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        if (!status) {
            if (this.clickupConfig.apiToken && this.clickupConfig.teamId && this.clickupConfig.listId) {
                status = 'connected';
            } else {
                status = 'disconnected';
            }
        }

        const statusDiv = document.createElement('div');
        statusDiv.className = `clickup-status ${status}`;

        switch (status) {
            case 'connected':
                statusDiv.textContent = 'ClickUp接続済み';
                break;
            case 'loading':
                statusDiv.textContent = 'ClickUp読み込み中...';
                break;
            case 'disconnected':
            default:
                statusDiv.textContent = 'ClickUp未接続';
                break;
        }

        document.body.appendChild(statusDiv);
    }

    // ClickUpに同期
    async syncToClickup() {
        if (!this.selectedTask) {
            alert('同期するタスクが選択されていません。');
            return;
        }

        // 一番下で選択されているタスクIDを取得
        let clickupTaskId = '';
        const grandchildId = document.getElementById('clickupGrandchildTask').value;
        const childId = document.getElementById('clickupChildTask').value;
        const parentId = document.getElementById('clickupParentTask').value;
        if (grandchildId) {
            clickupTaskId = grandchildId;
        } else if (childId) {
            clickupTaskId = childId;
        } else if (parentId) {
            clickupTaskId = parentId;
        }

        if (!clickupTaskId) {
            alert('ClickUpタスクを選択してください。');
            return;
        }

        if (!this.clickupConfig.apiToken || !this.clickupConfig.teamId) {
            alert('ClickUp設定が不完全です。');
            return;
        }

        try {
            const date = this.selectedTask.date;
            const startTime = this.selectedTask.startTime;
            const endTime = this.selectedTask.endTime;
            const jst = `${date}T${startTime}:00+09:00`; // 日本時間として指定
            const startDateTime = new Date(jst);
            const endDateTime = new Date(`${date}T${endTime}:00+09:00`);
            const duration = endDateTime.getTime() - startDateTime.getTime(); // ミリ秒

            const payload = {
                team_id: this.clickupConfig.teamId,
                task_id: clickupTaskId,
                start_time: startDateTime.getTime(), // UTCエポック
                duration: duration
            };

            const response = await fetch(`${this.backendUrl}/api/clickup/time-entry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ClickUp-Token': this.clickupConfig.apiToken
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // --- 追加: 同期済みフラグを立てる ---
            if (this.selectedTask) {
                this.selectedTask.clickupSynced = true;
                this.saveTasks();
                this.renderTasks();
            }

            const result = await response.json();
            alert('ClickUpに時間記録を作成しました！');

            // モーダルを閉じる
            document.getElementById('taskModal').style.display = 'none';
            this.selectedTask = null;

        } catch (error) {
            console.error('ClickUp同期エラー:', error);
            alert('ClickUpへの同期に失敗しました。');
        }
    }

    async syncAllTasksToClickup() {
        if (!this.clickupConfig.apiToken || !this.clickupConfig.teamId) {
            alert('ClickUp設定が不完全です。');
            return;
        }

        // 今月のタスクのみ抽出
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        const monthTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate >= firstDay && taskDate <= lastDay;
        });

        if (monthTasks.length === 0) {
            alert('今月のタスクがありません。');
            return;
        }

        // 各タスクごとに同期
        let success = 0, fail = 0;
        for (const task of monthTasks) {
            // タスクにClickUpタスクIDが紐づいているかチェック
            let clickupTaskId = '';
            if (task.clickupTaskId) {
                clickupTaskId = task.clickupTaskId;
            } else {
                // ドロップダウン選択がなければスキップ
                continue;
            }

            try {
                const date = task.date;
                const startTime = task.startTime;
                const endTime = task.endTime;
                const jst = `${date}T${startTime}:00+09:00`;
                const startDateTime = new Date(jst);
                const endDateTime = new Date(`${date}T${endTime}:00+09:00`);
                const duration = endDateTime.getTime() - startDateTime.getTime();

                const payload = {
                    team_id: this.clickupConfig.teamId,
                    task_id: clickupTaskId,
                    start_time: startDateTime.getTime(),
                    duration: duration
                };

                const response = await fetch(`${this.backendUrl}/api/clickup/time-entry`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-ClickUp-Token': this.clickupConfig.apiToken
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    success++;
                    task.clickupSynced = true;
                } else {
                    fail++;
                }
            } catch (e) {
                fail++;
            }
        }
        this.saveTasks();
        this.renderTasks();
        alert(`同期完了: ${success}件成功, ${fail}件失敗`);
    }
}



// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new CalendarTaskManager();
});