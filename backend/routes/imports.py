import hashlib
import json
import math
import os
import uuid
from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import query_one, query_all, execute, get_db
from services.import_service import parse_import_file
from services.categorizer import auto_categorize

imports_bp = Blueprint('imports', __name__)

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'pdf', 'png', 'jpg', 'jpeg', 'webp'}


def _make_import_hash(user_id, exp_date, amount, title):
    key = f"{user_id}|{exp_date}|{amount:.2f}|{str(title).lower().strip()}"
    return hashlib.sha256(key.encode()).hexdigest()


def _check_duplicate(user_id, exp_date, amount, title):
    ih = _make_import_hash(user_id, exp_date, float(amount), title)
    row = query_one("SELECT id FROM expenses WHERE import_hash = %s", (ih,))
    return bool(row)


def _job_to_dict(job):
    return {
        'id': job['id'],
        'file_name': job['file_name'],
        'file_type': job.get('file_type_full') or job['file_type'],
        'status': job['status'],
        'total_rows': job.get('total_rows'),
        'imported_rows': job.get('imported_rows'),
        'duplicate_rows': job.get('duplicate_rows'),
        'error_message': job.get('error_message'),
        'ai_insights': job.get('ai_insights'),
        'created_at': job['created_at'].isoformat() if hasattr(job.get('created_at'), 'isoformat') else str(job.get('created_at', '')),
        'updated_at': job['updated_at'].isoformat() if hasattr(job.get('updated_at'), 'isoformat') else str(job.get('updated_at', '')),
    }


@imports_bp.route('/scan', methods=['POST'])
@jwt_required()
def scan():
    user_id = int(get_jwt_identity())

    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'success': False, 'error': 'Empty filename.'}), 400

    ext = os.path.splitext(file.filename)[1].lower().lstrip('.')
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({
            'success': False,
            'error': f'Unsupported file type ".{ext}". Supported: CSV, XLSX, PDF, PNG, JPG, JPEG, WEBP.',
        }), 400

    from config import config
    save_name = f"{uuid.uuid4().hex}.{ext}"
    save_path = config.UPLOAD_FOLDER / save_name
    file.save(str(save_path))

    job_id = execute(
        "INSERT INTO import_jobs (user_id, file_name, file_type, file_type_full, status) "
        "VALUES (%s, %s, %s, %s, 'processing')",
        (user_id, file.filename, ext, ext),
    )

    try:
        rows = parse_import_file(str(save_path), ext)
        categories = query_all(
            "SELECT * FROM categories WHERE user_id IS NULL OR user_id = %s", (user_id,)
        )

        preview = []
        for i, r in enumerate(rows[:200]):
            title = r.get('title', '')
            merchant = r.get('merchant', '')
            amount = float(r.get('amount', 0))
            exp_date = r.get('date', date.today().isoformat())
            tx_type = r.get('type', 'expense')
            confidence = float(r.get('confidence', 0.75))

            # Check merchant alias for smarter categorization
            alias = query_one(
                "SELECT category_id FROM merchant_aliases WHERE user_id=%s AND raw_text=%s LIMIT 1",
                (user_id, merchant[:150] if merchant else title[:150]),
            )
            cat = None
            if alias and alias.get('category_id'):
                for c in categories:
                    if c['id'] == alias['category_id']:
                        cat = {'id': c['id'], 'name': c['name'], 'color': c.get('color', '#64748B')}
                        confidence = min(1.0, confidence + 0.10)
                        break
            if not cat:
                cat_raw = auto_categorize(title, merchant, categories)
                if cat_raw:
                    for c in categories:
                        if c['id'] == cat_raw['id']:
                            cat = {'id': c['id'], 'name': c['name'], 'color': c.get('color', '#64748B')}
                            break

            is_dup = _check_duplicate(user_id, exp_date, amount, title)

            preview.append({
                'row': i,
                'title': title,
                'amount': amount,
                'date': exp_date,
                'merchant': merchant,
                'type': tx_type,
                'suggested_category_id': cat['id'] if cat else None,
                'suggested_category_name': cat['name'] if cat else 'Other',
                'suggested_category_color': cat['color'] if cat else '#64748B',
                'confidence': round(confidence, 2),
                'is_duplicate': is_dup,
            })

        dup_count = sum(1 for p in preview if p['is_duplicate'])

        execute(
            "UPDATE import_jobs SET status='preview', total_rows=%s, preview_data=%s WHERE id=%s",
            (len(rows), json.dumps(preview), job_id),
        )

        return jsonify({
            'success': True,
            'data': {
                'job_id': job_id,
                'status': 'preview',
                'file_name': file.filename,
                'file_type': ext,
                'total_rows': len(rows),
                'duplicate_rows': dup_count,
                'preview': preview[:100],
            },
        })

    except Exception as e:
        execute(
            "UPDATE import_jobs SET status='failed', error_message=%s WHERE id=%s",
            (str(e)[:500], job_id),
        )
        return jsonify({'success': False, 'error': f'Parse error: {str(e)}'}), 422


@imports_bp.route('', methods=['GET'])
@jwt_required()
def list_imports():
    user_id = int(get_jwt_identity())
    page = max(1, int(request.args.get('page', 1)))
    limit = min(50, max(1, int(request.args.get('limit', 10))))
    offset = (page - 1) * limit

    total_row = query_one(
        "SELECT COUNT(*) AS cnt FROM import_jobs WHERE user_id=%s", (user_id,)
    )
    total = total_row['cnt'] if total_row else 0

    jobs = query_all(
        "SELECT id, file_name, file_type, file_type_full, status, total_rows, imported_rows, "
        "duplicate_rows, error_message, ai_insights, created_at, updated_at "
        "FROM import_jobs WHERE user_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (user_id, limit, offset),
    )

    return jsonify({
        'success': True,
        'data': {
            'imports': [_job_to_dict(j) for j in jobs],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': max(1, math.ceil(total / limit)),
            },
        },
    })


@imports_bp.route('/<int:job_id>', methods=['GET'])
@jwt_required()
def get_import(job_id):
    user_id = int(get_jwt_identity())
    job = query_one(
        "SELECT * FROM import_jobs WHERE id=%s AND user_id=%s", (job_id, user_id)
    )
    if not job:
        return jsonify({'success': False, 'error': 'Import job not found.'}), 404

    result = _job_to_dict(job)
    preview_raw = job.get('preview_data')
    if isinstance(preview_raw, str):
        try:
            result['preview'] = json.loads(preview_raw)
        except Exception:
            result['preview'] = []
    elif isinstance(preview_raw, list):
        result['preview'] = preview_raw
    else:
        result['preview'] = []

    ai_raw = job.get('ai_insights')
    if isinstance(ai_raw, str):
        try:
            result['ai_insights'] = json.loads(ai_raw)
        except Exception:
            result['ai_insights'] = []

    return jsonify({'success': True, 'data': result})


@imports_bp.route('/<int:job_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_import(job_id):
    user_id = int(get_jwt_identity())
    job = query_one(
        "SELECT * FROM import_jobs WHERE id=%s AND user_id=%s", (job_id, user_id)
    )
    if not job or job['status'] != 'preview':
        return jsonify({'success': False, 'error': 'Import job not found or not in preview state.'}), 404

    data = request.get_json(silent=True) or {}
    selected_rows = set(data.get('selected_rows', []))
    skip_duplicates = data.get('skip_duplicates', True)
    overrides_list = data.get('overrides', [])
    overrides = {o['row']: o for o in overrides_list}

    preview_raw = job.get('preview_data')
    if isinstance(preview_raw, str):
        preview = json.loads(preview_raw)
    else:
        preview = preview_raw or []

    # If selected_rows not provided, include all non-duplicate (or all if skip_duplicates=False)
    if not selected_rows:
        selected_rows = set(
            item['row'] for item in preview
            if not (skip_duplicates and item.get('is_duplicate'))
        )

    imported = 0
    skipped = 0
    alias_updates = []
    imported_rows_data = []

    with get_db() as conn:
        cursor = conn.cursor()
        for item in preview:
            row_idx = item['row']
            if row_idx not in selected_rows:
                skipped += 1
                continue
            if skip_duplicates and item.get('is_duplicate'):
                skipped += 1
                continue

            override = overrides.get(row_idx, {})
            title = override.get('title', item['title'])
            cat_id = override.get('category_id', item.get('suggested_category_id'))
            tx_type = override.get('type', item.get('type', 'expense'))
            amount = float(item['amount'])
            exp_date = item['date']
            merchant = item.get('merchant', '')

            ih = _make_import_hash(user_id, exp_date, amount, title)
            cursor.execute(
                "INSERT IGNORE INTO expenses "
                "(user_id, category_id, title, amount, type, date, merchant, source, import_hash) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, 'import', %s)",
                (user_id, cat_id, title, amount, tx_type, exp_date, merchant, ih),
            )
            if cursor.rowcount:
                imported += 1
                imported_rows_data.append({
                    'title': title,
                    'amount': amount,
                    'date': exp_date,
                    'type': tx_type,
                    'suggested_category_name': item.get('suggested_category_name', 'Other'),
                })
            else:
                skipped += 1

            # Track alias updates if user overrode the category
            if 'category_id' in override and merchant:
                alias_updates.append((user_id, merchant[:150], merchant[:80], override['category_id']))

        conn.commit()

    # Upsert merchant aliases for user corrections
    for alias_args in alias_updates:
        try:
            execute(
                "INSERT INTO merchant_aliases (user_id, raw_text, clean_name, category_id, match_count) "
                "VALUES (%s, %s, %s, %s, 1) "
                "ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), match_count=match_count+1, updated_at=NOW()",
                alias_args,
            )
        except Exception as e:
            pass

    # Generate AI insights
    insights = []
    try:
        from services.ai_service import generate_import_insights
        insights = generate_import_insights(imported_rows_data, user_id)
    except Exception as e:
        pass

    execute(
        "UPDATE import_jobs SET status='confirmed', imported_rows=%s, duplicate_rows=%s, ai_insights=%s WHERE id=%s",
        (imported, skipped, json.dumps(insights), job_id),
    )

    return jsonify({
        'success': True,
        'data': {
            'imported': imported,
            'skipped': skipped,
            'job_id': job_id,
            'insights': insights,
        },
    })
