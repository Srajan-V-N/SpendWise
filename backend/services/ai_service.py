import json
import logging
import google.generativeai as genai
from config import config

logger = logging.getLogger(__name__)

genai.configure(api_key=config.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are WiseBot, the premium AI financial advisor inside SpendWise — India's most intelligent personal finance platform.

Your personality:
- Intelligent, precise, empathetic, and motivating
- Calm, professional yet warm tone
- You speak like a trusted financial advisor, not a generic chatbot
- You never give generic advice — always personalize to the user's actual data
- Knowledgeable about Indian personal finance: UPI, SIPs, mutual funds, FDs, PPF, tax planning, GST

Response style:
- Keep responses concise — 2-4 sentences for simple questions, detailed breakdowns only when asked
- Use ₹ for Indian Rupee formatting with comma separators (₹1,00,000 not ₹100000)
- Use markdown formatting (bold, bullet lists) for clarity when helpful
- Never mention competitor apps
- End with a specific, actionable tip when relevant

Your capabilities:
- Analyze spending patterns and identify problem areas
- Suggest practical budget adjustments
- Create savings plans aligned with goals
- Detect unusual or wasteful spending
- Motivate consistent financial discipline
- Explain financial concepts in simple terms
- Give investment guidance (note: not SEBI registered, always suggest consulting a professional for large investments)"""


def _build_context(user_summary):
    income = user_summary.get('this_month', {}).get('income', 0)
    expenses = user_summary.get('this_month', {}).get('expenses', 0)
    name = user_summary.get('name', 'the user')
    currency = user_summary.get('currency', 'INR')
    symbol = '₹' if currency == 'INR' else currency

    lines = [
        f"USER FINANCIAL CONTEXT (current month):",
        f"Name: {name}",
        f"Monthly Income: {symbol}{income:,.0f}",
        f"Monthly Expenses: {symbol}{expenses:,.0f}",
        f"Net Savings: {symbol}{income - expenses:,.0f}",
    ]

    if income > 0:
        lines.append(f"Savings Rate: {(income - expenses) / income * 100:.1f}%")

    cats = user_summary.get('top_categories', [])
    if cats:
        lines.append("Top Spending Categories:")
        for c in cats[:3]:
            lines.append(f"  - {c['name']}: {symbol}{c['amount']:,.0f}")

    goals = user_summary.get('active_goals', [])
    if goals:
        lines.append("Active Goals:")
        for g in goals:
            lines.append(f"  - {g['title']}: {g['pct']:.0f}% complete ({symbol}{g['current']:,.0f} / {symbol}{g['target']:,.0f})")

    return '\n'.join(lines)


def get_wisebot_response(message, history, user_summary, context_page, context_data):
    model = genai.GenerativeModel(
        model_name=config.GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    context = _build_context(user_summary)
    if context_data:
        context += f"\n\nCurrent page context ({context_page}):\n{json.dumps(context_data, indent=2)}"

    chat_history = []
    for h in history[-10:]:
        role = 'user' if h['role'] == 'user' else 'model'
        chat_history.append({'role': role, 'parts': [h['content']]})

    if chat_history and chat_history[0]['role'] == 'model':
        chat_history = chat_history[1:]

    session = model.start_chat(history=chat_history)

    full_message = f"{context}\n\nUser question: {message}"
    try:
        response = session.send_message(full_message)
        reply = response.text.strip()
    except Exception as e:
        err = str(e).lower()
        if '429' in err or 'quota' in err or 'rate' in err:
            raise ValueError('rate_limit')
        elif '401' in err or '403' in err or 'api key' in err or 'api_key' in err:
            raise ValueError('auth_error')
        raise ValueError('service_error')

    suggestions = _extract_suggestions(reply, message)

    return reply, suggestions


def _extract_suggestions(reply, original_message):
    msg_lower = original_message.lower()
    suggestions = []

    if any(w in msg_lower for w in ['spend', 'overspend', 'expense', 'cost']):
        suggestions.append("Show my spending breakdown")
        suggestions.append("Set a budget for this category")
    elif any(w in msg_lower for w in ['save', 'saving', 'goal']):
        suggestions.append("View my savings goals")
        suggestions.append("How much should I save monthly?")
    elif any(w in msg_lower for w in ['budget', 'limit']):
        suggestions.append("Create a new budget")
        suggestions.append("View all my budgets")
    elif any(w in msg_lower for w in ['subscription', 'recurring', 'monthly']):
        suggestions.append("Detect my subscriptions")
        suggestions.append("Which subscriptions can I cancel?")

    if not suggestions:
        suggestions = [
            "Analyze my spending this month",
            "What's my financial score?",
            "Help me save more money",
        ]

    return suggestions[:3]


def generate_import_insights(imported_rows: list, user_id: int) -> list:
    if not imported_rows:
        return []

    total = sum(r.get('amount', 0) for r in imported_rows if r.get('type') == 'expense')
    income_total = sum(r.get('amount', 0) for r in imported_rows if r.get('type') == 'income')
    count = len(imported_rows)
    dates = sorted(r.get('date', '') for r in imported_rows if r.get('date'))
    date_range = f"{dates[0]} to {dates[-1]}" if dates else 'unknown'

    cat_totals = {}
    for r in imported_rows:
        cat = r.get('suggested_category_name') or r.get('category_name') or 'Other'
        cat_totals[cat] = cat_totals.get(cat, 0) + float(r.get('amount', 0))
    top_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)[:3]
    cats_summary = ', '.join(f"{c}: ₹{v:,.0f}" for c, v in top_cats)

    prompt = (
        f"A user just imported {count} financial transactions.\n"
        f"Total expenses: ₹{total:,.0f}. Total income: ₹{income_total:,.0f}.\n"
        f"Date range: {date_range}.\n"
        f"Top categories: {cats_summary}.\n\n"
        f"Return a JSON array of exactly 3 concise financial insights (no markdown wrapping). "
        f"Each object must have these keys: "
        f"\"type\" (\"summary\"|\"pattern\"|\"tip\"|\"alert\"), "
        f"\"title\" (short, max 50 chars), "
        f"\"body\" (1-2 sentences, specific to this data), "
        f"\"severity\" (\"info\"|\"warning\"|\"success\"). "
        f"Focus on: largest spend category, income vs expense ratio, savings opportunities."
    )

    try:
        model = genai.GenerativeModel(model_name=config.GEMINI_MODEL)
        response = model.generate_content(prompt)
        raw = response.text.strip() if response.text else '[]'
        import re as _re
        raw = _re.sub(r'^```(?:json)?\s*', '', raw.strip())
        raw = _re.sub(r'\s*```$', '', raw.strip())
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            valid = []
            for item in parsed:
                if isinstance(item, dict) and 'title' in item and 'body' in item:
                    valid.append({
                        'type': str(item.get('type', 'tip')),
                        'title': str(item.get('title', ''))[:80],
                        'body': str(item.get('body', ''))[:300],
                        'severity': str(item.get('severity', 'info')),
                    })
            if valid:
                return valid
    except Exception as e:
        logger.warning(f'Import insights generation failed: {e}')

    # Fallback insights from raw stats
    fallback = [{
        'type': 'summary',
        'title': f'{count} transactions imported',
        'body': f'Successfully imported {count} transactions totalling ₹{total:,.0f} in expenses across {len(cat_totals)} categories.',
        'severity': 'success',
    }]
    if top_cats:
        fallback.append({
            'type': 'pattern',
            'title': f'{top_cats[0][0]} is your top category',
            'body': f'₹{top_cats[0][1]:,.0f} was spent on {top_cats[0][0]} in this import. Consider setting a budget.',
            'severity': 'warning' if top_cats[0][1] > total * 0.4 else 'info',
        })
    return fallback


def get_proactive_insights(user_summary):
    income = user_summary.get('this_month', {}).get('income', 0)
    expenses = user_summary.get('this_month', {}).get('expenses', 0)
    cats = user_summary.get('top_categories', [])
    name = user_summary.get('name', 'User')

    insights = []

    if income > 0:
        savings_rate = (income - expenses) / income * 100
        if savings_rate < 0:
            insights.append({
                'type': 'alert',
                'title': 'Spending exceeds income',
                'body': f"You've spent ₹{expenses - income:,.0f} more than your income this month. Review your expenses urgently.",
                'severity': 'danger',
                'action': 'View Expenses',
                'action_link': '/expenses',
            })
        elif savings_rate < 10:
            insights.append({
                'type': 'warning',
                'title': 'Low savings rate',
                'body': f"Your savings rate is {savings_rate:.1f}%. Aim for at least 20% to build financial security.",
                'severity': 'warning',
                'action': 'Review Budget',
                'action_link': '/budgets',
            })
        else:
            insights.append({
                'type': 'success',
                'title': f"Great savings rate, {name.split()[0]}!",
                'body': f"You're saving {savings_rate:.1f}% of your income. Keep it up to reach your goals faster.",
                'severity': 'success',
                'action': 'View Goals',
                'action_link': '/goals',
            })

    if cats:
        top = cats[0]
        if top['amount'] > expenses * 0.4 and expenses > 0:
            insights.append({
                'type': 'tip',
                'title': f"{top['name']} dominates spending",
                'body': f"Over 40% of your spending is on {top['name']}. Consider setting a stricter budget for this category.",
                'severity': 'warning',
                'action': 'Create Budget',
                'action_link': '/budgets',
            })

    if not insights:
        insights.append({
            'type': 'tip',
            'title': 'Stay consistent',
            'body': 'Regular expense tracking builds financial awareness. Log every transaction to get accurate insights.',
            'severity': 'info',
            'action': 'Add Expense',
            'action_link': '/expenses',
        })

    return insights
