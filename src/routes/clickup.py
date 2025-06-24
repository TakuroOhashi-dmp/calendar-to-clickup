from flask import Blueprint, request, jsonify
import requests
import os

clickup_bp = Blueprint('clickup', __name__)

# ClickUp API設定
CLICKUP_API_BASE = "https://api.clickup.com/api/v2"

@clickup_bp.route('/tasks', methods=['GET'])
def get_tasks():
    """指定されたリストからタスクとサブタスク一覧を取得"""
    try:
        # リクエストヘッダーとパラメータから設定を取得
        api_token = request.headers.get('X-ClickUp-Token')
        list_id = request.args.get('list_id')
        
        if not api_token or not list_id:
            return jsonify({'error': 'API token and list_id are required'}), 400
        
        headers = {
            'Authorization': api_token,
            'Content-Type': 'application/json'
        }
        
        # --- ▼ 修正点 1: サブタスク取得のためのパラメータを追加 ---
        params = {
            'subtasks': 'true'
        }
        
        # ClickUp APIからタスク一覧を取得
        url = f"{CLICKUP_API_BASE}/list/{list_id}/task"
        # --- ▼ 修正点 2: requests.getにparamsを追加 ---
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch tasks from ClickUp', 'details': response.text}), response.status_code
        
        tasks_data = response.json()
        
        # 必要な情報のみを抽出
        tasks = []
        for task in tasks_data.get('tasks', []):
            tasks.append({
                'id': task['id'],
                'name': task['name'],
                'status': task.get('status', {}).get('status', ''),
                'assignees': [assignee['username'] for assignee in task.get('assignees', [])],
                # --- ▼ 修正点 3: 親タスクのIDを追加 ---
                # 親がいないタスクは `parent` が null になります
                'parent': task.get('parent')
            })
        
        return jsonify({'tasks': tasks})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clickup_bp.route('/time-entry', methods=['POST'])
def create_time_entry():
    """ClickUpに時間記録を作成"""
    try:
        data = request.get_json()

        # 必要なパラメータを取得
        api_token = request.headers.get('X-ClickUp-Token')
        team_id = data.get('team_id')
        task_id = data.get('task_id')
        start_time = data.get('start_time')  # Unix timestamp (milliseconds)
        duration = data.get('duration')      # milliseconds

        if not all([api_token, team_id, task_id, start_time, duration]):
            return jsonify({'error': 'All parameters are required'}), 400

        headers = {
            'Authorization': api_token,
            'Content-Type': 'application/json'
        }

        # ClickUp APIに時間記録を作成
        url = f"{CLICKUP_API_BASE}/team/{team_id}/time_entries"
        payload = {
            'tid': task_id,
            'start': start_time,
            'duration': duration
        }

        response = requests.post(url, headers=headers, json=payload)

        if response.status_code != 200:
            return jsonify({'error': 'Failed to create time entry in ClickUp', 'details': response.text}), response.status_code

        return jsonify({'success': True, 'data': response.json()})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clickup_bp.route('/config', methods=['POST'])
def save_config():
    """ClickUp設定を保存（簡易版）"""
    try:
        data = request.get_json()
        
        # 実際のアプリケーションでは、これらの設定をデータベースやセキュアな場所に保存する
        # ここでは簡易的にレスポンスで返すのみ
        config = {
            'api_token': data.get('api_token'),
            'team_id': data.get('team_id'),
            'list_id': data.get('list_id')
        }
        
        return jsonify({'success': True, 'config': config})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
