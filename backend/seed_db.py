import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.security import get_password_hash
from app.config import settings

async def seed():
    print(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    await db["users"].delete_many({"email": {"$in": ["student@univ.edu", "student10@univ.edu", "student12@univ.edu", "admin@univ.edu"]}})

    # 1. Demo Class 10th Student
    student10_doc = {
        "full_name": "Rohan Verma (Class 10th Board Student)",
        "email": "student10@univ.edu",
        "password_hash": get_password_hash("Student@123"),
        "role": "STUDENT",
        "is_active": True,
        "profile": {"grade_level": "Class 10th", "program": "Secondary Board Education", "semester": 10},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    s10_res = await db["users"].insert_one(student10_doc)
    student10_id = s10_res.inserted_id
    print(" Demo Class 10th Student created: student10@univ.edu / Student@123")

    # 2. Demo Class 12th Student
    student12_doc = {
        "full_name": "Ananya Sen (Class 12th Science Student)",
        "email": "student12@univ.edu",
        "password_hash": get_password_hash("Student@123"),
        "role": "STUDENT",
        "is_active": True,
        "profile": {"grade_level": "Class 11th-12th", "program": "Senior Secondary Science (PCM)", "semester": 12},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    s12_res = await db["users"].insert_one(student12_doc)
    student12_id = s12_res.inserted_id
    print(" Demo Class 12th Student created: student12@univ.edu / Student@123")

    # 3. Demo College Student
    student_doc = {
        "full_name": "Aarav Sharma (College / Degree Student)",
        "email": "student@univ.edu",
        "password_hash": get_password_hash("Student@123"),
        "role": "STUDENT",
        "is_active": True,
        "profile": {"grade_level": "Undergraduate / Postgraduate", "program": "Computer Applications", "semester": 3},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    s_res = await db["users"].insert_one(student_doc)
    student_id = s_res.inserted_id
    print(" Demo College Student created: student@univ.edu / Student@123")

    # 4. Demo Admin / Faculty
    admin_doc = {
        "full_name": "Dr. Ramesh Gupta (Faculty Admin)",
        "email": "admin@univ.edu",
        "password_hash": get_password_hash("Admin@123"),
        "role": "ADMIN",
        "is_active": True,
        "profile": {"grade_level": "Faculty", "program": "Academic Supervisor", "semester": 0},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db["users"].insert_one(admin_doc)
    print(" Demo Admin created: admin@univ.edu / Admin@123")

    # 5. Class 10th Study Material (Chemical Reactions & Equations)
    mat10 = {
        "title": "Class 10 Science: Chemical Reactions & Equations",
        "subject": "Science (Chemistry)",
        "grade_level": "Class 10th",
        "file_name": "class10_chemistry_chapter1.pdf",
        "file_path": "uploads/materials/sample_class10.pdf",
        "file_size_bytes": 256000,
        "extracted_text_preview": "Chemical reactions occur when chemical bonds between atoms are formed or broken...",
        "ai_summary": {
            "key_takeaways": [
                "Law of Conservation of Mass requires balancing chemical equations (Mass reactants = Mass products).",
                "Types of reactions: Combination, Decomposition, Displacement, Double Displacement, and Redox.",
                "Oxidation is the gain of oxygen or loss of electrons; Reduction is the loss of oxygen or gain of electrons.",
                "Corrosion (e.g. rusting of iron) and Rancidity are daily-life examples of oxidation."
            ],
            "bullet_notes": "### 🧪 Chapter 1: Chemical Reactions (Class 10)\n\n#### 1. Indicators of a Reaction\n- Change in state or color\n- Evolution of gas (e.g. H2 popping sound)\n- Change in temperature (Exothermic vs Endothermic)\n\n#### 2. Balancing Tip\n- Balance elements appearing in fewest compounds first, balance Oxygen and Hydrogen last!"
        },
        "uploaded_by": student10_id,
        "status": "PROCESSED",
        "created_at": datetime.utcnow()
    }
    m10_res = await db["materials"].insert_one(mat10)

    # 6. Class 10th Sample Quiz
    quiz10 = {
        "title": "Chemical Reactions & Balancing Master Quiz",
        "subject": "Science (Chemistry)",
        "topic": "Chemical Reactions",
        "grade_level": "Class 10th",
        "material_id": m10_res.inserted_id,
        "created_by": student10_id,
        "time_limit_minutes": 10,
        "questions": [
            {
                "question_id": 1,
                "question_text": "Which law necessitates the balancing of a chemical equation?",
                "options": [
                    "Law of Conservation of Mass",
                    "Law of Definite Proportions",
                    "Avogadro's Law",
                    "Ohm's Law"
                ],
                "correct_option_index": 0,
                "explanation": "Mass can neither be created nor destroyed in a chemical reaction, so atoms on both sides must be equal."
            },
            {
                "question_id": 2,
                "question_text": "What type of reaction is: 2H2 + O2 -> 2H2O?",
                "options": [
                    "Combination Reaction",
                    "Decomposition Reaction",
                    "Displacement Reaction",
                    "Neutralization Reaction"
                ],
                "correct_option_index": 0,
                "explanation": "Two or more reactants combine to form a single product in a Combination Reaction."
            }
        ],
        "created_at": datetime.utcnow()
    }
    q10_res = await db["quizzes"].insert_one(quiz10)

    # 7. Sample submission for Class 10th
    await db["quiz_submissions"].insert_one({
        "quiz_id": q10_res.inserted_id,
        "student_id": student10_id,
        "subject": "Science (Chemistry)",
        "grade_level": "Class 10th",
        "time_taken_seconds": 120,
        "score": 2,
        "total_questions": 2,
        "percentage": 100.0,
        "answers": [{"question_id": 1, "selected_option_index": 0, "is_correct": True}, {"question_id": 2, "selected_option_index": 0, "is_correct": True}],
        "submitted_at": datetime.utcnow()
    })

    print(" Database seeding for all student levels completed successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
