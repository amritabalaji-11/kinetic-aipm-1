"""Make one account an admin (or take it away again). Run it yourself, in a terminal. Nothing in the app can do this.

    cd backend
    python3 scripts/make_admin.py you@example.com            # make this account an admin
    python3 scripts/make_admin.py you@example.com --remove   # back to a normal user
    python3 scripts/make_admin.py --list                     # who is an admin now

The account must already exist (sign up in the app first). Which database it changes follows DATABASE_URL in backend/.env
(empty DATABASE_URL = the local SQLite file). The app checks the role in the database on every admin request, so a change takes effect at once.
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import utils.config  # noqa: E402,F401  (loads backend/.env)
from db.database import IS_POSTGRES, db  # noqa: E402
from init_db import init_db  # noqa: E402


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("email", nargs="?")
    parser.add_argument("--remove", action="store_true")
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()
    init_db()  # makes sure the role column exists (safe to run again)
    await db.connect()
    try:
        print(f"Database: {'Postgres (live)' if IS_POSTGRES else 'local SQLite file'}")
        if args.list:
            for r in await db.fetch_all("SELECT user_id, email, display_name FROM user_profiles WHERE role = 'admin'"):
                print(f"admin: {r['user_id']}  {r['email']}  {r['display_name'] or ''}")
            return
        if not args.email:
            parser.error("give an email, or use --list")
        email = args.email.strip().lower()
        user = await db.fetch_one("SELECT user_id, email, role FROM user_profiles WHERE lower(email) = :e", {"e": email})
        if not user:
            sys.exit(f"No account with the email {email}. Sign up in the app first.")
        role = "user" if args.remove else "admin"
        await db.execute("UPDATE user_profiles SET role = :role WHERE user_id = :u", {"role": role, "u": user["user_id"]})
        print(f"{user['email']} (user id {user['user_id']}) is now: {role}")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
