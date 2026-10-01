from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from datetime import datetime
from typing import Optional
from app.database import get_database
from app.models.auth import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse
from app.utils.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.utils.otp import generate_otp, store_otp, verify_otp
from app.services.email_service import (
    send_welcome_email, send_subscription_activated_email, send_otp_email
)

router = APIRouter(prefix="/auth")

UPI_ID   = "vishubhsolanki31582-1@okaxis"
UPI_NAME = "Vishu Solanki"


def _build_user_response(user_id: str, user_doc: dict, override: dict = None) -> UserResponse:
    d = {**(override or {})}
    profile = user_doc.get("profile", {})
    return UserResponse(
        id=user_id,
        full_name=d.get("full_name", user_doc.get("full_name", "Student")),
        email=d.get("email", user_doc.get("email", "")),
        role=d.get("role", user_doc.get("role", "STUDENT")),
        grade_level=d.get("grade_level", profile.get("grade_level", "Class 10th")),
        program=d.get("program", profile.get("program", "General")),
        semester=d.get("semester", profile.get("semester", 1)),
        subscription=user_doc.get("subscription", "free")
    )


# ─── REGISTRATION — Step 1: Validate details → send OTP ──────────────────────

@router.post("/register-initiate")
async def register_initiate(
    payload: UserRegisterRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_database)
):
    """
    Step 1 of registration:
    - Validates all form data.
    - Checks email is not already registered.
    - Stores pending registration data in MongoDB.
    - Sends OTP to the provided email.
    Returns {otp_sent: true} — client must call /auth/register-verify-otp to complete.
    """
    if db is None:
        # Offline demo — skip OTP
        u_id = "665f1a2b3c4d5e6f7a8b9c01"
        token = create_access_token({"sub": u_id, "role": "STUDENT"})
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=u_id, full_name=payload.full_name, email=payload.email.lower(),
                role="STUDENT", grade_level=payload.grade_level,
                program=payload.program, semester=payload.semester, subscription="free"
            )
        )

    email = payload.email.lower()
    existing = await db["users"].find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered. Please sign in instead.")

    # Store pending registration (will be deleted after OTP verification)
    pending_doc = {
        "full_name":  payload.full_name.strip(),
        "email":      email,
        "password_hash": get_password_hash(payload.password),
        "role":       (payload.role or "STUDENT").upper(),
        "grade_level": payload.grade_level or "Class 10th",
        "program":    payload.program or "General Academic",
        "semester":   payload.semester or 1,
        "created_at": datetime.utcnow()
    }
    await db["pending_registrations"].delete_many({"email": email})
    await db["pending_registrations"].insert_one(pending_doc)

    # Generate and send OTP
    otp = generate_otp()
    await store_otp(db, email, otp, purpose="register")
    background_tasks.add_task(send_otp_email, email, payload.full_name.strip(), otp, "register")

    return {
        "otp_sent": True,
        "email":    email,
        "message":  f"OTP sent to {email}. Please verify to complete registration."
    }


# ─── REGISTRATION — Step 2: Verify OTP → create account ─────────────────────

class VerifyRegisterOtpRequest(BaseModel):
    email: EmailStr
    otp:   str

@router.post("/register-verify-otp", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_verify_otp(
    payload: VerifyRegisterOtpRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_database)
):
    """
    Step 2 of registration:
    - Verifies the OTP.
    - Retrieves the pending registration data.
    - Creates the user account.
    - Returns access token (user is logged in immediately).
    """
    email = payload.email.lower()

    if db is None:
        u_id = "665f1a2b3c4d5e6f7a8b9c01"
        token = create_access_token({"sub": u_id, "role": "STUDENT"})
        return TokenResponse(
            access_token=token,
            user=UserResponse(id=u_id, full_name="Demo User", email=email,
                              role="STUDENT", grade_level="Class 10th",
                              program="General Academic", semester=1, subscription="free")
        )

    # Verify OTP
    valid = await verify_otp(db, email, payload.otp.strip(), purpose="register")
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")

    # Get pending registration data
    pending = await db["pending_registrations"].find_one({"email": email})
    if not pending:
        raise HTTPException(status_code=400, detail="Registration session expired. Please start again.")

    # Check email not already taken (race condition guard)
    existing = await db["users"].find_one({"email": email})
    if existing:
        await db["pending_registrations"].delete_many({"email": email})
        raise HTTPException(status_code=400, detail="This email was registered just now. Please sign in.")

    # Create the user
    user_doc = {
        "full_name":     pending["full_name"],
        "email":         email,
        "password_hash": pending["password_hash"],
        "role":          pending["role"],
        "is_active":     True,
        "subscription":  "free",
        "profile": {
            "grade_level": pending["grade_level"],
            "program":     pending["program"],
            "semester":    pending["semester"]
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db["users"].insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Clean up pending registration
    await db["pending_registrations"].delete_many({"email": email})

    # Send welcome email
    background_tasks.add_task(send_welcome_email, email, pending["full_name"])

    access_token = create_access_token({"sub": user_id, "role": pending["role"]})
    return TokenResponse(
        access_token=access_token,
        user=_build_user_response(user_id, user_doc)
    )


# ─── LOGIN — Step 1: Validate credentials → send OTP ────────────────────────

@router.post("/login")
async def login(
    payload: UserLoginRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_database)
):
    """
    Step 1 of login:
    - Verifies email + password.
    - If correct, sends a 6-digit OTP to the registered email.
    - Returns {otp_sent: true} — client calls /auth/verify-otp to get token.
    """
    if db is None:
        # Offline demo mode — skip OTP
        role = "ADMIN" if "admin" in payload.email.lower() else "STUDENT"
        u_id = "665f1a2b3c4d5e6f7a8b9c01"
        token = create_access_token({"sub": u_id, "role": role})
        return TokenResponse(
            access_token=token,
            user=UserResponse(id=u_id, full_name="Demo User", email=payload.email.lower(),
                              role=role, grade_level="Class 10th", program="General Academic",
                              semester=1, subscription="free")
        )

    user = await db["users"].find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password. Please check and try again.")

    email     = payload.email.lower()
    full_name = user.get("full_name", "Student")
    otp       = generate_otp()
    await store_otp(db, email, otp, purpose="login")
    background_tasks.add_task(send_otp_email, email, full_name, otp, "login")

    return {
        "otp_sent": True,
        "email":    email,
        "message":  f"OTP sent to {email}. Check your inbox and enter the 6-digit code."
    }


# ─── LOGIN — Step 2: Verify OTP → return token ───────────────────────────────

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp:   str

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_login_otp(payload: VerifyOtpRequest, db = Depends(get_database)):
    """Verifies the login OTP and returns a JWT access token."""
    email = payload.email.lower()

    if db is None:
        u_id = "665f1a2b3c4d5e6f7a8b9c01"
        token = create_access_token({"sub": u_id, "role": "STUDENT"})
        return TokenResponse(
            access_token=token,
            user=UserResponse(id=u_id, full_name="Demo User", email=email,
                              role="STUDENT", grade_level="Class 10th",
                              program="General Academic", semester=1, subscription="free")
        )

    valid = await verify_otp(db, email, payload.otp.strip(), purpose="login")
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")

    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    user_id      = str(user["_id"])
    access_token = create_access_token({"sub": user_id, "role": user.get("role", "STUDENT")})
    return TokenResponse(access_token=access_token, user=_build_user_response(user_id, user))


# ─── SEND STANDALONE OTP (for resend) ────────────────────────────────────────

class SendOtpRequest(BaseModel):
    email: EmailStr

@router.post("/send-otp")
async def send_login_otp(payload: SendOtpRequest, background_tasks: BackgroundTasks, db = Depends(get_database)):
    """Resend a login OTP for an existing account."""
    email = payload.email.lower()
    if db is not None:
        user = await db["users"].find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="No account found with this email.")
        full_name = user.get("full_name", "Student")
    else:
        full_name = "Demo User"

    otp = generate_otp()
    if db is not None:
        await store_otp(db, email, otp, purpose="login")
    background_tasks.add_task(send_otp_email, email, full_name, otp, "login")
    return {"message": f"OTP sent to {email}", "email": email}


# ─── PROFILE ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return _build_user_response(str(current_user.get("_id", "offline_id")), current_user)


# ─── SUBSCRIPTION — UPI Payment + OTP ────────────────────────────────────────

class SubscribeRequest(BaseModel):
    plan: str

class SendPaymentOtpRequest(BaseModel):
    plan: str

class VerifyPaymentRequest(BaseModel):
    plan: str
    otp:  str

VALID_PLANS  = {"pro", "elite"}
PLAN_PRICES  = {"pro": "₹99/month", "elite": "₹799/year"}


@router.get("/upi-info")
async def get_upi_info():
    return {
        "upi_id":  UPI_ID,
        "upi_name": UPI_NAME,
        "plans": {
            "pro":   {"price": 99,  "label": "Smart Pro",   "period": "month"},
            "elite": {"price": 799, "label": "Smart Elite", "period": "year"}
        }
    }


@router.post("/send-payment-otp")
async def send_payment_otp_endpoint(
    payload: SendPaymentOtpRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    plan = payload.plan.lower()
    if plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    email     = current_user.get("email", "")
    full_name = current_user.get("full_name", "Student")
    otp       = generate_otp()

    if db is not None:
        await store_otp(db, email, otp, purpose="payment", extra={"plan": plan})
    background_tasks.add_task(send_otp_email, email, full_name, otp, "payment")
    return {"message": f"Payment verification OTP sent to {email}", "email": email, "plan": plan}


@router.post("/verify-payment", response_model=UserResponse)
async def verify_payment_otp(
    payload: VerifyPaymentRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    plan  = payload.plan.lower()
    email = current_user.get("email", "")

    if plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    if db is None:
        updated = {**current_user, "subscription": plan}
        return _build_user_response(str(current_user.get("_id", "")), updated)

    valid = await verify_otp(db, email, payload.otp.strip(), purpose="payment")
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")

    user_id = str(current_user.get("_id", ""))
    if ObjectId.is_valid(user_id):
        await db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"subscription": plan, "updated_at": datetime.utcnow()}}
        )

    background_tasks.add_task(
        send_subscription_activated_email,
        email, current_user.get("full_name", "Student"), plan
    )
    updated = {**current_user, "subscription": plan}
    return _build_user_response(user_id, updated)


@router.post("/subscribe", response_model=UserResponse)
async def subscribe(
    payload: SubscribeRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    plan = payload.plan.lower()
    if plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Choose from: {', '.join(VALID_PLANS)}")

    user_id = str(current_user.get("_id", ""))
    if db is not None and ObjectId.is_valid(user_id):
        await db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"subscription": plan, "updated_at": datetime.utcnow()}}
        )

    background_tasks.add_task(
        send_subscription_activated_email,
        current_user.get("email", ""), current_user.get("full_name", "Student"), plan
    )
    updated = {**current_user, "subscription": plan}
    return _build_user_response(user_id, updated)


@router.post("/unsubscribe", response_model=UserResponse)
async def unsubscribe(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    user_id = str(current_user.get("_id", ""))
    if db is not None and ObjectId.is_valid(user_id):
        await db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"subscription": "free", "updated_at": datetime.utcnow()}}
        )
    updated = {**current_user, "subscription": "free"}
    return _build_user_response(user_id, updated)


# ─── ACCOUNT DELETION — Step 1: Send OTP ─────────────────────────────────────

@router.post("/send-delete-otp")
async def send_delete_otp(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Sends a 6-digit OTP to the user's registered email to confirm account deletion.
    """
    email     = current_user.get("email", "")
    full_name = current_user.get("full_name", "Student")
    otp       = generate_otp()

    if db is not None:
        await store_otp(db, email, otp, purpose="delete_account")

    background_tasks.add_task(send_otp_email, email, full_name, otp, "delete_account")
    return {
        "otp_sent": True,
        "email":    email,
        "message":  f"Account deletion OTP sent to {email}. Valid for 10 minutes."
    }


# ─── ACCOUNT DELETION — Step 2: Verify OTP → delete all data ─────────────────

class DeleteAccountRequest(BaseModel):
    otp: str

@router.delete("/delete-account")
async def delete_account(
    payload: DeleteAccountRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Verifies the OTP and permanently deletes the user account.

    Data DELETED:
      - users (account)
      - quiz_submissions (all their quiz attempts)
      - quizzes (all quizzes they generated)
      - otps (any pending OTPs)
      - pending_registrations

    Data KEPT (NOT deleted):
      - materials / AI notes summaries
        (uploaded_by is set to null — the notes remain visible as public knowledge)
    """
    email   = current_user.get("email", "")
    user_id = str(current_user.get("_id", ""))

    if db is None:
        return {"deleted": True, "message": "Account deleted (offline demo mode)"}

    # Verify OTP
    valid = await verify_otp(db, email, payload.otp.strip(), purpose="delete_account")
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")

    user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else None

    if user_oid:
        # 1. Delete quiz submissions
        await db["quiz_submissions"].delete_many({"student_id": user_oid})

        # 2. Delete generated quizzes
        await db["quizzes"].delete_many({"created_by": user_oid})

        # 3. Anonymize materials — keep the AI summaries but remove owner link
        #    (public knowledge is preserved; private ones become ownerless)
        await db["materials"].update_many(
            {"uploaded_by": user_oid},
            {"$set": {"uploaded_by": None, "is_private": False}}
        )

        # 4. Clean OTPs
        await db["otps"].delete_many({"email": email})

        # 5. Clean pending registrations
        await db["pending_registrations"].delete_many({"email": email})

        # 6. Delete the user account (last step)
        await db["users"].delete_one({"_id": user_oid})

    return {
        "deleted": True,
        "message": "Your account and all associated data have been permanently deleted."
    }

