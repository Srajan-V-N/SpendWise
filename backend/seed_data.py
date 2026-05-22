"""
SpendWise seed script — populates test@example.com with 6 months of realistic INR data.

Usage (from backend/ directory):
    python seed_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
import json
from datetime import date, timedelta

# python-dateutil ships with many Flask projects; fallback if missing
try:
    from dateutil.relativedelta import relativedelta
except ImportError:
    class relativedelta:
        def __init__(self, months=0, days=0):
            self._months = months
            self._days = days
        def __rsub__(self, other):
            y, m = other.year, other.month - self._months
            while m <= 0:
                m += 12
                y -= 1
            import calendar
            d = min(other.day, calendar.monthrange(y, m)[1])
            return other.replace(year=y, month=m, day=d) - timedelta(days=self._days)

from database import get_db, init_db

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEMO_EMAIL    = "test@example.com"
DEMO_PASSWORD = "Test@123"
DEMO_NAME     = "Arjun Sharma"
MONTHLY_INCOME = 85000.00

TODAY = date.today()

def first_of_month(d=None):
    d = d or TODAY
    return d.replace(day=1)

def last_of_month(d=None):
    import calendar
    d = d or TODAY
    return d.replace(day=calendar.monthrange(d.year, d.month)[1])

def months_ago(n):
    """Return date n months before today."""
    d = TODAY
    m = d.month - n
    y = d.year
    while m <= 0:
        m += 12
        y -= 1
    import calendar
    day = min(d.day, calendar.monthrange(y, m)[1])
    return d.replace(year=y, month=m, day=day)

def day_in_month(months_back, day):
    """Return a specific day within a past month, clamped to month length."""
    import calendar
    base = months_ago(months_back)
    max_day = calendar.monthrange(base.year, base.month)[1]
    return base.replace(day=min(day, max_day))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def get_category_ids(conn):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name FROM categories WHERE is_default = 1")
    rows = cursor.fetchall()
    return {r["name"]: r["id"] for r in rows}


def upsert_user(conn):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email = %s", (DEMO_EMAIL,))
    row = cursor.fetchone()
    if row:
        uid = row["id"]
        cursor.execute(
            """UPDATE users SET name=%s, monthly_income=%s, onboarded=1, currency='INR'
               WHERE id=%s""",
            (DEMO_NAME, MONTHLY_INCOME, uid),
        )
    else:
        pw_hash = hash_password(DEMO_PASSWORD)
        cursor.execute(
            """INSERT INTO users (name, email, password_hash, currency, monthly_income, onboarded)
               VALUES (%s, %s, %s, 'INR', %s, 1)""",
            (DEMO_NAME, DEMO_EMAIL, pw_hash, MONTHLY_INCOME),
        )
        uid = cursor.lastrowid
    conn.commit()
    return uid


def clear_user_data(conn, uid):
    cursor = conn.cursor()
    for table in [
        "notifications", "goal_contributions", "goals",
        "subscriptions", "budgets", "expenses",
    ]:
        cursor.execute(f"DELETE FROM {table} WHERE user_id = %s", (uid,))
    conn.commit()


# ---------------------------------------------------------------------------
# Expense data factory
# ---------------------------------------------------------------------------

def build_expenses(uid, cats):
    rows = []

    def add(title, amount, cat_name, tx_type, d, merchant=None, method="upi",
            tags=None, note=None):
        rows.append((
            uid,
            cats.get(cat_name),
            title,
            amount,
            tx_type,
            d,
            note,
            merchant,
            method,
            json.dumps(tags) if tags else None,
            "manual",
            0,
        ))

    # --- 6 months of salary income ---
    for mo in range(5, -1, -1):
        add("Monthly Salary", 85000.00, "Salary", "income",
            day_in_month(mo, 1), merchant="TechCorp Pvt Ltd", method="netbanking",
            tags=["salary", "income"])

    # --- Freelance income (3 months) ---
    add("Freelance - UI Design", 18000.00, "Freelance", "income",
        day_in_month(4, 14), merchant="Upwork", method="netbanking")
    add("Freelance - React Module", 22500.00, "Freelance", "income",
        day_in_month(2, 20), merchant="Toptal", method="netbanking")
    add("Freelance - Logo Design", 9500.00, "Freelance", "income",
        day_in_month(1, 8), merchant="Fiverr", method="upi")

    # --- Housing & Rent (every month) ---
    for mo in range(5, -1, -1):
        add("Monthly Rent", 20000.00, "Housing & Rent", "expense",
            day_in_month(mo, 3), merchant="Landlord Sharma", method="netbanking",
            tags=["rent", "housing"])

    # --- Food & Dining ---
    food = [
        ("Zomato Order", 680, "Zomato", "upi"),
        ("Swiggy Dinner", 920, "Swiggy", "upi"),
        ("Pizza Hut Lunch", 1240, "Pizza Hut", "card"),
        ("Chai & Snacks", 180, "Local Tapri", "cash"),
        ("McDonald's", 540, "McDonald's", "upi"),
        ("Swiggy Biryani", 450, "Swiggy", "upi"),
        ("Zomato Breakfast", 310, "Zomato", "upi"),
        ("Dinner with Friends", 2200, "Barbeque Nation", "card"),
        ("Office Lunch", 250, "Canteen", "cash"),
        ("Subway Meal", 390, "Subway", "upi"),
        ("Zomato Order", 750, "Zomato", "upi"),
        ("Swiggy Pizza", 860, "Swiggy", "upi"),
        ("Cafe Coffee Day", 420, "CCD", "card"),
        ("Chinese Takeout", 1100, "Mandarin", "upi"),
        ("Swiggy Lunch", 560, "Swiggy", "upi"),
        ("Domino's Pizza", 780, "Domino's", "upi"),
        ("Zomato Order", 630, "Zomato", "upi"),
        ("Biryani House", 380, "Paradise Biryani", "cash"),
        ("Dinner Date", 1850, "The Fatty Bao", "card"),
        ("Zomato Breakfast", 290, "Zomato", "upi"),
    ]
    food_days = [5, 8, 10, 12, 14, 16, 18, 20, 22, 24,
                 4, 7, 11, 15, 19, 23, 6, 9, 13, 17]
    food_months = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2,
                   2, 2, 3, 3, 3, 4, 4, 4, 5, 5]
    for (title, amt, merch, meth), day, mo in zip(food, food_days, food_months):
        add(title, amt, "Food & Dining", "expense",
            day_in_month(mo, day), merchant=merch, method=meth, tags=["food"])

    # --- Groceries ---
    groceries = [
        (3200, "BigBasket", 2, 0), (2800, "DMart", 18, 0),
        (3800, "BigBasket", 4, 1), (2200, "Zepto", 20, 1),
        (4100, "BigBasket", 5, 2), (1900, "Blinkit", 22, 2),
        (2600, "DMart", 3, 3),    (3300, "BigBasket", 19, 3),
        (2400, "Zepto", 6, 4),    (3700, "BigBasket", 21, 4),
        (2900, "DMart", 7, 5),    (1800, "Blinkit", 23, 5),
    ]
    for amt, merch, day, mo in groceries:
        add("Grocery Shopping", amt, "Groceries", "expense",
            day_in_month(mo, day), merchant=merch, method="upi", tags=["grocery"])

    # --- Transport ---
    transport = [
        ("Ola Cab", 280, "Ola", 3, 0), ("Metro Recharge", 500, "DMRC", 6, 0),
        ("Uber Ride", 340, "Uber", 9, 0), ("Ola Cab", 195, "Ola", 14, 0),
        ("Rapido Bike", 85, "Rapido", 18, 0), ("Uber Ride", 420, "Uber", 2, 1),
        ("Metro Recharge", 500, "DMRC", 5, 1), ("Ola Cab", 255, "Ola", 11, 1),
        ("Uber Ride", 370, "Uber", 16, 1), ("Rapido Bike", 95, "Rapido", 20, 1),
        ("Ola Cab", 310, "Ola", 4, 2), ("Metro Recharge", 500, "DMRC", 8, 2),
        ("Uber Ride", 285, "Uber", 13, 2), ("Ola Cab", 440, "Ola", 3, 3),
        ("Rapido Bike", 75, "Rapido", 10, 3), ("Uber Ride", 395, "Uber", 5, 4),
        ("Ola Cab", 230, "Ola", 12, 4), ("Metro Recharge", 500, "DMRC", 2, 5),
    ]
    for title, amt, merch, day, mo in transport:
        add(title, amt, "Transport", "expense",
            day_in_month(mo, day), merchant=merch, method="upi")

    # --- Shopping ---
    shopping = [
        ("Amazon - Headphones", 3499, "Amazon", "card", 7, 0),
        ("Myntra - T-Shirts", 1299, "Myntra", "card", 15, 0),
        ("Flipkart - Books", 899, "Flipkart", "upi", 8, 1),
        ("Amazon - Skincare", 1650, "Amazon", "card", 22, 1),
        ("Meesho - Clothes", 749, "Meesho", "upi", 9, 2),
        ("Amazon - Keyboard", 2799, "Amazon", "card", 18, 2),
        ("Myntra - Shoes", 4499, "Myntra", "card", 10, 3),
        ("Flipkart - Earbuds", 1799, "Flipkart", "upi", 11, 4),
        ("Amazon - Stationery", 580, "Amazon", "upi", 14, 5),
    ]
    for title, amt, merch, meth, day, mo in shopping:
        add(title, amt, "Shopping", "expense",
            day_in_month(mo, day), merchant=merch, method=meth, tags=["shopping"])

    # --- Entertainment ---
    entertainment = [
        ("PVR Cinema Tickets", 950, "PVR", "card", 8, 0),
        ("Lollapalooza Tickets", 1800, "BookMyShow", "card", 20, 0),
        ("Movie Night", 700, "INOX", "upi", 9, 1),
        ("Bowling Night", 850, "Smaaash", "card", 17, 2),
        ("Comedy Show", 1500, "BookMyShow", "card", 12, 3),
        ("Weekend Event", 600, "Insider.in", "upi", 16, 4),
        ("OTT Rent Movie", 199, "Apple TV", "card", 5, 5),
    ]
    for title, amt, merch, meth, day, mo in entertainment:
        add(title, amt, "Entertainment", "expense",
            day_in_month(mo, day), merchant=merch, method=meth)

    # --- Health & Medical ---
    health = [
        ("Apollo Pharmacy", 680, "Apollo", "upi", 10, 0),
        ("Doctor Consultation", 800, "Fortis", "card", 3, 1),
        ("MedPlus Medicine", 430, "MedPlus", "upi", 7, 2),
        ("Practo Appointment", 1200, "Practo", "card", 14, 3),
        ("Pharmacy", 320, "Local Pharmacy", "cash", 9, 4),
        ("Health Checkup", 2499, "Max Healthcare", "card", 11, 5),
    ]
    for title, amt, merch, meth, day, mo in health:
        add(title, amt, "Health & Medical", "expense",
            day_in_month(mo, day), merchant=merch, method=meth)

    # --- Utilities ---
    utilities = [
        ("Electricity Bill", 2200, "BSES Delhi", "netbanking", 7, 0),
        ("Internet Bill", 999, "Jio Fiber", "upi", 5, 0),
        ("Electricity Bill", 1800, "BSES Delhi", "netbanking", 8, 1),
        ("Internet Bill", 999, "Jio Fiber", "upi", 5, 1),
        ("Electricity Bill", 2450, "BSES Delhi", "netbanking", 7, 2),
        ("Internet Bill", 999, "Jio Fiber", "upi", 5, 2),
        ("Electricity Bill", 1650, "BSES Delhi", "netbanking", 8, 3),
        ("Internet Bill", 999, "Jio Fiber", "upi", 5, 3),
        ("Electricity Bill", 2100, "BSES Delhi", "netbanking", 7, 4),
        ("Internet Bill", 999, "Jio Fiber", "upi", 5, 4),
        ("Electricity Bill", 1950, "BSES Delhi", "netbanking", 8, 5),
        ("Internet Bill", 999, "Jio Fiber", "upi", 5, 5),
    ]
    for title, amt, merch, meth, day, mo in utilities:
        add(title, amt, "Utilities", "expense",
            day_in_month(mo, day), merchant=merch, method=meth)

    # --- Education ---
    education = [
        ("Udemy - React Course", 799, "Udemy", 10, 1),
        ("Coursera Subscription", 2499, "Coursera", 15, 3),
        ("O'Reilly Books", 1499, "O'Reilly", 8, 5),
    ]
    for title, amt, merch, day, mo in education:
        add(title, amt, "Education", "expense",
            day_in_month(mo, day), merchant=merch, method="card")

    # --- Fitness (monthly gym) ---
    for mo in range(5, -1, -1):
        add("Cult.fit Membership", 1500, "Fitness", "expense",
            day_in_month(mo, 2), merchant="Cult.fit", method="card",
            tags=["gym", "fitness"])

    # --- Personal Care ---
    care = [(700, "Naturals Salon", 11, 0), (550, "YLG Salon", 13, 1),
            (850, "Naturals Salon", 10, 2), (600, "Local Salon", 12, 3),
            (900, "Naturals Salon", 11, 4), (650, "YLG Salon", 14, 5)]
    for amt, merch, day, mo in care:
        add("Salon & Grooming", amt, "Personal Care", "expense",
            day_in_month(mo, day), merchant=merch, method="upi")

    # --- Investments (SIP every month) ---
    sip_amounts = [12000, 12000, 15000, 12000, 10000, 12000]
    for i, (mo, amt) in enumerate(zip(range(5, -1, -1), sip_amounts)):
        add("Mutual Fund SIP", amt, "Investments", "expense",
            day_in_month(mo, 10), merchant="Zerodha Coin", method="netbanking",
            tags=["sip", "investment"])

    return rows


# ---------------------------------------------------------------------------
# Budget data
# ---------------------------------------------------------------------------

def build_budgets(uid, cats):
    start = first_of_month()
    end   = last_of_month()
    return [
        (uid, cats.get("Food & Dining"),    "Food & Dining Budget",  8000.00, "monthly", start, end, 80, 1, "#FF6B6B"),
        (uid, cats.get("Groceries"),        "Groceries Budget",      6000.00, "monthly", start, end, 75, 1, "#FF8C42"),
        (uid, cats.get("Transport"),        "Transport Budget",      3000.00, "monthly", start, end, 80, 1, "#4DA3FF"),
        (uid, cats.get("Shopping"),         "Shopping Budget",      10000.00, "monthly", start, end, 80, 1, "#A78BFA"),
        (uid, cats.get("Entertainment"),    "Entertainment Budget",  3000.00, "monthly", start, end, 80, 1, "#F59E0B"),
        (uid, cats.get("Utilities"),        "Utilities Budget",      4000.00, "monthly", start, end, 80, 1, "#FFC247"),
    ]


# ---------------------------------------------------------------------------
# Goals + contributions
# ---------------------------------------------------------------------------

def build_goals(uid):
    return [
        # (uid, title, desc, target, current, deadline, icon, color, status, priority)
        (uid, "Emergency Fund",
         "Build a 3-month emergency fund for unexpected expenses",
         300000.00, 180000.00, date(2026, 12, 31),
         "shield", "#22C55E", "active", "high"),

        (uid, "New iPhone 16",
         "Save up for the latest iPhone",
         120000.00, 45000.00, date(2026, 8, 31),
         "smartphone", "#6366F1", "active", "medium"),

        (uid, "Goa Trip 2026",
         "Beach vacation with friends",
         50000.00, 42000.00, date(2026, 6, 30),
         "plane", "#00FFDD", "active", "medium"),

        (uid, "MacBook Pro M4",
         "Upgrade to MacBook Pro for work",
         250000.00, 8500.00, date(2027, 3, 31),
         "laptop", "#F59E0B", "active", "low"),
    ]


def build_contributions(goal_id_map):
    # goal_id_map: title -> id
    rows = []
    ef = goal_id_map.get("Emergency Fund")
    ip = goal_id_map.get("New iPhone 16")
    goa = goal_id_map.get("Goa Trip 2026")
    mb = goal_id_map.get("MacBook Pro M4")

    if ef:
        rows += [
            (ef, "Monthly savings", 40000.00, months_ago(5)),
            (ef, "Monthly savings", 35000.00, months_ago(4)),
            (ef, "Bonus transfer",  25000.00, months_ago(3)),
            (ef, "Monthly savings", 40000.00, months_ago(2)),
            (ef, "Monthly savings", 40000.00, months_ago(1)),
        ]
    if ip:
        rows += [
            (ip, "Monthly contribution", 15000.00, months_ago(3)),
            (ip, "Monthly contribution", 15000.00, months_ago(2)),
            (ip, "Monthly contribution", 15000.00, months_ago(1)),
        ]
    if goa:
        rows += [
            (goa, "Trip fund deposit", 20000.00, months_ago(4)),
            (goa, "Trip fund deposit", 12000.00, months_ago(2)),
            (goa, "Top-up",           10000.00, months_ago(1)),
        ]
    if mb:
        rows += [
            (mb, "Initial deposit", 8500.00, months_ago(1)),
        ]
    return rows


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

def build_subscriptions(uid, cats):
    sub_cat = cats.get("Subscriptions")
    ent_cat = cats.get("Entertainment")
    fit_cat = cats.get("Fitness")
    return [
        (uid, sub_cat, "Netflix",         "Netflix Inc",        649.00,  "monthly",  TODAY + timedelta(days=5),  TODAY - timedelta(days=25), "active",    0, None, "Family plan"),
        (uid, sub_cat, "Spotify",         "Spotify AB",         119.00,  "monthly",  TODAY + timedelta(days=12), TODAY - timedelta(days=18), "active",    0, None, "Individual plan"),
        (uid, sub_cat, "Amazon Prime",    "Amazon",            1499.00,  "yearly",   TODAY + timedelta(days=45), TODAY - timedelta(days=320),"active",    0, None, "Annual membership"),
        (uid, fit_cat, "Cult.fit",        "Cure.fit",          1500.00,  "monthly",  TODAY + timedelta(days=20), TODAY - timedelta(days=10), "active",    0, None, "All-access pass"),
        (uid, ent_cat, "YouTube Premium", "Google LLC",         189.00,  "monthly",  None,                       TODAY - timedelta(days=40), "paused",    0, None, "Paused temporarily"),
        (uid, sub_cat, "iCloud 50GB",     "Apple Inc",           75.00,  "monthly",  TODAY + timedelta(days=8),  TODAY - timedelta(days=22), "active",    0, None, "Storage plan"),
        (uid, sub_cat, "LinkedIn Premium","LinkedIn Corp",      2499.00, "monthly",  None,                       TODAY - timedelta(days=60), "cancelled", 0, None, "Cancelled - too expensive"),
    ]


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def build_notifications(uid):
    return [
        (uid, "budget_alert",    "Transport Budget Exceeded",
         "You've spent 108% of your ₹3,000 transport budget this month.",
         "/budgets", 0, json.dumps({"pct": 108})),

        (uid, "budget_alert",    "Entertainment Budget Alert",
         "You've used 87% of your ₹3,000 entertainment budget.",
         "/budgets", 0, json.dumps({"pct": 87})),

        (uid, "goal_milestone",  "Goa Trip Goal at 84%!",
         "You're almost there! Only ₹8,000 left to reach your Goa trip goal.",
         "/goals", 0, json.dumps({"goal": "Goa Trip 2026", "pct": 84})),

        (uid, "subscription_due","Netflix Billing in 5 Days",
         "₹649 will be charged on " + (TODAY + timedelta(days=5)).strftime("%d %b %Y") + ".",
         "/subscriptions", 0, json.dumps({"sub": "Netflix", "days": 5})),

        (uid, "goal_milestone",  "Emergency Fund Crossed 50%",
         "Great progress! You've saved ₹1,80,000 of your ₹3,00,000 emergency fund goal.",
         "/goals", 0, json.dumps({"goal": "Emergency Fund", "pct": 60})),

        (uid, "system",          "Welcome to SpendWise!",
         "Your account is all set. Start tracking your expenses and hit your financial goals.",
         "/dashboard", 1, None),
    ]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("Initialising database...")
    init_db()

    with get_db() as conn:
        # 1. Upsert demo user
        uid = upsert_user(conn)
        print(f"  Demo user ready (id={uid})")

        # 2. Clear existing data for this user
        clear_user_data(conn, uid)

        # 3. Fetch default category map
        cats = get_category_ids(conn)

        # 4. Expenses
        expense_rows = build_expenses(uid, cats)
        cursor = conn.cursor()
        cursor.executemany(
            """INSERT INTO expenses
               (user_id, category_id, title, amount, type, date, note,
                merchant, payment_method, tags, source, is_recurring)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            expense_rows,
        )
        conn.commit()
        print(f"  {len(expense_rows)} expenses inserted")

        # 5. Budgets
        budget_rows = build_budgets(uid, cats)
        cursor.executemany(
            """INSERT INTO budgets
               (user_id, category_id, name, amount, period, start_date, end_date,
                alert_at_pct, is_active, color)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            budget_rows,
        )
        conn.commit()
        print(f"  {len(budget_rows)} budgets inserted")

        # 6. Goals
        goal_rows = build_goals(uid)
        for g in goal_rows:
            cursor.execute(
                """INSERT INTO goals
                   (user_id, title, description, target_amount, current_amount,
                    deadline, icon, color, status, priority)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                g,
            )
        conn.commit()

        # Fetch goal IDs for contributions
        cursor.execute("SELECT id, title FROM goals WHERE user_id = %s", (uid,))
        goal_id_map = {r[1]: r[0] for r in cursor.fetchall()}

        # 7. Goal contributions
        contrib_rows = build_contributions(goal_id_map)
        for goal_id, note, amount, contrib_date in contrib_rows:
            cursor.execute(
                """INSERT INTO goal_contributions
                   (goal_id, user_id, amount, note, contributed_at)
                   VALUES (%s,%s,%s,%s,%s)""",
                (goal_id, uid, amount, note, contrib_date),
            )
        conn.commit()
        print(f"  {len(goal_rows)} goals + {len(contrib_rows)} contributions inserted")

        # 8. Subscriptions
        sub_rows = build_subscriptions(uid, cats)
        cursor.executemany(
            """INSERT INTO subscriptions
               (user_id, category_id, name, provider, amount, billing_cycle,
                next_billing_date, last_billed_date, status, auto_detected, logo_url, note)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            sub_rows,
        )
        conn.commit()
        print(f"  {len(sub_rows)} subscriptions inserted")

        # 9. Notifications
        notif_rows = build_notifications(uid)
        cursor.executemany(
            """INSERT INTO notifications
               (user_id, type, title, body, link, is_read, metadata)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            notif_rows,
        )
        conn.commit()
        print(f"  {len(notif_rows)} notifications inserted")

    print()
    print("Seed complete.")
    print(f"  Login: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
