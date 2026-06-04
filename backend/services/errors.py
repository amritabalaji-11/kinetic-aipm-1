from json import JSONDecodeError
from sqlite3 import IntegrityError, DatabaseError

from anthropic import (
    APITimeoutError,
    APIStatusError,
    BadRequestError,
    RateLimitError
)


def map_exception_to_error_code(exc):

    if isinstance(exc, APITimeoutError):
        return (
            "HAIKU_CALL_2_TIMEOUT",
            True
        )

    if isinstance(exc, RateLimitError):
        return (
            "HAIKU_CALL_2_API_ERROR",
            True
        )

    if isinstance(exc, APIStatusError):

        if exc.status_code >= 500:
            return (
                "HAIKU_CALL_2_API_ERROR",
                True
            )

    if isinstance(exc, JSONDecodeError):
        return (
            "HAIKU_CALL_2_INVALID_OUTPUT",
            False
        )

    if isinstance(exc, KeyError):
        return (
            "HAIKU_CALL_2_INVALID_OUTPUT",
            False
        )

    if isinstance(exc, BadRequestError):

        if "context_window_exceeded" in str(exc):
            return (
                "HAIKU_CALL_2_CONTEXT_OVERFLOW",
                False
            )

    if isinstance(exc, IntegrityError):
        return (
            "HAIKU_CALL_2_DB_WRITE_ERROR",
            True
        )

    if isinstance(exc, DatabaseError):
        return (
            "HAIKU_CALL_2_DB_WRITE_ERROR",
            False
        )

    return (
        "HAIKU_CALL_2_UNKNOWN_ERROR",
        False
    )