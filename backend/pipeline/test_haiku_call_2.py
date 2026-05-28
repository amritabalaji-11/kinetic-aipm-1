import asyncio
import uuid
from services.haiku_call_2_progression import run_haiku_call_2

async def main():
    analysis_id = "245b256b-513c-4333-be95-3d389be92985"

    print("Testing Haiku Call 2 only...")
    await run_haiku_call_2(analysis_id)

    print("Done")

if __name__ == "__main__":
    asyncio.run(main())