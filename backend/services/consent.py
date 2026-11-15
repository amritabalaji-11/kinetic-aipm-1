"""The "Let the Kinetic team watch this video to improve the feedback" switch, as the database sees it.

1 on the analysis means the person agreed, and only then can an admin open the video. Off (0) is the default; turning it off again removes the
video from the admin list at once."""
from db.database import NOW_TEXT, db as default_db


async def set_team_review(analysis_id: str, allowed: bool, database=None) -> None:
    database = database or default_db
    await database.execute(
        f"UPDATE form_analyses SET team_review_consent = :c, team_review_consent_at = {NOW_TEXT if allowed else 'NULL'} WHERE analysis_id = :id",
        {"c": 1 if allowed else 0, "id": analysis_id},
    )
