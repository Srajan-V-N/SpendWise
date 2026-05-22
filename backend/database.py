import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager
import logging
from config import config

logger = logging.getLogger(__name__)

_pool = None

def _create_pool():
    global _pool
    pool_config = {
        'pool_name': 'spendwise_pool',
        'pool_size': 5,
        'pool_reset_session': True,
        'host': config.DB_HOST,
        'port': config.DB_PORT,
        'user': config.DB_USER,
        'password': config.DB_PASSWORD,
        'database': config.DB_NAME,
        'charset': 'utf8mb4',
        'use_unicode': True,
        'autocommit': False,
        'connection_timeout': 30,
        'ssl_disabled': True,
    }
    try:
        _pool = pooling.MySQLConnectionPool(**pool_config)
    except mysql.connector.Error as e:
        if e.errno != 1049:  # 1049 = Unknown database
            raise
        logger.info(f"Database '{config.DB_NAME}' not found — creating it automatically.")
        tmp = mysql.connector.connect(
            host=config.DB_HOST, port=config.DB_PORT,
            user=config.DB_USER, password=config.DB_PASSWORD,
            ssl_disabled=True,
        )
        tmp.cursor().execute(
            f"CREATE DATABASE IF NOT EXISTS `{config.DB_NAME}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        tmp.commit()
        tmp.close()
        _pool = pooling.MySQLConnectionPool(**pool_config)
    logger.info('Database connection pool created.')


@contextmanager
def get_db():
    global _pool
    if _pool is None:
        _create_pool()
    conn = _pool.get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query_one(sql, params=None):
    with get_db() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or ())
        return cursor.fetchone()


def query_all(sql, params=None):
    with get_db() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or ())
        return cursor.fetchall()


def execute(sql, params=None):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params or ())
        conn.commit()
        return cursor.lastrowid


def execute_many(sql, params_list):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.executemany(sql, params_list)
        conn.commit()
        return cursor.rowcount


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  avatar_url    VARCHAR(512)    DEFAULT NULL,
  currency      CHAR(3)         NOT NULL DEFAULT 'INR',
  theme         VARCHAR(10)     NOT NULL DEFAULT 'dark',
  monthly_income DECIMAL(12,2)  DEFAULT 0.00,
  onboarded     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED    DEFAULT NULL,
  name          VARCHAR(80)     NOT NULL,
  icon          VARCHAR(80)     NOT NULL DEFAULT 'circle',
  color         CHAR(7)         NOT NULL DEFAULT '#00FFDD',
  type          VARCHAR(10)     NOT NULL DEFAULT 'expense',
  is_default    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_categories_user (user_id),
  CONSTRAINT fk_cat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NOT NULL,
  category_id     INT UNSIGNED    DEFAULT NULL,
  title           VARCHAR(200)    NOT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  type            VARCHAR(10)     NOT NULL DEFAULT 'expense',
  date            DATE            NOT NULL,
  note            TEXT            DEFAULT NULL,
  merchant        VARCHAR(150)    DEFAULT NULL,
  payment_method  VARCHAR(20)     NOT NULL DEFAULT 'upi',
  tags            JSON            DEFAULT NULL,
  receipt_url     VARCHAR(512)    DEFAULT NULL,
  source          VARCHAR(20)     NOT NULL DEFAULT 'manual',
  import_hash     VARCHAR(64)     DEFAULT NULL,
  is_recurring    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_expenses_user_date (user_id, date),
  KEY idx_expenses_category (category_id),
  KEY idx_expenses_import_hash (import_hash),
  CONSTRAINT fk_exp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_exp_cat  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budgets (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED    NOT NULL,
  category_id   INT UNSIGNED    DEFAULT NULL,
  name          VARCHAR(150)    NOT NULL,
  amount        DECIMAL(12,2)   NOT NULL,
  period        VARCHAR(20)     NOT NULL DEFAULT 'monthly',
  start_date    DATE            NOT NULL,
  end_date      DATE            DEFAULT NULL,
  alert_at_pct  TINYINT UNSIGNED NOT NULL DEFAULT 80,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  color         CHAR(7)         DEFAULT '#00FFDD',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_budgets_user (user_id),
  KEY idx_budgets_category (category_id),
  CONSTRAINT fk_bud_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bud_cat  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goals (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NOT NULL,
  title           VARCHAR(200)    NOT NULL,
  description     TEXT            DEFAULT NULL,
  target_amount   DECIMAL(12,2)   NOT NULL,
  current_amount  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  deadline        DATE            DEFAULT NULL,
  icon            VARCHAR(80)     NOT NULL DEFAULT 'target',
  color           CHAR(7)         NOT NULL DEFAULT '#00FFDD',
  status          VARCHAR(20)     NOT NULL DEFAULT 'active',
  priority        VARCHAR(10)     NOT NULL DEFAULT 'medium',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goals_user (user_id),
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goal_contributions (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  goal_id         INT UNSIGNED    NOT NULL,
  user_id         INT UNSIGNED    NOT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  note            VARCHAR(300)    DEFAULT NULL,
  contributed_at  DATE            NOT NULL DEFAULT (CURDATE()),
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contrib_goal (goal_id),
  KEY idx_contrib_user (user_id),
  CONSTRAINT fk_contrib_goal FOREIGN KEY (goal_id)  REFERENCES goals(id)  ON DELETE CASCADE,
  CONSTRAINT fk_contrib_user FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED    NOT NULL,
  category_id       INT UNSIGNED    DEFAULT NULL,
  name              VARCHAR(150)    NOT NULL,
  provider          VARCHAR(100)    DEFAULT NULL,
  amount            DECIMAL(10,2)   NOT NULL,
  billing_cycle     VARCHAR(20)     NOT NULL DEFAULT 'monthly',
  next_billing_date DATE            DEFAULT NULL,
  last_billed_date  DATE            DEFAULT NULL,
  status            VARCHAR(20)     NOT NULL DEFAULT 'active',
  auto_detected     TINYINT(1)      NOT NULL DEFAULT 0,
  logo_url          VARCHAR(512)    DEFAULT NULL,
  note              TEXT            DEFAULT NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_subs_user (user_id),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_sub_cat  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  type        VARCHAR(40)     NOT NULL DEFAULT 'system',
  title       VARCHAR(200)    NOT NULL,
  body        TEXT            DEFAULT NULL,
  link        VARCHAR(200)    DEFAULT NULL,
  is_read     TINYINT(1)      NOT NULL DEFAULT 0,
  metadata    JSON            DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user_read (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wisebot_logs (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NOT NULL,
  session_key     VARCHAR(64)     NOT NULL,
  role            VARCHAR(15)     NOT NULL,
  content         LONGTEXT        NOT NULL,
  context_page    VARCHAR(80)     DEFAULT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wb_user_session (user_id, session_key),
  CONSTRAINT fk_wb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_jobs (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NOT NULL,
  file_name       VARCHAR(255)    NOT NULL,
  file_type       VARCHAR(60)     NOT NULL,
  file_type_full  VARCHAR(20)     DEFAULT NULL,
  status          VARCHAR(20)     NOT NULL DEFAULT 'queued',
  total_rows      SMALLINT UNSIGNED DEFAULT NULL,
  imported_rows   SMALLINT UNSIGNED DEFAULT NULL,
  duplicate_rows  SMALLINT UNSIGNED DEFAULT NULL,
  error_message   TEXT            DEFAULT NULL,
  preview_data    JSON            DEFAULT NULL,
  ai_insights     JSON            DEFAULT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_import_user (user_id),
  CONSTRAINT fk_imp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS merchant_aliases (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  raw_text    VARCHAR(200)    NOT NULL,
  clean_name  VARCHAR(100)    NOT NULL,
  category_id INT UNSIGNED    DEFAULT NULL,
  match_count INT             NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_raw (user_id, raw_text(150)),
  KEY idx_alias_user (user_id),
  CONSTRAINT fk_alias_user FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_alias_cat  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

DEFAULT_CATEGORIES = [
    (None, 'Food & Dining',    'utensils',        '#FF6B6B', 'expense', 1),
    (None, 'Groceries',        'shopping-cart',   '#FF8C42', 'expense', 1),
    (None, 'Transport',        'car',             '#4DA3FF', 'expense', 1),
    (None, 'Shopping',         'shopping-bag',    '#A78BFA', 'expense', 1),
    (None, 'Entertainment',    'film',            '#F59E0B', 'expense', 1),
    (None, 'Health & Medical', 'heart-pulse',     '#FF5A6B', 'expense', 1),
    (None, 'Utilities',        'zap',             '#FFC247', 'expense', 1),
    (None, 'Housing & Rent',   'home',            '#6366F1', 'expense', 1),
    (None, 'Education',        'book-open',       '#10B981', 'expense', 1),
    (None, 'Travel',           'plane',           '#00FFDD', 'expense', 1),
    (None, 'Subscriptions',    'refresh-cw',      '#EC4899', 'expense', 1),
    (None, 'Fitness',          'dumbbell',        '#34D399', 'expense', 1),
    (None, 'Personal Care',    'sparkles',        '#F9A8D4', 'expense', 1),
    (None, 'Insurance',        'shield',          '#94A3B8', 'expense', 1),
    (None, 'Investments',      'trending-up',     '#00FFDD', 'both',    1),
    (None, 'Salary',           'briefcase',       '#22C55E', 'income',  1),
    (None, 'Freelance',        'laptop',          '#A3E635', 'income',  1),
    (None, 'Business',         'building-2',      '#60A5FA', 'income',  1),
    (None, 'Gifts Received',   'gift',            '#F472B6', 'income',  1),
    (None, 'Other',            'more-horizontal', '#64748B', 'both',    1),
]


def init_db():
    global _pool
    if _pool is None:
        _create_pool()

    with get_db() as conn:
        cursor = conn.cursor()
        for statement in SCHEMA_SQL.strip().split(';'):
            stmt = statement.strip()
            if stmt:
                cursor.execute(stmt)
        conn.commit()

        # Migrate import_jobs for existing installations (safe — ignored if already exists)
        for col_sql in [
            "ALTER TABLE import_jobs ADD COLUMN file_type_full VARCHAR(20) DEFAULT NULL",
            "ALTER TABLE import_jobs ADD COLUMN ai_insights JSON DEFAULT NULL",
        ]:
            try:
                cursor.execute(col_sql)
                conn.commit()
            except Exception:
                conn.rollback()

        cursor.execute("SELECT COUNT(*) AS cnt FROM categories WHERE is_default = 1")
        row = cursor.fetchone()
        count = row[0] if row else 0
        if count == 0:
            cursor.executemany(
                "INSERT INTO categories (user_id, name, icon, color, type, is_default) VALUES (%s,%s,%s,%s,%s,%s)",
                DEFAULT_CATEGORIES
            )
            conn.commit()
            logger.info(f'Seeded {len(DEFAULT_CATEGORIES)} default categories.')

    logger.info('Database initialized successfully.')
