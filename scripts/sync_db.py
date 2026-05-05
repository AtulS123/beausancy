#!/usr/bin/env python3
"""Upsert all funds from public/data/funds.json into the Neon PostgreSQL database."""

import json
import os
import sys
import psycopg2
import psycopg2.extras

def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    funds_path = os.path.join(os.path.dirname(__file__), "..", "public", "data", "funds.json")
    with open(funds_path) as f:
        funds = json.load(f)

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Ensure table exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS funds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            amc TEXT NOT NULL,
            category TEXT NOT NULL,
            aum_cr NUMERIC,
            expense_ratio NUMERIC,
            inception_date DATE,
            nav NUMERIC,
            returns JSONB,
            category_avg_returns JSONB,
            rolling_consistency_3y_pct NUMERIC,
            max_drawdown_5y_pct NUMERIC,
            recovery_months INTEGER,
            manager JSONB,
            managers JSONB,
            style JSONB,
            concentration JSONB,
            nav_history_3y JSONB,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    upserted = 0
    for fund in funds:
        cur.execute("""
            INSERT INTO funds (
                id, name, amc, category, aum_cr, expense_ratio,
                inception_date, nav, returns, category_avg_returns,
                rolling_consistency_3y_pct, max_drawdown_5y_pct, recovery_months,
                manager, managers, style, concentration, nav_history_3y, updated_at
            ) VALUES (
                %(id)s, %(name)s, %(amc)s, %(category)s, %(aum_cr)s, %(expense_ratio)s,
                %(inception_date)s, %(nav)s, %(returns)s, %(category_avg_returns)s,
                %(rolling_consistency_3y_pct)s, %(max_drawdown_5y_pct)s, %(recovery_months)s,
                %(manager)s, %(managers)s, %(style)s, %(concentration)s, %(nav_history_3y)s, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                name                      = EXCLUDED.name,
                amc                       = EXCLUDED.amc,
                category                  = EXCLUDED.category,
                aum_cr                    = EXCLUDED.aum_cr,
                expense_ratio             = EXCLUDED.expense_ratio,
                inception_date            = EXCLUDED.inception_date,
                nav                       = EXCLUDED.nav,
                returns                   = EXCLUDED.returns,
                category_avg_returns      = EXCLUDED.category_avg_returns,
                rolling_consistency_3y_pct= EXCLUDED.rolling_consistency_3y_pct,
                max_drawdown_5y_pct       = EXCLUDED.max_drawdown_5y_pct,
                recovery_months           = EXCLUDED.recovery_months,
                manager                   = EXCLUDED.manager,
                managers                  = EXCLUDED.managers,
                style                     = EXCLUDED.style,
                concentration             = EXCLUDED.concentration,
                nav_history_3y            = EXCLUDED.nav_history_3y,
                updated_at                = NOW()
        """, {
            **fund,
            "returns":              json.dumps(fund.get("returns")),
            "category_avg_returns": json.dumps(fund.get("category_avg_returns")),
            "manager":              json.dumps(fund.get("manager")),
            "managers":             json.dumps(fund.get("managers")),
            "style":                json.dumps(fund.get("style")),
            "concentration":        json.dumps(fund.get("concentration")),
            "nav_history_3y":       json.dumps(fund.get("nav_history_3y")),
        })
        upserted += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Synced {upserted} funds to database.")

if __name__ == "__main__":
    main()
