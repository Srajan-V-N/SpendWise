from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import query_one, query_all, execute, get_db

goals_bp = Blueprint('goals', __name__)


def _days_left(deadline):
    if not deadline:
        return None
    dl = deadline if isinstance(deadline, date) else date.fromisoformat(str(deadline))
    delta = (dl - date.today()).days
    return max(0, delta)


def _monthly_needed(target, current, deadline):
    if not deadline:
        return None
    days = _days_left(deadline)
    if days <= 0:
        return None
    months = max(1, days / 30)
    remaining = float(target) - float(current)
    return round(max(0, remaining) / months, 2)


def _goal_row(row, contributions=None):
    target = float(row['target_amount'])
    current = float(row['current_amount'])
    pct = round(current / target * 100, 1) if target else 0
    dl_str = row['deadline'].isoformat() if row.get('deadline') and hasattr(row['deadline'], 'isoformat') else row.get('deadline')

    return {
        'id': row['id'],
        'title': row['title'],
        'description': row.get('description'),
        'target_amount': target,
        'current_amount': current,
        'percentage': min(100, pct),
        'deadline': dl_str,
        'days_left': _days_left(row.get('deadline')),
        'monthly_needed': _monthly_needed(target, current, row.get('deadline')),
        'icon': row.get('icon', 'target'),
        'color': row.get('color', '#00FFDD'),
        'status': row.get('status', 'active'),
        'priority': row.get('priority', 'medium'),
        'contributions': contributions or [],
        'created_at': row['created_at'].isoformat() if hasattr(row.get('created_at'), 'isoformat') else row.get('created_at'),
    }


@goals_bp.route('', methods=['GET'])
@jwt_required()
def list_goals():
    user_id = int(get_jwt_identity())
    rows = query_all(
        "SELECT * FROM goals WHERE user_id = %s ORDER BY priority DESC, created_at DESC",
        (user_id,)
    )

    result = []
    for row in rows:
        contribs = query_all(
            """SELECT id, amount, note, contributed_at, created_at
               FROM goal_contributions WHERE goal_id = %s ORDER BY contributed_at DESC LIMIT 10""",
            (row['id'],)
        )
        for c in contribs:
            c['amount'] = float(c['amount'])
            if hasattr(c.get('contributed_at'), 'isoformat'):
                c['contributed_at'] = c['contributed_at'].isoformat()
            if hasattr(c.get('created_at'), 'isoformat'):
                c['created_at'] = c['created_at'].isoformat()
        result.append(_goal_row(row, contribs))

    total_saved = sum(g['current_amount'] for g in result)
    total_target = sum(g['target_amount'] for g in result)
    completed = sum(1 for g in result if g['status'] == 'completed')
    active = sum(1 for g in result if g['status'] == 'active')

    return jsonify({
        'success': True,
        'data': {
            'goals': result,
            'summary': {
                'total_goals': len(result),
                'active': active,
                'completed': completed,
                'total_saved': total_saved,
                'total_target': total_target,
                'overall_percentage': round(total_saved / total_target * 100, 1) if total_target else 0,
            }
        }
    })


@goals_bp.route('', methods=['POST'])
@jwt_required()
def create_goal():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    title = (data.get('title') or '').strip()
    target_amount = data.get('target_amount')
    current_amount = float(data.get('current_amount', 0))
    deadline = data.get('deadline')
    icon = data.get('icon', 'target')
    color = data.get('color', '#00FFDD')
    description = data.get('description', '')
    priority = data.get('priority', 'medium')

    if not title:
        return jsonify({'success': False, 'error': 'Goal title is required.'}), 422
    if not target_amount or float(target_amount) <= 0:
        return jsonify({'success': False, 'error': 'Target amount must be positive.'}), 422

    status = 'completed' if current_amount >= float(target_amount) else 'active'

    gid = execute(
        """INSERT INTO goals (user_id, title, description, target_amount, current_amount,
           deadline, icon, color, status, priority)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (user_id, title, description, float(target_amount), current_amount,
         deadline or None, icon, color, status, priority)
    )

    row = query_one("SELECT * FROM goals WHERE id = %s", (gid,))
    return jsonify({'success': True, 'data': _goal_row(row)}), 201


@goals_bp.route('/<int:gid>', methods=['PATCH'])
@jwt_required()
def update_goal(gid):
    user_id = int(get_jwt_identity())
    existing = query_one("SELECT id FROM goals WHERE id = %s AND user_id = %s", (gid, user_id))
    if not existing:
        return jsonify({'success': False, 'error': 'Goal not found.'}), 404

    data = request.get_json(silent=True) or {}
    allowed = ['title', 'description', 'target_amount', 'current_amount', 'deadline', 'icon', 'color', 'status', 'priority']
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({'success': False, 'error': 'No valid fields to update.'}), 400

    for field in ['target_amount', 'current_amount']:
        if field in updates:
            updates[field] = float(updates[field])

    sets = ', '.join(f"{k} = %s" for k in updates)
    execute(f"UPDATE goals SET {sets} WHERE id = %s AND user_id = %s", list(updates.values()) + [gid, user_id])
    row = query_one("SELECT * FROM goals WHERE id = %s", (gid,))
    return jsonify({'success': True, 'data': _goal_row(row)})


@goals_bp.route('/<int:gid>', methods=['DELETE'])
@jwt_required()
def delete_goal(gid):
    user_id = int(get_jwt_identity())
    existing = query_one("SELECT id FROM goals WHERE id = %s AND user_id = %s", (gid, user_id))
    if not existing:
        return jsonify({'success': False, 'error': 'Goal not found.'}), 404
    execute("DELETE FROM goals WHERE id = %s AND user_id = %s", (gid, user_id))
    return jsonify({'success': True, 'message': 'Goal deleted.'})


@goals_bp.route('/<int:gid>/contribute', methods=['POST'])
@jwt_required()
def contribute(gid):
    user_id = int(get_jwt_identity())
    goal = query_one("SELECT * FROM goals WHERE id = %s AND user_id = %s", (gid, user_id))
    if not goal:
        return jsonify({'success': False, 'error': 'Goal not found.'}), 404

    data = request.get_json(silent=True) or {}
    amount = data.get('amount')
    note = data.get('note', '')
    contrib_date = data.get('date') or date.today().isoformat()

    if not amount or float(amount) <= 0:
        return jsonify({'success': False, 'error': 'Amount must be positive.'}), 422

    amount = float(amount)

    with get_db() as conn:
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "INSERT INTO goal_contributions (goal_id, user_id, amount, note, contributed_at) VALUES (%s,%s,%s,%s,%s)",
            (gid, user_id, amount, note, contrib_date)
        )
        contrib_id = cursor.lastrowid

        new_amount = float(goal['current_amount']) + amount
        new_status = 'completed' if new_amount >= float(goal['target_amount']) else goal['status']
        cursor.execute(
            "UPDATE goals SET current_amount = %s, status = %s WHERE id = %s",
            (new_amount, new_status, gid)
        )
        conn.commit()

        cursor.execute("SELECT * FROM goal_contributions WHERE id = %s", (contrib_id,))
        contrib = cursor.fetchone()

    updated_goal = query_one("SELECT * FROM goals WHERE id = %s", (gid,))

    old_pct = float(goal['current_amount']) / float(goal['target_amount']) * 100 if float(goal['target_amount']) else 0
    new_pct = new_amount / float(goal['target_amount']) * 100 if float(goal['target_amount']) else 0

    milestones = [25, 50, 75, 100]
    milestone_hit = None
    for m in milestones:
        if old_pct < m <= new_pct:
            milestone_hit = m
            break

    contrib['amount'] = float(contrib['amount'])
    if hasattr(contrib.get('contributed_at'), 'isoformat'):
        contrib['contributed_at'] = contrib['contributed_at'].isoformat()

    return jsonify({
        'success': True,
        'data': {
            'contribution': contrib,
            'goal': _goal_row(updated_goal),
            'milestone_hit': bool(milestone_hit),
            'milestone_message': f"You've reached {milestone_hit}% of your goal — {updated_goal['title']}!" if milestone_hit else None,
        }
    })
