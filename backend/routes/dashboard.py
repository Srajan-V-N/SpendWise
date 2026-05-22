from datetime import date
from calendar import monthrange
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import query_one, query_all

dashboard_bp = Blueprint('dashboard', __name__)


def _get_month_bounds(month_str=None):
    if month_str:
        try:
            y, m = map(int, month_str.split('-'))
        except Exception:
            y, m = date.today().year, date.today().month
    else:
        y, m = date.today().year, date.today().month
    last_day = monthrange(y, m)[1]
    return date(y, m, 1).isoformat(), date(y, m, last_day).isoformat()


@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    user_id = int(get_jwt_identity())
    month = request.args.get('month')
    start, end = _get_month_bounds(month)

    totals = query_one(
        """SELECT
             COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS total_income,
             COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expenses,
             COUNT(*) AS transaction_count
           FROM expenses WHERE user_id = %s AND date BETWEEN %s AND %s""",
        (user_id, start, end)
    )

    income = float(totals['total_income'] or 0)
    expenses = float(totals['total_expenses'] or 0)
    net_balance = income - expenses
    savings_rate = round((net_balance / income * 100), 1) if income > 0 else 0

    top_cats = query_all(
        """SELECT c.id, c.name, c.icon, c.color, SUM(e.amount) AS amount
           FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
           WHERE e.user_id = %s AND e.type = 'expense' AND e.date BETWEEN %s AND %s
           GROUP BY c.id, c.name, c.icon, c.color
           ORDER BY amount DESC LIMIT 5""",
        (user_id, start, end)
    )
    total_exp = float(totals['total_expenses'] or 1)
    for c in top_cats:
        c['amount'] = float(c['amount'])
        c['percentage'] = round(float(c['amount']) / total_exp * 100, 1)

    recent = query_all(
        """SELECT e.id, e.title, e.amount, e.type, e.date, e.payment_method,
                  c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
           WHERE e.user_id = %s
           ORDER BY e.date DESC, e.created_at DESC LIMIT 8""",
        (user_id,)
    )
    for r in recent:
        r['amount'] = float(r['amount'])
        if hasattr(r.get('date'), 'isoformat'):
            r['date'] = r['date'].isoformat()
        r['category'] = {
            'id': r.pop('cat_id'),
            'name': r.pop('cat_name') or 'Other',
            'icon': r.pop('cat_icon') or 'more-horizontal',
            'color': r.pop('cat_color') or '#64748B',
        }

    budgets_raw = query_all(
        """SELECT b.id, b.name, b.amount, b.alert_at_pct, b.color,
                  c.id AS cat_id, c.name AS cat_name
           FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
           WHERE b.user_id = %s AND b.is_active = 1 LIMIT 4""",
        (user_id,)
    )
    budget_health = []
    for b in budgets_raw:
        if b.get('cat_id'):
            sr = query_one(
                """SELECT COALESCE(SUM(amount),0) AS total FROM expenses
                   WHERE user_id=%s AND category_id=%s AND type='expense' AND date BETWEEN %s AND %s""",
                (user_id, b['cat_id'], start, end)
            )
        else:
            sr = query_one(
                """SELECT COALESCE(SUM(amount),0) AS total FROM expenses
                   WHERE user_id=%s AND type='expense' AND date BETWEEN %s AND %s""",
                (user_id, start, end)
            )
        spent = float(sr['total'] if sr else 0)
        limit = float(b['amount'])
        pct = round(spent / limit * 100, 1) if limit else 0
        status = 'safe'
        if pct >= 100:
            status = 'exceeded'
        elif pct >= float(b.get('alert_at_pct', 80)):
            status = 'warning'
        budget_health.append({
            'budget_id': b['id'],
            'name': b['name'],
            'limit': limit,
            'spent': spent,
            'percentage': pct,
            'status': status,
            'color': b.get('color', '#00FFDD'),
        })

    goals_raw = query_all(
        """SELECT id, title, target_amount, current_amount, deadline, icon, color, status
           FROM goals WHERE user_id = %s AND status = 'active'
           ORDER BY deadline ASC LIMIT 4""",
        (user_id,)
    )
    goals_preview = []
    for g in goals_raw:
        target = float(g['target_amount'])
        current = float(g['current_amount'])
        pct = round(current / target * 100, 1) if target else 0
        dl = g.get('deadline')
        if dl and hasattr(dl, 'isoformat'):
            dl = dl.isoformat()
        days_left = None
        if dl:
            from datetime import date as d
            delta = (d.fromisoformat(dl) - d.today()).days
            days_left = max(0, delta)
        goals_preview.append({
            'goal_id': g['id'],
            'title': g['title'],
            'target': target,
            'current': current,
            'percentage': pct,
            'deadline': dl,
            'days_left': days_left,
            'icon': g.get('icon', 'target'),
            'color': g.get('color', '#00FFDD'),
        })

    subs = query_all(
        """SELECT id, name, amount, billing_cycle, next_billing_date
           FROM subscriptions
           WHERE user_id = %s AND status = 'active'
             AND next_billing_date BETWEEN %s AND DATE_ADD(%s, INTERVAL 10 DAY)
           ORDER BY next_billing_date ASC LIMIT 5""",
        (user_id, date.today().isoformat(), date.today().isoformat())
    )
    subscription_reminders = []
    for s in subs:
        nbd = s.get('next_billing_date')
        if nbd and hasattr(nbd, 'isoformat'):
            nbd = nbd.isoformat()
        days_until = None
        if nbd:
            delta = (date.fromisoformat(nbd) - date.today()).days
            days_until = max(0, delta)
        subscription_reminders.append({
            'subscription_id': s['id'],
            'name': s['name'],
            'amount': float(s['amount']),
            'billing_cycle': s.get('billing_cycle', 'monthly'),
            'next_billing_date': nbd,
            'days_until': days_until,
        })

    trend_data = query_all(
        """SELECT date,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
             SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income
           FROM expenses WHERE user_id = %s AND date BETWEEN %s AND %s
           GROUP BY date ORDER BY date""",
        (user_id, start, end)
    )
    for r in trend_data:
        r['expenses'] = float(r['expenses'])
        r['income'] = float(r['income'])
        if hasattr(r.get('date'), 'isoformat'):
            r['date'] = r['date'].isoformat()

    financial_score = _calc_score(user_id, savings_rate, budget_health, goals_preview)

    return jsonify({
        'success': True,
        'data': {
            'period': {'month': month or date.today().strftime('%Y-%m'), 'start': start, 'end': end},
            'kpis': {
                'total_income': income,
                'total_expenses': expenses,
                'net_balance': net_balance,
                'savings_rate': savings_rate,
                'financial_score': financial_score,
                'transaction_count': int(totals['transaction_count'] or 0),
            },
            'top_categories': top_cats,
            'recent_transactions': recent,
            'budget_health': budget_health,
            'goals_preview': goals_preview,
            'subscription_reminders': subscription_reminders,
            'spending_trend': trend_data,
        }
    })


def _calc_score(user_id, savings_rate, budget_health, goals_preview):
    score = 50

    if savings_rate >= 30:
        score += 20
    elif savings_rate >= 20:
        score += 15
    elif savings_rate >= 10:
        score += 8
    elif savings_rate >= 0:
        score += 3

    if budget_health:
        safe_count = sum(1 for b in budget_health if b['status'] == 'safe')
        ratio = safe_count / len(budget_health)
        score += int(ratio * 15)

    if goals_preview:
        avg_pct = sum(g['percentage'] for g in goals_preview) / len(goals_preview)
        score += int(avg_pct / 100 * 15)

    return min(100, max(0, score))
