import re
import json
import logging
from datetime import date

logger = logging.getLogger(__name__)

_OCR_PROMPT = """You are a financial data extractor. Analyze this bank statement, receipt, or payment screenshot.
Extract ALL transactions visible. Return ONLY a valid JSON array with no markdown, no explanation:
[{"date":"YYYY-MM-DD","title":"description max 150 chars","merchant":"name max 80 chars","amount":0.00,"type":"expense or income","confidence":0.0}]

Rules:
- amount: always a positive float rounded to 2 decimal places
- type: "expense" for payments/debits/paid/sent, "income" for received/credited/deposited/salary
- confidence: float 0.0-1.0 based on how clearly you can read the field
- date: use YYYY-MM-DD format; use today if unclear
- Extract every line item visible; do not summarize or group
- If no transactions are found, return []"""


def ocr_image_to_transactions(image_bytes: bytes, mime_type: str) -> list:
    try:
        import google.generativeai as genai
        from config import config

        genai.configure(api_key=config.GEMINI_API_KEY)
        model = genai.GenerativeModel(model_name=config.GEMINI_MODEL)
        image_part = {'mime_type': mime_type, 'data': image_bytes}
        response = model.generate_content([_OCR_PROMPT, image_part])
        raw_text = response.text.strip() if response.text else '[]'
        return _parse_ocr_response(raw_text)
    except Exception as e:
        logger.error(f'OCR failed ({mime_type}): {e}')
        return []


def _parse_ocr_response(raw_text: str) -> list:
    try:
        cleaned = re.sub(r'^```(?:json)?\s*', '', raw_text.strip())
        cleaned = re.sub(r'\s*```$', '', cleaned.strip())
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            return []

        today = date.today().isoformat()
        result = []
        for item in parsed:
            if not isinstance(item, dict):
                continue
            amount = _safe_float(item.get('amount', 0))
            if amount <= 0:
                continue
            result.append({
                'title': str(item.get('title', 'Transaction'))[:200].strip(),
                'merchant': str(item.get('merchant', item.get('title', '')))[:100].strip(),
                'amount': round(amount, 2),
                'date': str(item.get('date', today)).strip() or today,
                'type': 'income' if str(item.get('type', '')).lower() == 'income' else 'expense',
                'confidence': min(1.0, max(0.0, _safe_float(item.get('confidence', 0.75)))),
            })
        return result
    except Exception as e:
        logger.error(f'OCR response parse failed: {e}')
        return []


def _safe_float(val) -> float:
    try:
        s = str(val).replace(',', '').replace('₹', '').replace('$', '').replace('Rs', '').strip()
        s = re.sub(r'[^\d.]', '', s)
        return abs(float(s))
    except (ValueError, TypeError):
        return 0.0
