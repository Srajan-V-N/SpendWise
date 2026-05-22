from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import query_one, query_all, execute

budgets_bp = Blueprint('budgets', __name__)


def _budget_row(row, spent=0.0):
    amount = float(row['amount'])
    spent = float(spent)
    remaining = max(0, amount - spent)
    pct = round(spent / amount * 100, 1) if amount else 0
    status = 'safe'
    if pct >= 100:
        status = 'exceeded'
    elif pct >= float(row.get('alert_at_pct', 80)):
        status = 'warning'

    return {
        'id': row['id'],
        'name': row['name'],
        'amount': amount,
        'period': row.get('period', 'monthly'),
        'start_date': row['start_date'].isoformat() if hasattr(row.get('start_date'), 'isoformat') else row.get('start_date'),
        'end_date': row['end_date'].isoformat() if row.get('end_date') and hasattr(row['end_date'], 'isoformat') else row.get('end_date'),
        'alert_at_pct': row.get('alert_at_pct', 80),
        'is_active': bool(row.get('is_active', True)),
        'color': row.get('color', '#00FFDD'),
        'spent': spent,
        'remaining': remaining,
        'percentage': pct,
        'status': status,
        'category': {
            'id': row.get('cat_id'),
            'name': row.get('cat_name', 'All Categories'),
            'icon': row.get('cat_icon', 'dollar-sign'),
            'color': row.get('cat_color', '#00FFDD'),
        } if row.get('cat_id') else None,
    }


def _get_month_bounds(month_str=None):
    if month_str:
        try:
            y, m = map(int, month_str.split('-'))
        except Exception:
            y, m = date.today().year, date.today().month
    else:
        y, m = date.today().year, date.today().month

    from calendar import monthrange
    last_day = monthrange(y, m)[1]
    return date(y, m, 1).isoformat(), date(y, m, last_day).isoformat()


@budgets_bp.route('', methods=['GET'])
@jwt_required()
def list_budgets():
    user_id = int(get_jwt_identity())
    month = request.args.get('month')
    start, end = _get_month_bounds(month)

    rows = query_all(
        """SELECT b.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM budgets b
           LEFT JOIN categories c ON c.id = b.category_id
           WHERE b.user_id = %s AND b.is_active = 1
           ORDER BY b.created_at DESC""",
        (user_id,)
    )

    result = []
    total_budgeted = 0.0
    total_spent = 0.0

    for row in rows:
        if row.get('cat_id'):
            spent_row = query_one(
                """SELECT COALESCE(SUM(amount), 0) AS total
                   FROM expenses
                   WHERE user_id = %s AND category_id = %s AND type = 'expense'
                     AND date BETWEEN %s AND %s""",
                (user_id, row['cat_id'], start, end)
            )
        else:
            spent_row = query_one(
                """SELECT COALESCE(SUM(amount), 0) AS total
                   FROM expenses
                   WHERE user_id = %s AND type = 'expense' AND date BETWEEN %s AND %s""",
                (user_id, start, end)
            )
        spent = float(spent_row['total']) if spent_row else 0.0
        budget = _budget_row(row, spent)
        result.append(budget)
        total_budgeted += budget['amount']
        total_spent += spent

    overall_pct = round(total_spent / total_budgeted * 100, 1) if total_budgeted else 0

    return jsonify({
        'success': True,
        'data': {
            'budgets': result,
            'summary': {
                'total_budgeted': total_budgeted,
                'total_spent': total_spent,
                'total_remaining': max(0, total_budgeted - total_spent),
                'overall_percentage': overall_pct,
                'on_track': sum(1 for b in result if b['status'] == 'safe'),
                'warning': sum(1 for b in result if b['status'] == 'warning'),
                'exceeded': sum(1 for b in result if b['status'] == 'exceeded'),
            }
        }
    })


@budgets_bp.route('', methods=['POST'])
@jwt_required()
def create_budget():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    name = (data.get('name') or '').strip()
    amount = data.get('amount')
    category_id = data.get('category_id')
    period = data.get('period', 'monthly')
    start_date = data.get('start_date') or date.today().replace(day=1).isoformat()
    alert_at_pct = data.get('alert_at_pct', 80)
    color = data.get('color', '#00FFDD')

    if not name:
        return jsonify({'success': False, 'error': 'Budget name is required.'}), 422
    if not amount or float(amount) <= 0:
        return jsonify({'success': False, 'error': 'Amount must be positive.'}), 422

    bid = execute(
        """INSERT INTO budgets (user_id, category_id, name, amount, period, start_date, alert_at_pct, color)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (user_id, category_id or None, name, float(amount), period, start_date, alert_at_pct, color)
    )

    row = query_one(
        """SELECT b.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM budgets b LEFT JOIN categories c ON c.id = b.category_id WHERE b.id = %s""",
        (bid,)
    )
    return jsonify({'success': True, 'data': _budget_row(row)}), 201


@budgets_bp.route('/<int:bid>', methods=['PATCH'])
@jwt_required()
def update_budget(bid):
    user_id = int(get_jwt_identity())
    existing = query_one("SELECT id FROM budgets WHERE id = %s AND user_id = %s", (bid, user_id))
    if not existing:
        return jsonify({'success': False, 'error': 'Budget not found.'}), 404

    data = request.get_json(silent=True) or {}
    allowed = ['name', 'amount', 'category_id', 'period', 'start_date', 'alert_at_pct', 'color', 'is_active']
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({'success': False, 'error': 'No valid fields to update.'}), 400

    if 'amount' in updates:
        updates['amount'] = float(updates['amount'])

    sets = ', '.join(f"{k} = %s" for k in updates)
    execute(f"UPDATE budgets SET {sets} WHERE id = %s AND user_id = %s", list(updates.values()) + [bid, user_id])

    row = query_one(
        """SELECT b.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM budgets b LEFT JOIN categories c ON c.id = b.category_id WHERE b.id = %s""",
        (bid,)
    )
    return jsonify({'success': True, 'data': _budget_row(row)})


@budgets_bp.route('/<int:bid>', methods=['DELETE'])
@jwt_required()
def delete_budget(bid):
    user_id = int(get_jwt_identity())
    existing = query_one("SELECT id FROM budgets WHERE id = %s AND user_id = %s", (bid, user_id))
    if not existing:
        return jsonify({'success': False, 'error': 'Budget not found.'}), 404
    execute("DELETE FROM budgets WHERE id = %s AND user_id = %s", (bid, user_id))
    return jsonify({'success': True, 'message': 'Budget deleted.'})
