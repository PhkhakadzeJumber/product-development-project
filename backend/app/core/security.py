from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# bcrypt hard limit: 72 bytes. Enforced at schema level too; double-guard here.
_BCRYPT_MAX_BYTES = 72


def _check_bcrypt_length(password: str) -> None:
    if len(password.encode("utf-8")) > _BCRYPT_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at most 72 bytes long",
        )


def hash_password(password: str) -> str:
    _check_bcrypt_length(password)
    try:
        return pwd_context.hash(password)
    except (ValueError, AttributeError) as exc:
        # passlib 1.7.4 + bcrypt>=4.1 raises opaque errors; surface clearly.
        raise HTTPException(status_code=500, detail=f"Password hashing failed: {exc}")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except (ValueError, AttributeError):
        return False


def create_access_token(sub: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": sub, "role": role, "exp": expire}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
