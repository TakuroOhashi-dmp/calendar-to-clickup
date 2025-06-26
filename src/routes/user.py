from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from src.models.user import db, User

user_bp = Blueprint('user', __name__)

@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({'error': 'Username or email already exists'}), 409

    hashed_password = generate_password_hash(password)
    new_user = User(username=username, email=email, hashed_password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User created'}), 201

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.hashed_password, password):
        login_user(user)
        return jsonify({'message': 'Login successful'}), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@user_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    print(f"current_user: {current_user}, is_authenticated: {current_user.is_authenticated}")
    return jsonify({'message': 'Logged out'})

@user_bp.route('/me', methods=['GET'])
@login_required
def get_me():
    print(f"current_user: {current_user}, is_authenticated: {current_user.is_authenticated}")
    return jsonify(current_user.to_dict())


@user_bp.route('/session', methods=['GET'])
def show_session():
    from flask import session
    return jsonify(dict(session))