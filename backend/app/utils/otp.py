"""
OTP utilities — generate, store, verify and expire one-time passwords.
Stored in MongoDB 'otps' collection with TTL.
"""
import random
import string
from datetime import datetime, timedelta
from bson import ObjectId

OTP_EXPIRY_MINUTES = 10


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def store_otp(db, email: str, otp: str, purpose: str, extra: dict = None) -> None:
    """Upsert OTP for email+purpose, replacing any existing one."""
    doc = {
        "email": email.lower(),
        "otp": otp,
        "purpose": purpose,   # "login" | "payment"
        "used": False,
        "expires_at": datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
        "created_at": datetime.utcnow(),
        **(extra or {})
    }
    await db["otps"].delete_many({"email": email.lower(), "purpose": purpose})
    await db["otps"].insert_one(doc)


async def verify_otp(db, email: str, otp: str, purpose: str) -> bool:
    """Returns True if OTP is valid, marks it used, deletes it."""
    record = await db["otps"].find_one({
        "email": email.lower(),
        "purpose": purpose,
        "otp": otp,
        "used": False
    })
    if not record:
        return False
    if datetime.utcnow() > record["expires_at"]:
        await db["otps"].delete_one({"_id": record["_id"]})
        return False
    await db["otps"].delete_one({"_id": record["_id"]})
    return True


async def get_otp_extra(db, email: str, purpose: str) -> dict:
    """Get extra fields stored with an OTP (e.g. plan for payment)."""
    record = await db["otps"].find_one({"email": email.lower(), "purpose": purpose})
    return record or {}
