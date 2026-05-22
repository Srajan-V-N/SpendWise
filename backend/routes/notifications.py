from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import query_one, query_all, execute

notifications_bp = Blueprint('notifications', __name__)


def _notif_row(row):
    return {
        'id': row['id'],
        'type': row.get('type', 'system'),
        'title': row['title'],
        'body': row.get('body'),
        'link': row.get('link'),
        'is_read': bool(row.get('is_read', False)),
        'metadata': row.get('metadata'),
        'created_at': row['created_at'].isoformat() if hasattr(row.get('created_at'), 'isoformat') else row.get('created_at'),
    }


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    user_id = int(get_jwt_identity())
    page = max(1, int(request.args.get('page', 1)))
    limit = min(50, max(1, int(request.args.get('limit', 20))))
    offset = (page - 1) * limit
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'

    where = 'user_id = %s'
    params = [user_id]
    if unread_only:
        where += ' AND is_read = 0'

    count_row = query_one(f"SELECT COUNT(*) AS total FROM notifications WHERE {where}", params)
    total = count_row['total'] if count_row else 0

    unread_row = query_one("SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = %s AND is_read = 0", (user_id,))
    unread_count = int(unread_row['cnt']) if unread_row else 0

    rows = query_all(
        f"SELECT * FROM notifications WHERE {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
        params + [limit, offset]
    )

    return jsonify({
        'success': True,
        'data': {
            'notifications': [_notif_row(r) for r in rows],
            'unread_count': unread_count,
            'pagination': {'page': page, 'limit': limit, 'total': total, 'pages': -(-total // limit)},
        }
    })


@notifications_bp.route('/<int:nid>/read', methods=['PATCH'])
@jwt_required()
def mark_read(nid):
    user_id = int(get_jwt_identity())
    execute("UPDATE notifications SET is_read = 1 WHERE id = %s AND user_id = %s", (nid, user_id))
    return jsonify({'success': True, 'message': 'Marked as read.'})


@notifications_bp.route('/read-all', methods=['PATCH'])
@jwt_required()
def mark_all_read():
    user_id = int(get_jwt_identity())
    execute("UPDATE notifications SET is_read = 1 WHERE user_id = %s AND is_read = 0", (user_id,))
    return jsonify({'success': True, 'message': 'All notifications marked as read.'})


@notifications_bp.route('/<int:nid>', methods=['DELETE'])
@jwt_required()
def delete_notification(nid):
    user_id = int(get_jwt_identity())
    execute("DELETE FROM notifications WHERE id = %s AND user_id = %s", (nid, user_id))
    return jsonify({'success': True, 'message': 'Notification deleted.'})
