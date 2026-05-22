from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import query_one, query_all, execute

subscriptions_bp = Blueprint('subscriptions', __name__)

CYCLE_DAYS = {'daily': 1, 'weekly': 7, 'monthly': 30, 'quarterly': 90, 'yearly': 365}


def _sub_row(row):
    nbd = row.get('next_billing_date')
    if nbd and hasattr(nbd, 'isoformat'):
        nbd = nbd.isoformat()
    lbd = row.get('last_billed_date')
    if lbd and hasattr(lbd, 'isoformat'):
        lbd = lbd.isoformat()

    days_until = None
    if nbd:
        delta = (date.fromisoformat(nbd) - date.today()).days
        days_until = max(0, delta)

    return {
        'id': row['id'],
        'name': row['name'],
        'provider': row.get('provider'),
        'amount': float(row['amount']),
        'billing_cycle': row.get('billing_cycle', 'monthly'),
        'next_billing_date': nbd,
        'last_billed_date': lbd,
        'days_until_renewal': days_until,
        'status': row.get('status', 'active'),
        'auto_detected': bool(row.get('auto_detected', False)),
        'note': row.get('note'),
        'category': {
            'id': row.get('cat_id'),
            'name': row.get('cat_name', 'Subscriptions'),
            'icon': row.get('cat_icon', 'refresh-cw'),
            'color': row.get('cat_color', '#EC4899'),
        } if row.get('cat_id') else None,
    }


@subscriptions_bp.route('', methods=['GET'])
@jwt_required()
def list_subscriptions():
    user_id = int(get_jwt_identity())
    rows = query_all(
        """SELECT s.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM subscriptions s LEFT JOIN categories c ON c.id = s.category_id
           WHERE s.user_id = %s ORDER BY s.next_billing_date ASC""",
        (user_id,)
    )

    result = [_sub_row(r) for r in rows]
    active = [s for s in result if s['status'] == 'active']

    monthly_total = 0.0
    for s in active:
        amount = s['amount']
        cycle = s['billing_cycle']
        days = CYCLE_DAYS.get(cycle, 30)
        monthly_total += amount * (30 / days)

    return jsonify({
        'success': True,
        'data': {
            'subscriptions': result,
            'summary': {
                'monthly_total': round(monthly_total, 2),
                'yearly_projection': round(monthly_total * 12, 2),
                'active_count': len(active),
                'total_count': len(result),
            }
        }
    })


@subscriptions_bp.route('', methods=['POST'])
@jwt_required()
def create_subscription():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    name = (data.get('name') or '').strip()
    amount = data.get('amount')
    billing_cycle = data.get('billing_cycle', 'monthly')
    next_billing_date = data.get('next_billing_date')
    category_id = data.get('category_id')
    note = data.get('note', '')
    provider = data.get('provider', '')

    if not name:
        return jsonify({'success': False, 'error': 'Name is required.'}), 422
    if not amount or float(amount) <= 0:
        return jsonify({'success': False, 'error': 'Amount must be positive.'}), 422

    sid = execute(
        """INSERT INTO subscriptions (user_id, category_id, name, provider, amount, billing_cycle,
           next_billing_date, note) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (user_id, category_id or None, name, provider, float(amount),
         billing_cycle, next_billing_date or None, note)
    )

    row = query_one(
        """SELECT s.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM subscriptions s LEFT JOIN categories c ON c.id = s.category_id WHERE s.id = %s""",
        (sid,)
    )
    return jsonify({'success': True, 'data': _sub_row(row)}), 201


@subscriptions_bp.route('/<int:sid>', methods=['PATCH'])
@jwt_required()
def update_subscription(sid):
    user_id = int(get_jwt_identity())
    existing = query_one("SELECT id FROM subscriptions WHERE id = %s AND user_id = %s", (sid, user_id))
    if not existing:
        return jsonify({'success': False, 'error': 'Subscription not found.'}), 404

    data = request.get_json(silent=True) or {}
    allowed = ['name', 'provider', 'amount', 'billing_cycle', 'next_billing_date', 'status', 'category_id', 'note']
    updates = {k: v for k, v in data.items() if k in allowed}
    if 'amount' in updates:
        updates['amount'] = float(updates['amount'])

    if not updates:
        return jsonify({'success': False, 'error': 'No valid fields.'}), 400

    sets = ', '.join(f"{k} = %s" for k in updates)
    execute(f"UPDATE subscriptions SET {sets} WHERE id = %s AND user_id = %s", list(updates.values()) + [sid, user_id])

    row = query_one(
        """SELECT s.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM subscriptions s LEFT JOIN categories c ON c.id = s.category_id WHERE s.id = %s""",
        (sid,)
    )
    return jsonify({'success': True, 'data': _sub_row(row)})


@subscriptions_bp.route('/<int:sid>', methods=['DELETE'])
@jwt_required()
def delete_subscription(sid):
    user_id = int(get_jwt_identity())
    existing = query_one("SELECT id FROM subscriptions WHERE id = %s AND user_id = %s", (sid, user_id))
    if not existing:
        return jsonify({'success': False, 'error': 'Subscription not found.'}), 404
    execute("DELETE FROM subscriptions WHERE id = %s AND user_id = %s", (sid, user_id))
    return jsonify({'success': True, 'message': 'Subscription deleted.'})


@subscriptions_bp.route('/detect', methods=['POST'])
@jwt_required()
def detect_subscriptions():
    user_id = int(get_jwt_identity())

    rows = query_all(
        """SELECT LOWER(TRIM(COALESCE(merchant, title))) AS key_name,
                  ROUND(amount, 0) AS rounded_amount,
                  COUNT(*) AS occurrences,
                  MIN(date) AS first_seen,
                  MAX(date) AS last_seen,
                  ANY_VALUE(title) AS title,
                  ANY_VALUE(merchant) AS merchant
           FROM expenses
           WHERE user_id = %s AND type = 'expense'
             AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
           GROUP BY key_name, rounded_amount
           HAVING occurrences >= 2
           ORDER BY occurrences DESC""",
        (user_id,)
    )

    detected = []
    for r in rows:
        first = r['first_seen']
        last = r['last_seen']
        if hasattr(first, 'isoformat'):
            first = first
        if hasattr(last, 'isoformat'):
            last = last

        if not first or not last:
            continue

        occ = int(r['occurrences'])
        span_days = (last - first).days if hasattr(last, 'days') else 0
        if occ < 2 or span_days < 5:
            continue

        avg_interval = span_days / max(1, occ - 1)
        if avg_interval <= 2:
            freq = 'daily'
            conf = 0.7
        elif avg_interval <= 9:
            freq = 'weekly'
            conf = 0.75
        elif avg_interval <= 35:
            freq = 'monthly'
            conf = 0.85
        elif avg_interval <= 100:
            freq = 'quarterly'
            conf = 0.8
        elif avg_interval <= 400:
            freq = 'yearly'
            conf = 0.75
        else:
            continue

        if conf < 0.7:
            continue

        name = (r.get('merchant') or r.get('title') or r['key_name']).title()
        existing = query_one(
            "SELECT id FROM subscriptions WHERE user_id = %s AND LOWER(name) = LOWER(%s)",
            (user_id, name)
        )
        if existing:
            continue

        detected.append({
            'name': name,
            'amount': float(r['rounded_amount']),
            'frequency': freq,
            'confidence': conf,
            'occurrences': occ,
        })

    return jsonify({'success': True, 'data': {'detected': detected, 'count': len(detected)}})
