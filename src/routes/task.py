from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models import db, Task

task_bp = Blueprint('task', __name__)

@task_bp.route('/tasks', methods=['GET'])
@login_required
def get_tasks():
    """ログインユーザーのタスクを全て取得"""
    tasks = Task.query.filter_by(user_id=current_user.id).all()
    return jsonify([task.to_dict() for task in tasks])

@task_bp.route('/tasks', methods=['POST'])
@login_required
def create_task():
    """新しいタスクを作成"""
    data = request.get_json()
    new_task = Task(
        name=data.get('name'),
        date=data.get('date'),
        startTime=data.get('startTime'),
        endTime=data.get('endTime'),
        clickupTaskId=data.get('clickupTaskId'),
        clickupSynced=data.get('clickupSynced', False),
        clickupTimeEntryId=data.get('clickupTimeEntryId'), # ◀◀◀ 追加
        user_id=current_user.id
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@task_bp.route('/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    """タスクを更新"""
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    
    data = request.get_json()
    task.name = data.get('name', task.name)
    task.date = data.get('date', task.date)
    task.startTime = data.get('startTime', task.startTime)
    task.endTime = data.get('endTime', task.endTime)
    task.clickupTaskId = data.get('clickupTaskId', task.clickupTaskId)
    task.clickupSynced = data.get('clickupSynced', task.clickupSynced)
    task.clickupTimeEntryId = data.get('clickupTimeEntryId', task.clickupTimeEntryId) # ◀◀◀ 追加
    
    db.session.commit()
    return jsonify(task.to_dict())

@task_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    """タスクを削除"""
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 200