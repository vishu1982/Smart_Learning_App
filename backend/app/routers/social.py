"""
Social Router — Follow/Unfollow system with follow requests, user discovery,
and access to followers' uploaded summaries + quiz performance.

Collections used:
  follow_requests  — { from_user, to_user, status, created_at }
  users            — read-only for discovery
  materials        — read when following accepted
  quizzes          — read when following accepted
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from typing import Optional
from app.database import get_database
from app.utils.security import get_current_user

router = APIRouter(prefix="/social")


def _uid(user: dict) -> Optional[ObjectId]:
    raw = str(user.get("_id", ""))
    return ObjectId(raw) if ObjectId.is_valid(raw) else None


def _str(oid) -> str:
    return str(oid) if oid else ""


def _user_card(doc: dict) -> dict:
    """Minimal public card shown in discovery / follower lists."""
    profile = doc.get("profile", {})
    return {
        "id":           str(doc["_id"]),
        "full_name":    doc.get("full_name", "Student"),
        "email":        doc.get("email", ""),
        "grade_level":  profile.get("grade_level", doc.get("grade_level", "Class 10th")),
        "program":      profile.get("program", "General Academic"),
        "subscription": doc.get("subscription", "free"),
        "role":         doc.get("role", "STUDENT"),
        "member_since": doc.get("created_at", "").isoformat() if hasattr(doc.get("created_at", ""), "isoformat") else str(doc.get("created_at", "")),
    }


# ─── Discover all users ───────────────────────────────────────────────────────

@router.get("/users")
async def discover_users(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Returns all users (except current) with follow status:
    follow_status: "none" | "pending" | "following" | "follows_you"
    """
    if db is None:
        return []

    me = _uid(current_user)
    all_users = await db["users"].find(
        {"_id": {"$ne": me}}, {"password_hash": 0}
    ).to_list(200)

    # Get all my outgoing follow requests
    my_requests = await db["follow_requests"].find(
        {"from_user": me}
    ).to_list(500)
    sent_map = {str(r["to_user"]): r["status"] for r in my_requests}

    # Get all incoming accepted requests (people who follow me)
    followers = await db["follow_requests"].find(
        {"to_user": me, "status": "accepted"}
    ).to_list(500)
    follower_ids = {str(r["from_user"]) for r in followers}

    result = []
    for u in all_users:
        uid_str = str(u["_id"])
        card = _user_card(u)

        if sent_map.get(uid_str) == "accepted":
            card["follow_status"] = "following"
        elif sent_map.get(uid_str) == "pending":
            card["follow_status"] = "pending"
        elif uid_str in follower_ids:
            card["follow_status"] = "follows_you"
        else:
            card["follow_status"] = "none"

        result.append(card)

    return result


# ─── Send follow request ──────────────────────────────────────────────────────

@router.post("/follow/{target_id}")
async def send_follow_request(
    target_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None:
        return {"status": "pending"}

    me = _uid(current_user)
    if not ObjectId.is_valid(target_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    target_oid = ObjectId(target_id)

    if me == target_oid:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    # Check target exists
    target = await db["users"].find_one({"_id": target_oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check existing request
    existing = await db["follow_requests"].find_one(
        {"from_user": me, "to_user": target_oid}
    )
    if existing:
        if existing["status"] == "accepted":
            return {"status": "already_following"}
        if existing["status"] == "pending":
            return {"status": "already_pending"}
        # Rejected → re-create
        await db["follow_requests"].delete_one({"_id": existing["_id"]})

    await db["follow_requests"].insert_one({
        "from_user":  me,
        "to_user":    target_oid,
        "status":     "pending",
        "created_at": datetime.utcnow()
    })
    return {"status": "pending", "message": f"Follow request sent to {target.get('full_name')}"}


# ─── Unfollow ─────────────────────────────────────────────────────────────────

@router.delete("/unfollow/{target_id}")
async def unfollow(
    target_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None:
        return {"status": "unfollowed"}
    me = _uid(current_user)
    if ObjectId.is_valid(target_id):
        await db["follow_requests"].delete_one(
            {"from_user": me, "to_user": ObjectId(target_id)}
        )
    return {"status": "unfollowed"}


# ─── My incoming follow requests ──────────────────────────────────────────────

@router.get("/requests")
async def my_follow_requests(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Returns pending follow requests sent TO the current user."""
    if db is None:
        return []
    me = _uid(current_user)
    reqs = await db["follow_requests"].find(
        {"to_user": me, "status": "pending"}
    ).sort("created_at", -1).to_list(100)

    result = []
    for r in reqs:
        sender = await db["users"].find_one(
            {"_id": r["from_user"]}, {"password_hash": 0}
        )
        if sender:
            card = _user_card(sender)
            card["request_id"] = str(r["_id"])
            result.append(card)
    return result


# ─── Accept follow request ────────────────────────────────────────────────────

@router.post("/requests/{request_id}/accept")
async def accept_follow_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None or not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")

    me = _uid(current_user)
    req = await db["follow_requests"].find_one(
        {"_id": ObjectId(request_id), "to_user": me, "status": "pending"}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Follow request not found")

    await db["follow_requests"].update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "accepted", "accepted_at": datetime.utcnow()}}
    )
    return {"status": "accepted"}


# ─── Reject follow request ────────────────────────────────────────────────────

@router.post("/requests/{request_id}/reject")
async def reject_follow_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None or not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    me = _uid(current_user)
    await db["follow_requests"].delete_one(
        {"_id": ObjectId(request_id), "to_user": me}
    )
    return {"status": "rejected"}


# ─── Remove a Follower (someone who follows me) ──────────────────────────────

@router.delete("/followers/{follower_id}")
async def remove_follower(
    follower_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Removes a user from the current user's followers list."""
    if db is None:
        return {"status": "removed"}
    me = _uid(current_user)
    if ObjectId.is_valid(follower_id):
        await db["follow_requests"].delete_one(
            {"from_user": ObjectId(follower_id), "to_user": me}
        )
    return {"status": "removed"}


# ─── My Followers (accepted requests TO me) ───────────────────────────────────

@router.get("/followers")
async def my_followers(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None:
        return []
    me = _uid(current_user)
    accepted = await db["follow_requests"].find(
        {"to_user": me, "status": "accepted"}
    ).to_list(200)

    # Also check who I follow / requested so we can show Follow Back or Following
    my_sent = await db["follow_requests"].find({"from_user": me}).to_list(500)
    sent_map = {str(r["to_user"]): r["status"] for r in my_sent}

    result = []
    for r in accepted:
        u = await db["users"].find_one({"_id": r["from_user"]}, {"password_hash": 0})
        if u:
            card = _user_card(u)
            uid_str = str(u["_id"])
            if sent_map.get(uid_str) == "accepted":
                card["follow_status"] = "following"
            elif sent_map.get(uid_str) == "pending":
                card["follow_status"] = "pending"
            else:
                card["follow_status"] = "follows_you"
            result.append(card)
    return result


# ─── Who I Follow (accepted requests FROM me) ─────────────────────────────────

@router.get("/following")
async def my_following(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None:
        return []
    me = _uid(current_user)
    accepted = await db["follow_requests"].find(
        {"from_user": me, "status": "accepted"}
    ).to_list(200)
    result = []
    for r in accepted:
        u = await db["users"].find_one({"_id": r["to_user"]}, {"password_hash": 0})
        if u:
            card = _user_card(u)
            card["follow_status"] = "following"
            result.append(card)
    return result


# ─── Count pending requests (for notification badge) ─────────────────────────

@router.get("/requests/count")
async def pending_request_count(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None:
        return {"count": 0}
    me = _uid(current_user)
    count = await db["follow_requests"].count_documents(
        {"to_user": me, "status": "pending"}
    )
    return {"count": count}


# ─── View a followed user's profile (summaries + quiz stats) ─────────────────

@router.get("/users/{target_id}/profile")
async def get_user_profile(
    target_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Returns another user's public profile including:
    - Basic info
    - Their PUBLIC materials + AI summaries (private ones excluded)
    - Quiz performance stats
    Allowed if current user follows target OR target follows current user (accepted).
    """
    if db is None or not ObjectId.is_valid(target_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    me = _uid(current_user)
    target_oid = ObjectId(target_id)

    # Check if connected (either I follow them or they follow me with accepted status)
    connected = await db["follow_requests"].find_one({
        "$or": [
            {"from_user": me, "to_user": target_oid, "status": "accepted"},
            {"from_user": target_oid, "to_user": me, "status": "accepted"},
        ]
    })
    if not connected:
        raise HTTPException(
            status_code=403,
            detail="You must be connected with this user (accepted follow) to view their profile."
        )

    target = await db["users"].find_one({"_id": target_oid}, {"password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Get their public materials only
    materials = await db["materials"].find(
        {"uploaded_by": target_oid, "is_private": False}
    ).sort("created_at", -1).to_list(20)

    mat_list = [{
        "id":          str(m["_id"]),
        "title":       m.get("title", ""),
        "subject":     m.get("subject", ""),
        "grade_level": m.get("grade_level", ""),
        "ai_summary":  m.get("ai_summary"),
        "created_at":  m.get("created_at", "").isoformat() if hasattr(m.get("created_at"), "isoformat") else "",
    } for m in materials]

    # Get their quiz performance stats (check both quiz_submissions and quizzes)
    submissions = await db["quiz_submissions"].find(
        {"student_id": target_oid}
    ).sort("submitted_at", -1).to_list(50)

    quizzes = await db["quizzes"].find(
        {"created_by": target_oid}
    ).sort("created_at", -1).to_list(50)

    total_quizzes = max(len(submissions), len(quizzes))
    scores = []
    for s in submissions:
        if s.get("percentage") is not None:
            scores.append(float(s["percentage"]))
        elif s.get("score") is not None and s.get("total_questions"):
            scores.append((float(s["score"]) / float(s["total_questions"])) * 100.0)
    if not scores:
        scores = [float(q.get("score", 0)) for q in quizzes if q.get("score") is not None]

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    return {
        "user":         _user_card(target),
        "materials":    mat_list,
        "quiz_stats": {
            "total_quizzes": total_quizzes,
            "avg_score":     avg_score,
            "recent_topics": [q.get("topic", "") for q in quizzes[:5] if q.get("topic")],
        }
    }

