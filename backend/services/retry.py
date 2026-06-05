import asyncio
import time

MAX_HAIKU_ATTEMPTS = 4
BACKOFFS = [1, 3, 9]


async def execute_with_retry(
    func,
    mapper
):
    started = time.monotonic()

    for attempt in range(MAX_HAIKU_ATTEMPTS):

        elapsed = time.monotonic() - started

        if elapsed > 120:
            raise TimeoutError(
                "Wall clock exceeded"
            )

        try:

            return await func()

        except Exception as exc:

            error_code, retryable = mapper(exc)

            if not retryable:
                raise

            if attempt == 3:
                raise

            await asyncio.sleep(
                BACKOFFS[attempt]
            )