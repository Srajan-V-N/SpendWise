from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import query_one, query_all

reports_bp = Blueprint('reports', __name__)


def _fill_months(start_str, end_str, rows):
    period_map = {str(r['period']): r for r in rows}
    result = []
    cur = datetime.strptime(start_str, '%Y-%m-%d').replace(day=1)
    end_ym = datetime.strptime(end_str, '%Y-%m-%d').strftime('%Y-%m')
    while cur.strftime('%Y-%m') <= end_ym:
        key = cur.strftime('%Y-%m')
        result.append(period_map.get(key, {'period': key, 'income': 0.0, 'expenses': 0.0, 'net': 0.0}))
        next_month = cur.month % 12 + 1
        next_year = cur.year + (1 if cur.month == 12 else 0)
        cur = cur.replace(year=next_year, month=next_month)
    return result


@reports_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    user_id = int(get_jwt_identity())
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    group_by = request.args.get('group_by', 'month')

    if not start_date or not end_date:
        today = date.today()
        end_date = today.isoformat()
        start_date = today.replace(month=max(1, today.month - 5), day=1).isoformat()

    totals = query_one(
        """SELECT
             COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
             COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
           FROM expenses WHERE user_id = %s AND date BETWEEN %s AND %s""",
        (user_id, start_date, end_date)
    )

    income = float(totals['income'] or 0)
    expenses = float(totals['expenses'] or 0)
    net = income - expenses
    savings_rate = round(net / income * 100, 1) if income > 0 else 0

    if group_by == 'month':
        fmt = "CONCAT(YEAR(date), '-', LPAD(MONTH(date), 2, '0'))"
    elif group_by == 'week':
        fmt = "YEARWEEK(date, 3)"
    else:
        fmt = "date"

    by_period = query_all(
        f"""SELECT {fmt} AS period,
                 COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
                 COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
            FROM expenses WHERE user_id = %s AND date BETWEEN %s AND %s
            GROUP BY {fmt} ORDER BY {fmt}""",
        (user_id, start_date, end_date)
    )
    for r in by_period:
        r['income'] = float(r['income'])
        r['expenses'] = float(r['expenses'])
        r['net'] = r['income'] - r['expenses']

    if group_by == 'month' and start_date and end_date:
        by_period = _fill_months(start_date, end_date, by_period)

    return jsonify({
        'success': True,
        'data': {
            'period': {'start': start_date, 'end': end_date},
            'totals': {
                'income': income,
                'expenses': expenses,
                'net': net,
                'savings_rate': savings_rate,
            },
            'by_period': by_period,
        }
    })


@reports_bp.route('/trends', methods=['GET'])
@jwt_required()
def trends():
    user_id = int(get_jwt_identity())
    months = min(24, max(1, int(request.args.get('months', 6))))

    rows = query_all(
        """SELECT CONCAT(YEAR(date), '-', LPAD(MONTH(date), 2, '0')) AS month,
                 COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
                 COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
           FROM expenses
           WHERE user_id = %s AND date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
           GROUP BY month ORDER BY month""",
        (user_id, months)
    )

    for r in rows:
        r['income'] = float(r['income'])
        r['expenses'] = float(r['expenses'])
        r['net'] = r['income'] - r['expenses']
        r['savings_rate'] = round(r['net'] / r['income'] * 100, 1) if r['income'] else 0

    avg_income = sum(r['income'] for r in rows) / len(rows) if rows else 0
    avg_expenses = sum(r['expenses'] for r in rows) / len(rows) if rows else 0

    trend_dir = 'stable'
    if len(rows) >= 2:
        recent_avg = sum(r['expenses'] for r in rows[-2:]) / 2
        older_avg = sum(r['expenses'] for r in rows[:max(1, len(rows) - 2)]) / max(1, len(rows) - 2)
        if recent_avg < older_avg * 0.95:
            trend_dir = 'improving'
        elif recent_avg > older_avg * 1.05:
            trend_dir = 'worsening'

    return jsonify({
        'success': True,
        'data': {
            'trends': rows,
            'avg_monthly_income': round(avg_income, 2),
            'avg_monthly_expense': round(avg_expenses, 2),
            'trend_direction': trend_dir,
        }
    })


@reports_bp.route('/categories', methods=['GET'])
@jwt_required()
def categories():
    user_id = int(get_jwt_identity())
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        today = date.today()
        end_date = today.isoformat()
        start_date = today.replace(month=max(1, today.month - 5), day=1).isoformat()

    rows = query_all(
        """SELECT c.id AS category_id, c.name, c.icon, c.color,
                  SUM(e.amount) AS total, COUNT(*) AS transactions,
                  AVG(e.amount) AS avg_transaction
           FROM expenses e
           LEFT JOIN categories c ON c.id = e.category_id
           WHERE e.user_id = %s AND e.type = 'expense'
             AND e.date BETWEEN %s AND %s
           GROUP BY c.id, c.name, c.icon, c.color
           ORDER BY total DESC""",
        (user_id, start_date, end_date)
    )

    total_all = sum(float(r['total']) for r in rows)
    result = []
    for r in rows:
        t = float(r['total'])
        result.append({
            'category_id': r['category_id'],
            'name': r['name'] or 'Other',
            'icon': r['icon'] or 'more-horizontal',
            'color': r['color'] or '#64748B',
            'total': t,
            'transactions': int(r['transactions']),
            'avg_transaction': round(float(r['avg_transaction']), 2),
            'percentage': round(t / total_all * 100, 1) if total_all else 0,
        })

    return jsonify({'success': True, 'data': {'categories': result, 'total': total_all}})


@reports_bp.route('/financial-score', methods=['GET'])
@jwt_required()
def financial_score():
    user_id = int(get_jwt_identity())
    today = date.today()
    start = today.replace(day=1).isoformat()
    end = today.isoformat()

    totals = query_one(
        """SELECT
             COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
             COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
           FROM expenses WHERE user_id = %s AND date BETWEEN %s AND %s""",
        (user_id, start, end)
    )

    income = float(totals['income'] or 0)
    expenses = float(totals['expenses'] or 0)
    savings_rate = ((income - expenses) / income * 100) if income > 0 else 0

    budget_rows = query_all(
        "SELECT id, amount, category_id FROM budgets WHERE user_id = %s AND is_active = 1",
        (user_id,)
    )
    on_track = 0
    for b in budget_rows:
        if b.get('category_id'):
            sr = query_one(
                """SELECT COALESCE(SUM(amount),0) AS total FROM expenses
                   WHERE user_id=%s AND category_id=%s AND type='expense' AND date BETWEEN %s AND %s""",
                (user_id, b['category_id'], start, end)
            )
        else:
            sr = query_one(
                """SELECT COALESCE(SUM(amount),0) AS total FROM expenses
                   WHERE user_id=%s AND type='expense' AND date BETWEEN %s AND %s""",
                (user_id, start, end)
            )
        spent = float(sr['total'] if sr else 0)
        if spent <= float(b['amount']):
            on_track += 1

    budget_adherence = (on_track / len(budget_rows) * 100) if budget_rows else 50

    goals_data = query_all(
        "SELECT target_amount, current_amount FROM goals WHERE user_id = %s AND status = 'active'",
        (user_id,)
    )
    avg_goal_pct = 0
    if goals_data:
        avg_goal_pct = sum(
            float(g['current_amount']) / float(g['target_amount']) * 100
            for g in goals_data if float(g['target_amount']) > 0
        ) / len(goals_data)

    s_score = min(25, int(savings_rate / 40 * 25))
    b_score = min(25, int(budget_adherence / 100 * 25))
    g_score = min(25, int(avg_goal_pct / 100 * 25))
    c_score = 20

    total_score = 5 + s_score + b_score + g_score + c_score

    grade = 'A+' if total_score >= 90 else 'A' if total_score >= 80 else \
            'B+' if total_score >= 70 else 'B' if total_score >= 60 else \
            'C+' if total_score >= 50 else 'C' if total_score >= 40 else 'D'

    return jsonify({
        'success': True,
        'data': {
            'score': total_score,
            'grade': grade,
            'components': {
                'savings_rate': {'score': s_score, 'max': 25, 'value': round(savings_rate, 1), 'label': _rate_label(savings_rate)},
                'budget_adherence': {'score': b_score, 'max': 25, 'value': round(budget_adherence, 1), 'label': _rate_label(budget_adherence)},
                'goal_progress': {'score': g_score, 'max': 25, 'value': round(avg_goal_pct, 1), 'label': _rate_label(avg_goal_pct)},
                'consistency': {'score': c_score, 'max': 25, 'label': 'Stable'},
            },
            'insights': _gen_insights(savings_rate, budget_adherence, avg_goal_pct),
        }
    })


def _rate_label(pct):
    if pct >= 80:
        return 'Excellent'
    if pct >= 60:
        return 'Good'
    if pct >= 40:
        return 'Fair'
    return 'Needs Attention'


def _gen_insights(sr, ba, gp):
    insights = []
    if sr >= 20:
        insights.append("Your savings rate is healthy — keep it up!")
    elif sr < 10:
        insights.append("Try to increase your savings rate to at least 20% of income.")
    if ba < 60:
        insights.append("Multiple budgets are over their limits — review your spending categories.")
    if gp < 30:
        insights.append("Your savings goals need more regular contributions to stay on track.")
    if not insights:
        insights.append("You're doing great! Keep maintaining your financial discipline.")
    return insights
