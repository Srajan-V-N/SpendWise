import bcrypt
import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from database import query_one, query_all, execute

auth_bp = Blueprint('auth', __name__)

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _user_to_dict(user):
    return {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'currency': user['currency'],
        'theme': user['theme'],
        'avatar_url': user['avatar_url'],
        'monthly_income': float(user['monthly_income'] or 0),
        'onboarded': bool(user['onboarded']),
        'created_at': user['created_at'],
    }


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    errors = {}
    if not name or len(name) < 2:
        errors['name'] = 'Name must be at least 2 characters.'
    if not EMAIL_RE.match(email):
        errors['email'] = 'Enter a valid email address.'
    if len(password) < 8:
        errors['password'] = 'Password must be at least 8 characters.'
    if errors:
        return jsonify({'success': False, 'errors': errors}), 422

    existing = query_one("SELECT id FROM users WHERE email = %s", (email,))
    if existing:
        return jsonify({'success': False, 'error': 'An account with this email already exists.'}), 409

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = execute(
        "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
        (name, email, pw_hash)
    )

    user = query_one("SELECT * FROM users WHERE id = %s", (user_id,))
    access_token = create_access_token(identity=str(user_id))
    refresh_token = create_refresh_token(identity=str(user_id))

    return jsonify({
        'success': True,
        'data': {
            'user': _user_to_dict(user),
            'access_token': access_token,
            'refresh_token': refresh_token,
        }
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = query_one("SELECT * FROM users WHERE email = %s", (email,))
    if not user:
        return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

    if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

    access_token = create_access_token(identity=str(user['id']))
    refresh_token = create_refresh_token(identity=str(user['id']))

    return jsonify({
        'success': True,
        'data': {
            'user': _user_to_dict(user),
            'access_token': access_token,
            'refresh_token': refresh_token,
        }
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({'success': True, 'data': {'access_token': access_token}})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = query_one("SELECT * FROM users WHERE id = %s", (user_id,))
    if not user:
        return jsonify({'success': False, 'error': 'User not found.'}), 404
    return jsonify({'success': True, 'data': _user_to_dict(user)})


@auth_bp.route('/me', methods=['PATCH'])
@jwt_required()
def update_me():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    allowed = ['name', 'currency', 'theme', 'avatar_url', 'monthly_income']
    updates = {k: v for k, v in data.items() if k in allowed and v is not None}
    if not updates:
        return jsonify({'success': False, 'error': 'No valid fields to update.'}), 400

    sets = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [user_id]
    execute(f"UPDATE users SET {sets} WHERE id = %s", values)

    user = query_one("SELECT * FROM users WHERE id = %s", (user_id,))
    return jsonify({'success': True, 'data': _user_to_dict(user)})


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'success': True, 'message': 'Logged out successfully.'})


@auth_bp.route('/password', methods=['PATCH'])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    current_pw = data.get('current_password') or ''
    new_pw = data.get('new_password') or ''

    if len(new_pw) < 8:
        return jsonify({'success': False, 'error': 'Password must be at least 8 characters.'}), 422

    user = query_one("SELECT * FROM users WHERE id = %s", (user_id,))
    if not user:
        return jsonify({'success': False, 'error': 'User not found.'}), 404

    if not bcrypt.checkpw(current_pw.encode(), user['password_hash'].encode()):
        return jsonify({'success': False, 'error': 'Current password is incorrect.'}), 401

    new_hash = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
    return jsonify({'success': True, 'message': 'Password changed successfully.'})
