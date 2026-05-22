import re

KEYWORD_MAP = {
    'Food & Dining': ['zomato', 'swiggy', 'restaurant', 'food', 'cafe', 'coffee', 'pizza',
                      'burger', 'biryani', 'dine', 'eat', 'meal', 'lunch', 'dinner', 'breakfast',
                      'dominos', 'kfc', 'mcdonalds', 'starbucks', 'tea', 'snack'],
    'Groceries': ['bigbasket', 'blinkit', 'zepto', 'dunzo', 'grocer', 'vegetables', 'fruits',
                  'milk', 'grocery', 'supermarket', 'dmart', 'reliance fresh', 'more'],
    'Transport': ['uber', 'ola', 'rapido', 'metro', 'bus', 'auto', 'taxi', 'fuel', 'petrol',
                  'diesel', 'parking', 'toll', 'train', 'irctc', 'cab'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'nykaa', 'shop', 'store',
                 'mall', 'purchase', 'buy', 'order', 'clothing', 'apparel', 'fashion'],
    'Entertainment': ['netflix', 'hotstar', 'prime video', 'spotify', 'gaana', 'youtube',
                      'movie', 'cinema', 'pvr', 'inox', 'concert', 'gaming', 'steam', 'ps5'],
    'Health & Medical': ['hospital', 'clinic', 'doctor', 'pharmacy', 'medicine', 'medical',
                         'health', 'apollo', 'fortis', 'medplus', 'chemist', 'lab', 'diagnostic'],
    'Utilities': ['electricity', 'water', 'gas', 'internet', 'broadband', 'wifi', 'jio',
                  'airtel', 'bsnl', 'postpaid', 'prepaid', 'recharge', 'utility', 'bill'],
    'Housing & Rent': ['rent', 'housing', 'maintenance', 'society', 'apartment', 'flat',
                       'lease', 'deposit', 'property'],
    'Education': ['course', 'udemy', 'coursera', 'school', 'college', 'tuition', 'book',
                  'library', 'education', 'fees', 'exam', 'coaching', 'upskill'],
    'Travel': ['hotel', 'flight', 'airfare', 'booking', 'makemytrip', 'goibibo', 'oyo',
               'holiday', 'travel', 'trip', 'tour', 'visa', 'passport'],
    'Subscriptions': ['subscription', 'monthly plan', 'annual plan', 'premium', 'membership'],
    'Fitness': ['gym', 'fitness', 'yoga', 'workout', 'cult.fit', 'crossfit', 'protein', 'supplements'],
    'Personal Care': ['salon', 'spa', 'beauty', 'haircut', 'grooming', 'cosmetics', 'skincare'],
    'Investments': ['mutual fund', 'sip', 'stocks', 'zerodha', 'groww', 'upstox', 'ppf', 'fd',
                    'fixed deposit', 'insurance', 'lic'],
    'Salary': ['salary', 'wages', 'payroll', 'paycheck', 'ctc'],
    'Freelance': ['freelance', 'project payment', 'client payment', 'consulting'],
}


def auto_categorize(title, merchant, categories):
    text = f"{(title or '')} {(merchant or '')}".lower()
    text = re.sub(r'[^a-z0-9 ]', ' ', text)

    for cat_name, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if kw in text:
                for cat in categories:
                    if cat.get('name', '').lower() == cat_name.lower():
                        return {'id': cat['id'], 'name': cat['name']}
                break

    for cat in categories:
        if cat.get('name', '').lower() == 'other':
            return {'id': cat['id'], 'name': cat['name']}

    return None
