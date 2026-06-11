import logging

logger = logging.getLogger("haiku_call_2")

def log_job_failure(
    *,
    analysis_id,
    error_code,
    retryable,
    attempt,
    elapsed,
    exc
):

    logger.exception(
        "haiku_call_2_failed",
        extra={
            "analysis_id":
                analysis_id,

            "error_code":
                error_code,

            "retryable":
                retryable,

            "attempt":
                attempt,

            "elapsed":
                elapsed
        }
    )