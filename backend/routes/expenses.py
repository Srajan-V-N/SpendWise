import hashlib
import os
from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import query_one, query_all, execute, get_db
from services.import_service import parse_import_file
from services.categorizer import auto_categorize

expenses_bp = Blueprint('expenses', __name__)


def _expense_row(row):
    if not row:
        return None
    tags = row.get('tags')
    if isinstance(tags, str):
        import json
        try:
            tags = json.loads(tags)
        except Exception:
            tags = []
    return {
        'id': row['id'],
        'title': row['title'],
        'amount': float(row['amount']),
        'type': row['type'],
        'date': row['date'].isoformat() if hasattr(row['date'], 'isoformat') else row['date'],
        'note': row.get('note'),
        'merchant': row.get('merchant'),
        'payment_method': row.get('payment_method', 'upi'),
        'tags': tags or [],
        'receipt_url': row.get('receipt_url'),
        'source': row.get('source', 'manual'),
        'is_recurring': bool(row.get('is_recurring', False)),
        'category': {
            'id': row.get('cat_id'),
            'name': row.get('cat_name', 'Other'),
            'icon': row.get('cat_icon', 'more-horizontal'),
            'color': row.get('cat_color', '#64748B'),
        } if row.get('cat_id') else None,
        'created_at': row['created_at'].isoformat() if hasattr(row.get('created_at'), 'isoformat') else row.get('created_at'),
    }


def _make_import_hash(user_id, exp_date, amount, title):
    raw = f"{user_id}|{exp_date}|{float(amount):.2f}|{str(title).lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()


@expenses_bp.route('', methods=['GET'])
@jwt_required()
def list_expenses():
    user_id = int(get_jwt_identity())
    page = max(1, int(request.args.get('page', 1)))
    limit = min(100, max(1, int(request.args.get('limit', 20))))
    offset = (page - 1) * limit

    search = request.args.get('search', '').strip()
    category_id = request.args.get('category_id')
    exp_type = request.args.get('type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    payment_method = request.args.get('payment_method')
    sort = request.args.get('sort', 'date')
    order = 'ASC' if request.args.get('order', 'desc').upper() == 'ASC' else 'DESC'

    sort_col = {
        'date': 'e.date', 'amount': 'e.amount', 'title': 'e.title',
        'created_at': 'e.created_at',
    }.get(sort, 'e.date')

    wheres = ['e.user_id = %s']
    params = [user_id]

    if search:
        wheres.append('(e.title LIKE %s OR e.merchant LIKE %s)')
        params += [f'%{search}%', f'%{search}%']
    if category_id:
        wheres.append('e.category_id = %s')
        params.append(int(category_id))
    if exp_type in ('expense', 'income'):
        wheres.append('e.type = %s')
        params.append(exp_type)
    if start_date:
        wheres.append('e.date >= %s')
        params.append(start_date)
    if end_date:
        wheres.append('e.date <= %s')
        params.append(end_date)
    if payment_method:
        wheres.append('e.payment_method = %s')
        params.append(payment_method)

    where_clause = ' AND '.join(wheres)

    count_row = query_one(
        f"SELECT COUNT(*) AS total FROM expenses e WHERE {where_clause}",
        params
    )
    total = count_row['total'] if count_row else 0

    sql = f"""
        SELECT e.*,
               c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
        FROM expenses e
        LEFT JOIN categories c ON c.id = e.category_id
        WHERE {where_clause}
        ORDER BY {sort_col} {order}
        LIMIT %s OFFSET %s
    """
    rows = query_all(sql, params + [limit, offset])

    return jsonify({
        'success': True,
        'data': {
            'expenses': [_expense_row(r) for r in rows],
            'pagination': {'page': page, 'limit': limit, 'total': total, 'pages': -(-total // limit)},
        }
    })


@expenses_bp.route('', methods=['POST'])
@jwt_required()
def create_expense():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    title = (data.get('title') or '').strip()
    amount = data.get('amount')
    exp_type = data.get('type', 'expense')
    exp_date = data.get('date') or date.today().isoformat()
    category_id = data.get('category_id')
    note = data.get('note', '')
    merchant = data.get('merchant', '')
    payment_method = data.get('payment_method', 'upi')
    tags = data.get('tags', [])

    if not title:
        return jsonify({'success': False, 'error': 'Title is required.'}), 422
    if amount is None or float(amount) <= 0:
        return jsonify({'success': False, 'error': 'Amount must be positive.'}), 422

    import json
    import_hash = _make_import_hash(user_id, exp_date, amount, title)

    exp_id = execute(
        """INSERT INTO expenses
           (user_id, category_id, title, amount, type, date, note, merchant,
            payment_method, tags, source, import_hash)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'manual', %s)""",
        (user_id, category_id or None, title, float(amount), exp_type,
         exp_date, note, merchant, payment_method, json.dumps(tags), import_hash)
    )

    row = query_one(
        """SELECT e.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
           WHERE e.id = %s""", (exp_id,)
    )
    return jsonify({'success': True, 'data': _expense_row(row)}), 201


@expenses_bp.route('/<int:exp_id>', methods=['GET'])
@jwt_required()
def get_expense(exp_id):
    user_id = int(get_jwt_identity())
    row = query_one(
        """SELECT e.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
           WHERE e.id = %s AND e.user_id = %s""",
        (exp_id, user_id)
    )
    if not row:
        return jsonify({'success': False, 'error': 'Expense not found.'}), 404
    return jsonify({'success': True, 'data': _expense_row(row)})


@expenses_bp.route('/<int:exp_id>', methods=['PATCH'])
@jwt_required()
def update_expense(exp_id):
    user_id = int(get_jwt_identity())
    existing = query_one("SELECT id FROM expenses WHERE id = %s AND user_id = %s", (exp_id, user_id))
    if not existing:
        return jsonify({'success': False, 'error': 'Expense not found.'}), 404

    data = request.get_json(silent=True) or {}
    allowed = ['title', 'amount', 'type', 'date', 'category_id', 'note', 'merchant', 'payment_method', 'tags']
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({'success': False, 'error': 'No valid fields to update.'}), 400

    import json
    if 'tags' in updates and isinstance(updates['tags'], list):
        updates['tags'] = json.dumps(updates['tags'])
    if 'amount' in updates:
        updates['amount'] = float(updates['amount'])

    sets = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [exp_id, user_id]
    execute(f"UPDATE expenses SET {sets} WHERE id = %s AND user_id = %s", values)

    row = query_one(
        """SELECT e.*, c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
           FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
           WHERE e.id = %s""", (exp_id,)
    )
    return jsonify({'success': True, 'data': _expense_row(row)})


@expenses_bp.route('/<int:exp_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(exp_id):
    user_id = int(get_jwt_identity())
    existing = query_one("SELECT id FROM expenses WHERE id = %s AND user_id = %s", (exp_id, user_id))
    if not existing:
        return jsonify({'success': False, 'error': 'Expense not found.'}), 404
    execute("DELETE FROM expenses WHERE id = %s AND user_id = %s", (exp_id, user_id))
    return jsonify({'success': True, 'message': 'Expense deleted.'})


@expenses_bp.route('/categories', methods=['GET'])
@jwt_required()
def list_categories():
    user_id = int(get_jwt_identity())
    rows = query_all(
        "SELECT * FROM categories WHERE user_id IS NULL OR user_id = %s ORDER BY type, name",
        (user_id,)
    )
    return jsonify({'success': True, 'data': {'categories': rows}})


@expenses_bp.route('/stats', methods=['GET'])
@jwt_required()
def expense_stats():
    user_id = int(get_jwt_identity())
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        from datetime import date
        today = date.today()
        start_date = today.replace(day=1).isoformat()
        end_date = today.isoformat()

    by_cat = query_all(
        """SELECT c.id AS category_id, c.name, c.icon, c.color,
                  SUM(e.amount) AS total, COUNT(*) AS count
           FROM expenses e
           LEFT JOIN categories c ON c.id = e.category_id
           WHERE e.user_id = %s AND e.type = 'expense'
             AND e.date BETWEEN %s AND %s
           GROUP BY c.id, c.name, c.icon, c.color
           ORDER BY total DESC""",
        (user_id, start_date, end_date)
    )

    total_expense = sum(float(r['total']) for r in by_cat)
    for r in by_cat:
        r['total'] = float(r['total'])
        r['percentage'] = round(float(r['total']) / total_expense * 100, 1) if total_expense else 0

    by_method = query_all(
        """SELECT payment_method AS method, SUM(amount) AS total, COUNT(*) AS count
           FROM expenses
           WHERE user_id = %s AND type = 'expense' AND date BETWEEN %s AND %s
           GROUP BY payment_method ORDER BY total DESC""",
        (user_id, start_date, end_date)
    )
    for r in by_method:
        r['total'] = float(r['total'])

    daily = query_all(
        """SELECT date, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
                  SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income
           FROM expenses
           WHERE user_id = %s AND date BETWEEN %s AND %s
           GROUP BY date ORDER BY date""",
        (user_id, start_date, end_date)
    )
    for r in daily:
        r['expenses'] = float(r['expenses'])
        r['income'] = float(r['income'])
        if hasattr(r['date'], 'isoformat'):
            r['date'] = r['date'].isoformat()

    return jsonify({
        'success': True,
        'data': {
            'by_category': by_cat,
            'by_payment_method': by_method,
            'daily_totals': daily,
        }
    })


@expenses_bp.route('/import', methods=['POST'])
@jwt_required()
def import_expenses():
    user_id = int(get_jwt_identity())
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded.'}), 400

    file = request.files['file']
    source = request.form.get('source', 'generic')
    if not file.filename:
        return jsonify({'success': False, 'error': 'Empty filename.'}), 400

    from config import config
    import uuid
    ext = os.path.splitext(file.filename)[1].lower()
    save_name = f"{uuid.uuid4().hex}{ext}"
    save_path = config.UPLOAD_FOLDER / save_name
    file.save(str(save_path))

    job_id = execute(
        "INSERT INTO import_jobs (user_id, file_name, file_type, status) VALUES (%s, %s, %s, 'processing')",
        (user_id, file.filename, ext.lstrip('.'))
    )

    try:
        rows = parse_import_file(str(save_path), ext, source)
        categories = query_all(
            "SELECT * FROM categories WHERE user_id IS NULL OR user_id = %s", (user_id,)
        )
        preview = []
        for i, r in enumerate(rows[:200]):
            cat = auto_categorize(r.get('title', ''), r.get('merchant', ''), categories)
            preview.append({
                'row': i,
                'title': r.get('title', ''),
                'amount': float(r.get('amount', 0)),
                'date': r.get('date', ''),
                'merchant': r.get('merchant', ''),
                'suggested_category_id': cat['id'] if cat else None,
                'suggested_category': cat['name'] if cat else 'Other',
                'is_duplicate': _check_duplicate(user_id, r.get('date'), r.get('amount', 0), r.get('title', '')),
            })

        import json
        execute(
            "UPDATE import_jobs SET status='preview', total_rows=%s, preview_data=%s WHERE id=%s",
            (len(rows), json.dumps(preview), job_id)
        )

        return jsonify({
            'success': True,
            'data': {
                'job_id': job_id,
                'status': 'preview',
                'total_rows': len(rows),
                'duplicate_rows': sum(1 for p in preview if p['is_duplicate']),
                'preview': preview[:50],
            }
        })
    except Exception as e:
        execute("UPDATE import_jobs SET status='failed', error_message=%s WHERE id=%s", (str(e), job_id))
        return jsonify({'success': False, 'error': f'Parse error: {str(e)}'}), 422


@expenses_bp.route('/import/<int:job_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_import(job_id):
    user_id = int(get_jwt_identity())
    job = query_one("SELECT * FROM import_jobs WHERE id = %s AND user_id = %s", (job_id, user_id))
    if not job or job['status'] != 'preview':
        return jsonify({'success': False, 'error': 'Import job not found or not in preview state.'}), 404

    data = request.get_json(silent=True) or {}
    skip_duplicates = data.get('skip_duplicates', True)
    overrides = {o['row']: o.get('category_id') for o in data.get('overrides', [])}

    import json
    preview = json.loads(job['preview_data']) if isinstance(job['preview_data'], str) else job['preview_data']

    imported = 0
    skipped = 0

    with get_db() as conn:
        cursor = conn.cursor()
        for item in preview:
            if skip_duplicates and item.get('is_duplicate'):
                skipped += 1
                continue
            cat_id = overrides.get(item['row'], item.get('suggested_category_id'))
            ih = _make_import_hash(user_id, item['date'], item['amount'], item['title'])
            cursor.execute(
                """INSERT IGNORE INTO expenses
                   (user_id, category_id, title, amount, type, date, merchant, source, import_hash)
                   VALUES (%s, %s, %s, %s, 'expense', %s, %s, 'import', %s)""",
                (user_id, cat_id, item['title'], item['amount'],
                 item['date'], item.get('merchant', ''), ih)
            )
            if cursor.rowcount:
                imported += 1
            else:
                skipped += 1
        conn.commit()

    execute(
        "UPDATE import_jobs SET status='confirmed', imported_rows=%s, duplicate_rows=%s WHERE id=%s",
        (imported, skipped, job_id)
    )

    return jsonify({'success': True, 'data': {'imported': imported, 'skipped': skipped}})


def _check_duplicate(user_id, exp_date, amount, title):
    ih = _make_import_hash(user_id, exp_date, amount, title)
    row = query_one("SELECT id FROM expenses WHERE import_hash = %s", (ih,))
    return bool(row)
