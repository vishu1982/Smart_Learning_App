from bson import ObjectId

class AnalyticsService:
    @staticmethod
    async def get_student_overview(db, student_id: ObjectId) -> dict:
        if db is None:
            return {
                "total_quizzes_taken": 3,
                "average_score_pct": 85.0,
                "total_materials_read": 4,
                "total_ai_chat_queries": 6,
                "weak_subjects": [
                    {"subject": "Advanced Database Systems", "average_score": 90.0, "status": "Mastered"},
                    {"subject": "Software Engineering", "average_score": 75.0, "status": "Proficient"}
                ]
            }

        submissions = await db["quiz_submissions"].find({"student_id": student_id}).to_list(100)
        total_quizzes = len(submissions)
        avg_score = round(sum(s.get("percentage", 0) for s in submissions) / total_quizzes, 1) if total_quizzes > 0 else 0.0

        materials_count = await db["materials"].count_documents({"uploaded_by": student_id})

        chat_count = await db["chat_sessions"].count_documents({"student_id": student_id})

        subject_map = {}
        for s in submissions:
            sb = s.get("subject", "General")
            if sb not in subject_map:
                subject_map[sb] = {"total": 0, "count": 0}
            subject_map[sb]["total"] += s.get("percentage", 0)
            subject_map[sb]["count"] += 1

        weak_subjects = []
        for sb, data in subject_map.items():
            s_avg = round(data["total"] / data["count"], 1)
            weak_subjects.append({
                "subject": sb,
                "average_score": s_avg,
                "status": "Needs Improvement" if s_avg < 60 else "Proficient" if s_avg < 80 else "Mastered"
            })

        return {
            "total_quizzes_taken": total_quizzes,
            "average_score_pct": avg_score,
            "total_materials_read": materials_count,
            "total_ai_chat_queries": chat_count,
            "weak_subjects": weak_subjects
        }

    @staticmethod
    async def get_student_chart_data(db, student_id: ObjectId) -> list:
        if db is None:
            return [
                {"date": "Aug 10", "score_pct": 70, "subject": "DBMS"},
                {"date": "Aug 14", "score_pct": 85, "subject": "DBMS"},
                {"date": "Aug 18", "score_pct": 100, "subject": "DBMS"}
            ]
        subs = await db["quiz_submissions"].find({"student_id": student_id}).sort("submitted_at", 1).to_list(20)
        chart_data = []
        for idx, sub in enumerate(subs):
            dt = sub.get("submitted_at").strftime("%b %d") if sub.get("submitted_at") else f"Q#{idx+1}"
            chart_data.append({
                "quiz_number": f"Q#{idx+1}",
                "date": dt,
                "score_pct": sub.get("percentage", 0),
                "subject": sub.get("subject", "General")
            })
        return chart_data

    @staticmethod
    async def get_admin_overview(db) -> dict:
        if db is None:
            return {"total_students": 15, "total_materials": 8, "total_quizzes_generated": 20, "total_submissions": 45}
        total_students = await db["users"].count_documents({"role": "STUDENT"})
        total_materials = await db["materials"].count_documents({})
        total_quizzes = await db["quizzes"].count_documents({})
        total_subs = await db["quiz_submissions"].count_documents({})
        return {
            "total_students": total_students,
            "total_materials": total_materials,
            "total_quizzes_generated": total_quizzes,
            "total_submissions": total_subs
        }

analytics_service = AnalyticsService()
