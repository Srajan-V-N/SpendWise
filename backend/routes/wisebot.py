import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import query_one, query_all, execute
from services.ai_service import get_wisebot_response, get_proactive_insights

wisebot_bp = Blueprint('wisebot', __name__)


@wisebot_bp.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    message = (data.get('message') or '').strip()
    session_key = data.get('session_key') or uuid.uuid4().hex
    context_page = data.get('context_page', 'general')
    context_data = data.get('context_data', {})

    if not message:
        return jsonify({'success': False, 'error': 'Message is required.'}), 422

    history = query_all(
        """SELECT role, content FROM wisebot_logs
           WHERE user_id = %s AND session_key = %s
           ORDER BY created_at ASC LIMIT 20""",
        (user_id, session_key)
    )

    user_summary = _get_user_summary(user_id)

    try:
        reply, suggestions = get_wisebot_response(
            message=message,
            history=history,
            user_summary=user_summary,
            context_page=context_page,
            context_data=context_data,
        )
    except ValueError as e:
        code = str(e)
        msgs = {
            'rate_limit': 'Too many requests. Please try again in a moment.',
            'auth_error': 'AI service configuration error.',
        }
        return jsonify({'success': False, 'error': msgs.get(code, 'AI service error.'), 'error_code': code}), 503
    except Exception as e:
        return jsonify({'success': False, 'error': f'AI service error: {str(e)}', 'error_code': 'service_error'}), 503

    execute(
        "INSERT INTO wisebot_logs (user_id, session_key, role, content, context_page) VALUES (%s,%s,'user',%s,%s)",
        (user_id, session_key, message, context_page)
    )
    execute(
        "INSERT INTO wisebot_logs (user_id, session_key, role, content, context_page) VALUES (%s,%s,'assistant',%s,%s)",
        (user_id, session_key, reply, context_page)
    )

    return jsonify({
        'success': True,
        'data': {
            'reply': reply,
            'session_key': session_key,
            'suggestions': suggestions,
        }
    })


@wisebot_bp.route('/insights', methods=['GET'])
@jwt_required()
def insights():
    user_id = int(get_jwt_identity())
    user_summary = _get_user_summary(user_id)

    try:
        ai_insights = get_proactive_insights(user_summary)
    except Exception:
        ai_insights = [
            {
                'type': 'tip',
                'title': 'Track your daily expenses',
                'body': 'Logging expenses daily helps you stay aware of your spending patterns.',
                'severity': 'info',
            }
        ]

    return jsonify({'success': True, 'data': {'insights': ai_insights}})


@wisebot_bp.route('/history', methods=['GET'])
@jwt_required()
def history():
    user_id = int(get_jwt_identity())
    session_key = request.args.get('session_key')
    limit = min(100, int(request.args.get('limit', 50)))

    if session_key:
        rows = query_all(
            """SELECT role, content, created_at FROM wisebot_logs
               WHERE user_id = %s AND session_key = %s
               ORDER BY created_at ASC LIMIT %s""",
            (user_id, session_key, limit)
        )
    else:
        rows = query_all(
            """SELECT role, content, created_at FROM wisebot_logs
               WHERE user_id = %s ORDER BY created_at DESC LIMIT %s""",
            (user_id, limit)
        )

    messages = []
    for r in rows:
        messages.append({
            'role': r['role'],
            'content': r['content'],
            'created_at': r['created_at'].isoformat() if hasattr(r.get('created_at'), 'isoformat') else r.get('created_at'),
        })

    return jsonify({'success': True, 'data': {'messages': messages}})


def _get_user_summary(user_id):
    from datetime import date
    today = date.today()
    start = today.replace(day=1).isoformat()
    end = today.isoformat()

    totals = query_one(
        """SELECT
             COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
             COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses,
             COUNT(*) AS transactions
           FROM expenses WHERE user_id = %s AND date BETWEEN %s AND %s""",
        (user_id, start, end)
    )

    top_cats = query_all(
        """SELECT c.name, SUM(e.amount) AS total
           FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
           WHERE e.user_id = %s AND e.type = 'expense' AND e.date BETWEEN %s AND %s
           GROUP BY c.name ORDER BY total DESC LIMIT 3""",
        (user_id, start, end)
    )

    goals = query_all(
        "SELECT title, target_amount, current_amount FROM goals WHERE user_id = %s AND status = 'active' LIMIT 3",
        (user_id,)
    )

    user = query_one("SELECT name, currency, monthly_income FROM users WHERE id = %s", (user_id,))

    return {
        'name': user['name'] if user else 'User',
        'currency': user['currency'] if user else 'INR',
        'monthly_income': float(user['monthly_income'] or 0) if user else 0,
        'this_month': {
            'income': float(totals['income'] or 0),
            'expenses': float(totals['expenses'] or 0),
            'transactions': int(totals['transactions'] or 0),
        },
        'top_categories': [{'name': c['name'], 'amount': float(c['total'])} for c in top_cats],
        'active_goals': [
            {
                'title': g['title'],
                'target': float(g['target_amount']),
                'current': float(g['current_amount']),
                'pct': round(float(g['current_amount']) / float(g['target_amount']) * 100, 1)
            }
            for g in goals if float(g['target_amount']) > 0
        ],
    }
