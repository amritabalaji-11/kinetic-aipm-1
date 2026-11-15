from pydantic import BaseModel, Field, EmailStr


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SocialLoginRequest(BaseModel):
    token: str          # id_token (Google/Apple) or access_token (Facebook)
    display_name: str | None = None


class DemoLoginRequest(BaseModel):
    user_id: str        # one of the sample profiles
    passcode: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


class UserOut(BaseModel):
    user_id: str
    email: str | None
    display_name: str | None
    auth_provider: str
    share_videos_default: bool | None = None  # their answer to "Can our team watch your videos?": None = not asked yet
    role: str = "user"  # "admin" shows the Admin page; the server checks it again on every admin request


class AboutYouIn(BaseModel):
    """The optional "A little about you" step. Every field may be left out."""
    experience: str | None = None            # new | 1-2 | 3+
    workouts_per_week: str | None = None     # never | 1-2 | 3-4 | 5+
    training_types: list[str] | None = None  # cardio | strength | yoga_pilates | group_classes (any number)
    age_range: str | None = None             # 18-29 | 30-39 | 40+
    gender: str | None = None                # woman | man | non_binary | prefer_not_to_say
    has_injury: bool | None = None           # past injuries or pain we should know about
    injury_details: str | None = Field(default=None, max_length=1000)  # only kept when has_injury is true


class SharingChoiceIn(BaseModel):
    share: bool
