import re
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)

DATE_FMTS = [
    '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y',
    '%d %b %Y', '%d %B %Y', '%b %d, %Y', '%B %d, %Y',
    '%d-%b-%Y', '%d/%b/%Y', '%Y/%m/%d',
]


def _parse_date(raw):
    if not raw:
        return date.today().isoformat()
    s = str(raw).strip()
    s = re.sub(r'\s+', ' ', s)
    for fmt in DATE_FMTS:
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return date.today().isoformat()


def _parse_amount(raw):
    if raw is None:
        return 0.0
    s = str(raw).replace(',', '').replace('₹', '').replace('$', '').replace('Rs', '').strip()
    s = re.sub(r'[^\d.]', '', s)
    try:
        return abs(float(s))
    except (ValueError, TypeError):
        return 0.0


def _fuzzy_col(headers, candidates):
    hl = [h.lower().strip() for h in headers]
    for c in candidates:
        for i, h in enumerate(hl):
            if c in h:
                return headers[i]
    return None


def parse_csv(path):
    import csv
    rows = []
    with open(path, encoding='utf-8-sig', errors='replace') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        date_col = _fuzzy_col(headers, ['date', 'txn date', 'transaction date', 'value date', 'trans date'])
        desc_col = _fuzzy_col(headers, ['description', 'narration', 'details', 'particulars', 'merchant', 'remark'])
        amount_col = _fuzzy_col(headers, ['amount', 'debit', 'withdrawal', 'spent', 'transaction amount'])
        credit_col = _fuzzy_col(headers, ['credit', 'deposit', 'income'])

        clean_cols = sum(1 for c in [date_col, desc_col, amount_col] if c)
        base_confidence = 0.85 if clean_cols >= 3 else 0.60

        for raw in reader:
            amount = 0.0
            tx_type = 'expense'

            if amount_col:
                amount = _parse_amount(raw.get(amount_col, 0))
            credit_amount = 0.0
            if credit_col:
                credit_amount = _parse_amount(raw.get(credit_col, 0))

            if not amount and credit_amount:
                amount = credit_amount
                tx_type = 'income'
            elif amount and credit_amount and credit_amount > amount:
                amount = credit_amount
                tx_type = 'income'

            if not amount:
                for h in headers:
                    v = _parse_amount(raw.get(h, 0))
                    if v > 0:
                        amount = v
                        break
            if amount == 0:
                continue

            desc = ''
            if desc_col:
                desc = str(raw.get(desc_col, '') or '').strip()
            if not desc:
                for h in headers:
                    if h not in [date_col, amount_col, credit_col]:
                        desc = str(raw.get(h, '') or '').strip()
                        if desc:
                            break

            rows.append({
                'title': desc or 'Unknown Transaction',
                'merchant': desc[:50] if desc else '',
                'amount': amount,
                'date': _parse_date(raw.get(date_col, '') if date_col else ''),
                'type': tx_type,
                'confidence': base_confidence,
            })
    return rows


def parse_xlsx(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows_raw = list(ws.iter_rows(values_only=True))
    if not rows_raw:
        return []

    header_row = None
    for i, r in enumerate(rows_raw[:5]):
        if r and any(str(c).lower().strip() in ['date', 'amount', 'description', 'narration'] for c in r if c):
            header_row = i
            break

    if header_row is None:
        header_row = 0

    headers = [str(c).strip() if c else '' for c in rows_raw[header_row]]
    date_idx = next((i for i, h in enumerate(headers) if 'date' in h.lower()), None)
    desc_idx = next((i for i, h in enumerate(headers) if any(k in h.lower() for k in ['desc', 'narration', 'detail', 'particular', 'merchant'])), None)
    amt_idx = next((i for i, h in enumerate(headers) if any(k in h.lower() for k in ['amount', 'debit', 'withdrawal', 'spent'])), None)
    credit_idx = next((i for i, h in enumerate(headers) if any(k in h.lower() for k in ['credit', 'deposit', 'income'])), None)

    clean_cols = sum(1 for c in [date_idx, desc_idx, amt_idx] if c is not None)
    base_confidence = 0.85 if clean_cols >= 3 else 0.60

    result = []
    for row in rows_raw[header_row + 1:]:
        if not row or all(c is None for c in row):
            continue

        amount = _parse_amount(row[amt_idx]) if amt_idx is not None and amt_idx < len(row) else 0
        credit_amount = _parse_amount(row[credit_idx]) if credit_idx is not None and credit_idx < len(row) else 0
        tx_type = 'expense'

        if not amount and credit_amount:
            amount = credit_amount
            tx_type = 'income'
        elif amount and credit_amount and credit_amount > amount:
            amount = credit_amount
            tx_type = 'income'

        if amount == 0:
            continue

        desc = str(row[desc_idx]).strip() if desc_idx is not None and desc_idx < len(row) and row[desc_idx] else 'Transaction'
        date_raw = row[date_idx] if date_idx is not None and date_idx < len(row) else None
        result.append({
            'title': desc,
            'merchant': desc[:50],
            'amount': amount,
            'date': _parse_date(date_raw),
            'type': tx_type,
            'confidence': base_confidence,
        })
    return result


def parse_pdf(path):
    try:
        import pdfplumber
        rows = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table:
                        continue
                    headers = [str(c or '').lower().strip() for c in table[0]]
                    date_idx = next((i for i, h in enumerate(headers) if 'date' in h), None)
                    desc_idx = next((i for i, h in enumerate(headers) if any(k in h for k in ['desc', 'narration', 'detail', 'merchant', 'particular'])), None)
                    amt_idx = next((i for i, h in enumerate(headers) if any(k in h for k in ['amount', 'debit', 'withdrawal', 'dr'])), None)
                    credit_idx = next((i for i, h in enumerate(headers) if any(k in h for k in ['credit', 'cr', 'deposit'])), None)

                    for row in table[1:]:
                        if not row:
                            continue
                        amount = _parse_amount(row[amt_idx]) if amt_idx is not None and amt_idx < len(row) else 0
                        credit_amount = _parse_amount(row[credit_idx]) if credit_idx is not None and credit_idx < len(row) else 0
                        tx_type = 'expense'

                        if not amount and credit_amount:
                            amount = credit_amount
                            tx_type = 'income'

                        if amount == 0:
                            continue
                        desc = str(row[desc_idx] or '').strip() if desc_idx is not None and desc_idx < len(row) else 'Transaction'
                        date_raw = row[date_idx] if date_idx is not None and date_idx < len(row) else None
                        rows.append({
                            'title': desc,
                            'merchant': desc[:50],
                            'amount': amount,
                            'date': _parse_date(date_raw),
                            'type': tx_type,
                            'confidence': 0.80,
                        })

        if not rows:
            # Attempt OCR fallback for scanned PDFs
            try:
                rows = _pdf_ocr_fallback(path)
                if rows:
                    return rows
            except Exception as ocr_err:
                logger.warning(f'PDF OCR fallback failed: {ocr_err}')

            # Text extraction fallback
            text_rows = []
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text() or ''
                    for line in text.split('\n'):
                        amt_match = re.search(r'[\d,]+\.\d{2}', line)
                        if amt_match:
                            amount = _parse_amount(amt_match.group())
                            if amount > 0:
                                desc = re.sub(r'[\d,]+\.\d{2}', '', line).strip()[:100]
                                text_rows.append({
                                    'title': desc or 'Transaction',
                                    'merchant': desc[:50] if desc else '',
                                    'amount': amount,
                                    'date': date.today().isoformat(),
                                    'type': 'expense',
                                    'confidence': 0.55,
                                })
            return text_rows[:200]

        return rows
    except Exception as e:
        logger.error(f'PDF parse error: {e}')
        return []


def _pdf_ocr_fallback(path):
    import io
    import pdfplumber
    from services.ocr_service import ocr_image_to_transactions

    rows = []
    with pdfplumber.open(path) as pdf:
        for page_num, page in enumerate(pdf.pages[:5]):
            try:
                img = page.to_image(resolution=150).original
                buf = io.BytesIO()
                img.save(buf, format='PNG')
                image_bytes = buf.getvalue()
                page_rows = ocr_image_to_transactions(image_bytes, 'image/png')
                rows.extend(page_rows)
            except Exception as e:
                logger.warning(f'PDF page {page_num} OCR failed: {e}')
    return rows


def parse_image(path: str, mime_type: str) -> list:
    from services.ocr_service import ocr_image_to_transactions
    with open(path, 'rb') as f:
        image_bytes = f.read()
    return ocr_image_to_transactions(image_bytes, mime_type)


MIME_MAP = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
}


def parse_import_file(path, ext, source='generic'):
    ext = ext.lower().lstrip('.')

    if ext in MIME_MAP:
        rows = parse_image(path, MIME_MAP[ext])
    elif ext == 'csv':
        rows = parse_csv(path)
    elif ext in ('xlsx', 'xls'):
        rows = parse_xlsx(path)
    elif ext == 'pdf':
        rows = parse_pdf(path)
    else:
        raise ValueError(f'Unsupported file type: .{ext}')

    cleaned = []
    for r in rows:
        if r.get('amount', 0) > 0 and r.get('title'):
            cleaned.append({
                'title': str(r['title'])[:200].strip(),
                'merchant': str(r.get('merchant', r['title']))[:100].strip(),
                'amount': round(float(r['amount']), 2),
                'date': r.get('date') or date.today().isoformat(),
                'type': r.get('type', 'expense'),
                'confidence': round(float(r.get('confidence', 0.75)), 2),
            })
    return cleaned
