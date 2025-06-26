from flask_sqlalchemy import SQLAlchemy
from .user import db, User

class ClickUpConfig(db.Model):
    __tablename__ = 'clickup_configs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # ←修正
    api_token = db.Column(db.String(128), nullable=False)
    team_id = db.Column(db.String(32), nullable=False)
    list_id = db.Column(db.String(32), nullable=False)

    user = db.relationship('User', backref='clickup_config')