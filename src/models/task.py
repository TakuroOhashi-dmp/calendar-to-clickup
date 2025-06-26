from flask_sqlalchemy import SQLAlchemy
from .user import db, User

class Task(db.Model):
    __tablename__ = 'tasks'
    
    # --- ▼ モデルの定義を修正・完成させます ▼ ---
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    startTime = db.Column(db.String(5), nullable=False)
    endTime = db.Column(db.String(5), nullable=False)
    clickupTaskId = db.Column(db.String(64), nullable=True)
    clickupSynced = db.Column(db.Boolean, default=False, nullable=False)
    clickupTimeEntryId = db.Column(db.String(64), nullable=True, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref='tasks')
    # --- ▲ 修正 ▲ ---

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date,
            'startTime': self.startTime,
            'endTime': self.endTime,
            'clickupTaskId': self.clickupTaskId,
            'clickupSynced': self.clickupSynced,
            'clickupTimeEntryId': self.clickupTimeEntryId
        }