from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import requests
from src.models import db, ClickUpConfig
from src.utils.encryption import encrypt_data, decrypt_data
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
clickup_bp = Blueprint('clickup', __name__)

@clickup_bp.route('/tasks', methods=['GET'])
@login_required
def get_tasks():
    config = ClickUpConfig.query.filter_by(user_id=current_user.id).first()
    if not config:
        return jsonify({'error': 'ClickUp configuration not found.'}), 400

    # ▼▼▼ 復号処理を追加 ▼▼▼
    try:
        api_token = decrypt_data(config.api_token)
    except Exception:
        return jsonify({'error': 'Failed to decrypt API token. Please save your configuration again.'}), 500
    
    list_id = config.list_id
    # ▲▲▲ 修正 ▲▲▲

    headers = {'Authorization': api_token}
    params = {'subtasks': 'true'}
    url = f"https://api.clickup.com/api/v2/list/{list_id}/task"
    response = requests.get(url, headers=headers, params=params)

    if response.status_code != 200:
        return jsonify({
            'error': 'Failed to fetch tasks from ClickUp. Please check your API token and list ID.',
            'details': response.text
        }), 400
    
    tasks_data = response.json()
    tasks = []
    for task in tasks_data.get('tasks', []):
        tasks.append({
            'id': task['id'],
            'name': task['name'],
            'status': task.get('status', {}).get('status', ''),
            'assignees': [assignee['username'] for assignee in task.get('assignees', [])],
            'parent': task.get('parent')
        })
    return jsonify({'tasks': tasks})

@clickup_bp.route('/time-entry', methods=['POST'])
@login_required
def create_time_entry():
    config = ClickUpConfig.query.filter_by(user_id=current_user.id).first()
    if not config:
        return jsonify({'error': 'ClickUp configuration not found.'}), 404

    # ▼▼▼ 復号処理を追加 ▼▼▼
    try:
        api_token = decrypt_data(config.api_token)
    except Exception:
        return jsonify({'error': 'Failed to decrypt API token. Please save your configuration again.'}), 500
        
    team_id = config.team_id
    # ▲▲▲ 修正 ▲▲▲

    data = request.get_json()
    task_id = data.get('task_id')
    start_time = data.get('start_time')
    duration = data.get('duration')

    if not all([task_id, start_time, duration]):
        return jsonify({'error': 'Missing parameters for time entry.'}), 400

    headers = {'Authorization': api_token, 'Content-Type': 'application/json'}
    url = f"https://api.clickup.com/api/v2/team/{team_id}/time_entries"
    payload = {'tid': task_id, 'start': start_time, 'duration': duration}
    response = requests.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        return jsonify({
            'error': 'Failed to create time entry in ClickUp.',
            'details': response.text
        }), 400

    return jsonify({'success': True, 'data': response.json()})

@clickup_bp.route('/config', methods=['POST'])
@login_required
def save_config():
    data = request.get_json()
    api_token = data.get('api_token')
    team_id = data.get('team_id')
    list_id = data.get('list_id')

    if not all([api_token, team_id, list_id]):
        return jsonify({'error': 'All fields are required'}), 400

    config = ClickUpConfig.query.filter_by(user_id=current_user.id).first()
    if not config:
        config = ClickUpConfig(user_id=current_user.id)
        db.session.add(config)

    config.api_token = encrypt_data(api_token)
    config.team_id = team_id
    config.list_id = list_id

    db.session.commit()
    return jsonify({'message': 'Configuration saved successfully'})

@clickup_bp.route('/config', methods=['GET'])
@login_required
def get_config():
    config = ClickUpConfig.query.filter_by(user_id=current_user.id).first()
    if config:
        try:
            return jsonify({
                'api_token': decrypt_data(config.api_token),
                'team_id': config.team_id,
                'list_id': config.list_id
            })
        except Exception:
             return jsonify({'error': 'Failed to decrypt API token. Please save your configuration again.'}), 500
    return jsonify({})

@clickup_bp.route('/time-entries', methods=['GET'])
@login_required
def get_time_entries():
    """指定期間のタイムトラッキングデータをClickUpから取得する"""
    config = ClickUpConfig.query.filter_by(user_id=current_user.id).first()
    if not config:
        return jsonify({'error': 'ClickUp configuration not found.'}), 400

    try:
        api_token = decrypt_data(config.api_token)
        team_id = config.team_id
    except Exception:
        return jsonify({'error': 'Failed to decrypt API token.'}), 500

    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'start_date and end_date are required.'}), 400

    # JSTの0時0分から23時59分までのタイムスタンプ（ミリ秒）を計算
    jst = ZoneInfo("Asia/Tokyo")
    start_dt = datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=jst)
    end_dt = datetime.strptime(end_date_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=jst)
    start_timestamp = int(start_dt.timestamp() * 1000)
    end_timestamp = int(end_dt.timestamp() * 1000)

    headers = {'Authorization': api_token}
    
    # トークンに紐づくClickUpユーザーIDを取得
    try:
        user_url = "https://api.clickup.com/api/v2/user"
        user_response = requests.get(user_url, headers=headers)
        user_response.raise_for_status()
        clickup_user_id = user_response.json()['user']['id']
    except requests.RequestException:
        return jsonify({'error': 'Failed to get ClickUp user from token.'}), 500

    # タイムトラッキングデータを取得
    params = {
        'start_date': start_timestamp,
        'end_date': end_timestamp,
        'assignee': clickup_user_id
    }
    url = f"https://api.clickup.com/api/v2/team/{team_id}/time_entries"
    response = requests.get(url, headers=headers, params=params)

    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch time entries from ClickUp.', 'details': response.text}), 400

    # フロントエンドで使いやすいようにデータを整形
    formatted_entries = []
    for entry in response.json().get('data', []):
        if not all(k in entry for k in ['id', 'task', 'start', 'end']):
            continue

        start_dt_jst = datetime.fromtimestamp(int(entry['start']) / 1000, tz=jst)
        end_dt_jst = datetime.fromtimestamp(int(entry['end']) / 1000, tz=jst)

        formatted_entries.append({
            'time_entry_id': entry['id'],
            'task_id': entry['task']['id'],
            'task_name': entry['task']['name'],
            'date': start_dt_jst.strftime('%Y-%m-%d'),
            'startTime': start_dt_jst.strftime('%H:%M'),
            'endTime': end_dt_jst.strftime('%H:%M'),
        })

    return jsonify(formatted_entries)