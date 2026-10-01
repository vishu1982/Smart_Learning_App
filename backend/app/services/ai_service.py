import os
import json
import requests
from app.config import settings

class AIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        self.primary_model = settings.GEMINI_MODEL.strip() if settings.GEMINI_MODEL else "gemini-2.0-flash"
        self.fallback_models = [self.primary_model, "gemini-1.5-flash", "gemini-1.5-pro"]
        self.has_api = len(self.api_key) > 10

    def _call_gemini_rest(self, prompt: str, is_json: bool = False, system_instruction: str = "") -> str:
        """
        Executes Google Gemini API generation via direct HTTPS REST endpoint.
        Handles model fallbacks, response schemas, and clean error recovery.
        Used for structured JSON tasks (quiz generation, summarization).
        """
        if not self.has_api:
            return ""

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 4096
            }
        }
        if is_json:
            payload["generationConfig"]["responseMimeType"] = "application/json"
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        for model in self.fallback_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=25)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        return candidates[0]["content"]["parts"][0]["text"]
                else:
                    print(f" [Gemini Notice] Model {model} status {resp.status_code}: {resp.text[:150]}")
            except Exception as e:
                print(f" [Gemini Notice] Model {model} exception: {e}")
        return ""

    def _call_gemini_chat(self, prompt: str, system_instruction: str = "") -> str:
        """
        Fast, conversational Gemini call optimised for the AI Tutor chat:
        - Higher temperature (0.7) for natural, friendly tone
        - Shorter token budget (2048) so replies arrive faster
        - Slightly longer timeout to handle complex questions gracefully
        """
        if not self.has_api:
            return ""

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
                "topP": 0.9,
                "topK": 40
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        for model in self.fallback_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        return candidates[0]["content"]["parts"][0]["text"]
                else:
                    print(f" [Gemini Chat Notice] Model {model} status {resp.status_code}: {resp.text[:150]}")
            except Exception as e:
                print(f" [Gemini Chat Notice] Model {model} exception: {e}")
        return ""

    async def summarize_document(self, title: str, text_content: str, grade_level: str = "General") -> dict:
        """
        Premium academic summarizer — produces rich, exam-ready study notes using Gemini.
        """
        system_instruction = (
            f"You are a top-tier academic educator and exam coach specialising in {grade_level} curriculum. "
            f"Your summaries are legendary for being clear, concise, and exam-ready. "
            f"Always produce output as valid JSON — no markdown fences, no extra text outside the JSON object."
        )

        content_chunk = text_content[:18000]   # send up to 18 000 chars for comprehensive coverage

        prompt = f"""Analyse the following study material titled "{title}" (targeted at {grade_level} students) and produce a comprehensive academic summary.

Return ONLY a valid JSON object (no code fences) matching this exact schema:
{{
    "key_takeaways": [
        "Precise, exam-relevant point 1 — include key term or formula",
        "Precise, exam-relevant point 2",
        "Precise, exam-relevant point 3",
        "Precise, exam-relevant point 4",
        "Precise, exam-relevant point 5",
        "Precise, exam-relevant point 6"
    ],
    "bullet_notes": "FULL MARKDOWN NOTES HERE"
}}

For the bullet_notes field, use the following structure (write proper Markdown):

## 📘 {title}
**Grade / Level:** {grade_level}

---

### 🔑 Core Concepts & Definitions
- Bold every key term the first time it appears.
- Include exact definitions as they would appear in textbooks.

### 📐 Formulas, Laws & Theorems
- List every formula / law / equation from the content.
- Show standard notation and SI units where applicable.
- If derivation steps exist, summarise them in numbered steps.

### 🔗 Step-by-Step Explanations
- Walk through main processes / mechanisms with numbered steps.
- Use simple real-world analogies to aid memory.

### 💡 Mnemonics & Memory Tricks
- Provide at least one memorable acronym or mnemonic for key lists or sequences.

### 🎯 High-Yield Exam Tips ({grade_level})
- Bullet points covering what examiners frequently test.
- Common mistakes students make and how to avoid them.
- Answer-writing strategy for this topic (marks allocation hints).

### 📝 Quick Revision Checklist
- [ ] Checklist item 1
- [ ] Checklist item 2
- [ ] Checklist item 3

---

Study Material Content:
{content_chunk}
"""

        raw_output = self._call_gemini_rest(prompt, is_json=True, system_instruction=system_instruction)
        if raw_output:
            try:
                clean_json = raw_output.strip()
                # Strip markdown fences if model wrapped output anyway
                for fence in ("```json", "```"):
                    if clean_json.startswith(fence):
                        clean_json = clean_json[len(fence):]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                result = json.loads(clean_json.strip())
                # Ensure we have at least 4 takeaways
                if len(result.get("key_takeaways", [])) < 4:
                    raise ValueError("Too few takeaways")
                return result
            except Exception as err:
                print(f"[Summarizer] JSON parse error: {err} — using intelligent fallback")

        # Smart fallback — extract real sentences from the document
        sentences = [l.strip() for l in text_content.replace("\n", " ").split(". ") if len(l.strip()) > 30]
        fallback_points = sentences[:6] if len(sentences) >= 6 else (sentences + [
            f"Review the key definitions and principles of {title}.",
            "Understand the step-by-step processes and their real-world applications.",
            "Practice all formulas and numerical examples for exam readiness.",
            "Focus on high-frequency exam topics identified in this chapter.",
        ])[:6]

        return {
            "key_takeaways": fallback_points,
            "bullet_notes": (
                f"## 📘 {title}\n**Grade / Level:** {grade_level}\n\n---\n\n"
                f"### 🔑 Core Concepts\n"
                f"- Review all definitions and key terms highlighted in your textbook.\n"
                f"- Connect each concept to its real-world application.\n\n"
                f"### 📐 Key Formulas & Laws\n"
                f"- List all formulas from this chapter with units.\n"
                f"- Practice derivations where applicable.\n\n"
                f"### 🎯 Exam Tips ({grade_level})\n"
                f"- Structure answers with definition → formula → example → diagram.\n"
                f"- Use bullet points and underline key terms for better marks.\n\n"
                f"### 📝 Quick Revision Checklist\n"
                f"- [ ] Read all definitions\n"
                f"- [ ] Revise all formulas\n"
                f"- [ ] Attempt 3 practice problems\n"
                f"- [ ] Review exam tips"
            )
        }


    async def generate_mcq_quiz(
        self,
        topic: str,
        subject: str,
        num_questions: int,
        difficulty: str,
        context_text: str = "",
        grade_level: str = "General"
    ) -> dict:
        """
        Generates fresh, unique MCQ questions every time using a timestamp seed.
        Easy = short factual questions. Medium = deeper application/conceptual.
        """
        import time
        seed = int(time.time()) % 9999   # different every call → different questions

        if difficulty.lower() in ("easy", "beginner"):
            diff_instruction = (
                "EASY level: Questions must be SHORT, SIMPLE, and FACTUAL. "
                "Test direct knowledge of definitions, basic facts, and single-step recall. "
                "Options must be clearly distinct — no trick answers. "
                "Keep question text under 15 words. Keep options under 8 words each."
            )
        elif difficulty.lower() in ("hard", "advanced"):
            diff_instruction = (
                "HARD level: Questions must require multi-step reasoning, synthesis, or higher-order analysis. "
                "Test deep understanding, edge cases, and advanced applications. "
                "Options must be plausible — students must think carefully."
            )
        else:  # medium
            diff_instruction = (
                "MEDIUM level: Questions must go BEYOND simple recall into application and conceptual understanding. "
                "Ask 'why', 'how', or 'what happens if…' type questions. "
                "Require understanding of mechanisms, processes, or cause-effect relationships. "
                "Questions should be concise (under 20 words) but conceptually rich."
            )

        context_prompt = f"\nReference Study Material (use only if directly relevant):\n{context_text[:8000]}\n" if context_text else ""

        prompt = f"""You are a professional exam-setter creating a UNIQUE quiz (variation #{seed}).

TASK: Generate exactly {num_questions} Multiple Choice Questions for {grade_level} students.
Subject: {subject}
Topic: {topic}
{diff_instruction}
{context_prompt}

STRICT RULES:
1. Every question MUST be different from standard textbook examples — create fresh variations.
2. Each question has EXACTLY 4 options (A, B, C, D).
3. correct_option_index is 0=A, 1=B, 2=C, 3=D.
4. explanation MUST be clear and educational (2-3 sentences max).
5. NO repeated or similar questions — all {num_questions} must test DIFFERENT aspects of {topic}.
6. Do NOT start every question with "What is..." — vary question stems.
7. Return ONLY valid JSON — no markdown, no extra text.

JSON schema:
{{
    "title": "{topic} — {difficulty.capitalize()} Assessment",
    "subject": "{subject}",
    "questions": [
        {{
            "question_id": 1,
            "question_text": "Concise, unique question about {topic}?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_option_index": 0,
            "explanation": "Clear 2-sentence explanation of why this is correct."
        }}
    ]
}}"""

        raw_output = self._call_gemini_rest(prompt, is_json=True, system_instruction=(
            f"You are an expert exam-setter for {grade_level} students. "
            f"Create fresh, varied MCQ questions. Never repeat questions. "
            f"Always return valid JSON only."
        ))

        if raw_output:
            try:
                clean_json = raw_output.strip()
                for fence in ("```json", "```"):
                    if clean_json.startswith(fence):
                        clean_json = clean_json[len(fence):]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                result = json.loads(clean_json.strip())
                if result.get("questions"):
                    return result
            except Exception as err:
                print(f"[Quiz] JSON parse error: {err}")



        # Intelligent Fallback Generator
        sample_questions = [
            {
                "question_id": 1,
                "question_text": f"What is the foundational law/principle behind {topic} in {subject}?",
                "options": [
                    "Guarantees system equilibrium and predictable state transitions",
                    "Violates the conservation of energy and state consistency",
                    "Randomizes all inputs without any structured algorithm",
                    "Only applies to theoretical models with zero physical reality"
                ],
                "correct_option_index": 0,
                "explanation": f"In {subject}, {topic} provides predictable, verified mechanisms ensuring correct execution."
            },
            {
                "question_id": 2,
                "question_text": f"Which unit / metric is standard when evaluating {topic}?",
                "options": [
                    "Standard SI units or performance throughput/latency",
                    "Arbitrary uncalibrated scales",
                    "Number of words printed on the textbook page",
                    "Physical dimensions of the test paper"
                ],
                "correct_option_index": 0,
                "explanation": "Quantifying standard units or performance metrics ensures objective verification."
            },
            {
                "question_id": 3,
                "question_text": f"When solving numerical problems on {topic}, what is the first critical step?",
                "options": [
                    "Identify known variables, target unknown, and apply governing formula",
                    "Guess the final answer randomly without calculation",
                    "Ignore all given unit conversions completely",
                    "Write unrelated text to fill page space"
                ],
                "correct_option_index": 0,
                "explanation": "Extracting given values, standardizing units, and applying the governing formula avoids calculation errors."
            }
        ]

        return {
            "title": f"{topic} Mastery Quiz",
            "subject": subject,
            "questions": sample_questions[:num_questions]
        }

    def _call_deepseek_chat(self, prompt: str, system_instruction: str = "") -> str:
        deepseek_key = settings.DEEPSEEK_API_KEY.strip() if settings.DEEPSEEK_API_KEY else ""
        if not deepseek_key:
            return ""
            
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {deepseek_key}"
        }
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": "deepseek-chat",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2048,
            "top_p": 0.9
        }
        
        try:
            url = "https://api.deepseek.com/chat/completions"
            resp = requests.post(url, headers=headers, json=payload, timeout=40)
            if resp.status_code == 200:
                data = resp.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"]
            else:
                print(f" [DeepSeek Error] status {resp.status_code}: {resp.text[:150]}")
        except Exception as e:
            print(f" [DeepSeek Exception]: {e}")
        return ""

    def _fetch_youtube_video(self, query: str) -> str:
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key or api_key == "YOUR_YOUTUBE_API_KEY_HERE":
            return ""
        
        import urllib.request
        import urllib.parse
        
        # Only fetch for queries that are likely topics (more than 3 words)
        if len(query.split()) < 2:
            return ""
            
        search_query = f"{query} educational course tutorial"
        params = {
            "part": "snippet",
            "q": search_query,
            "type": "video",
            "videoCategoryId": "27",
            "maxResults": "1",
            "key": api_key,
            "relevanceLanguage": "en"
        }
        query_string = urllib.parse.urlencode(params)
        url = f"https://www.googleapis.com/youtube/v3/search?{query_string}"
        
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                items = data.get("items", [])
                if items:
                    video_id = items[0]["id"]["videoId"]
                    title = items[0]["snippet"]["title"]
                    return f"\n\n### 📺 Recommended Video: {title}\n[![{title}](https://img.youtube.com/vi/{video_id}/0.jpg)](https://www.youtube.com/watch?v={video_id})"
        except Exception as e:
            print(f"[YouTube fetch error] {e}")
        return ""

    async def chat_with_tutor(self, subject: str, message: str, chat_history: list, grade_level: str = "General") -> str:
        """
        Fast adaptive AI Tutor using DeepSeek API for highly detailed, direct answers with a YouTube video embed.
        """
        # Build compact conversation context
        history_text = ""
        for msg in chat_history[-6:]:
            role = "Student" if msg.get("sender") == "USER" else "Tutor"
            history_text += f"{role}: {msg.get('content', '')[:500]}\n"

        system_instruction = (
            f"You are a direct, expert academic AI for {grade_level} students studying {subject}.\n"
            f"STRICT OUTPUT RULES:\n"
            f"1. Provide ONLY the complete answer to the user's question.\n"
            f"2. DO NOT include any conversational filler (e.g., 'Here is the answer', 'Sure', 'Hello', 'Feel free to ask').\n"
            f"3. Do NOT ask any follow-up questions at the end.\n"
            f"4. Format the answer cleanly in Markdown using headers (##), bold text, bullet points, and code blocks.\n"
            f"5. Provide very realistic, rich, and easy-to-understand explanations. Give the user deep content they can learn from."
        )

        prompt = f"{history_text}\nStudent: {message}\n\nTutor:"

        # Try DeepSeek first as requested for AI Tutor
        ai_reply = self._call_deepseek_chat(prompt, system_instruction=system_instruction)
        
        # Fallback to Gemini if DeepSeek fails
        if not ai_reply:
            ai_reply = self._call_gemini_chat(prompt, system_instruction=system_instruction)
            
        if ai_reply:
            ai_reply = ai_reply.strip()
            # Append youtube video
            video_md = self._fetch_youtube_video(message)
            if video_md:
                ai_reply += video_md
            return ai_reply

        # Hard Fallback
        return (
            f"## 💡 {subject}: {message}\n\n"
            f"**Direct Answer:** This concept involves a fundamental principle that governs how the system behaves under defined conditions."
        )

    async def translate_quiz_questions(self, questions: list, target_language: str) -> list:
        """
        Translates quiz question_text and options into Hindi or Gujarati using Gemini.
        Returns the same list structure with translated text, preserving question_id and other fields.
        target_language: "hindi" or "gujarati"
        """
        lang_name = "Hindi (Devanagari script)" if target_language == "hindi" else "Gujarati (Gujarati script)"

        system_instruction = (
            f"You are a professional academic translator specializing in Indian educational content. "
            f"Your task is to translate exam questions accurately into {lang_name}. "
            f"Maintain the academic meaning precisely — do NOT paraphrase or simplify. "
            f"Technical terms, subject-specific terminology, chemical formulas, equations, "
            f"and proper nouns (e.g. Newton, Boyle) must be kept in English inside the translated text. "
            f"Return ONLY valid JSON with the same structure provided."
        )

        # Build the prompt with the questions to translate
        q_list_json = json.dumps(
            [{"question_id": q["question_id"], "question_text": q["question_text"], "options": q["options"]} for q in questions],
            ensure_ascii=False
        )

        prompt = f"""
Translate the following academic MCQ questions into {lang_name}.

Rules:
1. Translate 'question_text' and each item in 'options' into {lang_name}.
2. Keep all mathematical expressions, chemical formulas, units (e.g. m/s², H₂O, ∆H), and English proper nouns unchanged.
3. Preserve the exact JSON structure — do NOT add or remove any fields.
4. Return ONLY valid JSON array with this exact structure:
[
  {{
    "question_id": <same number>,
    "question_text": "<translated question>",
    "options": ["<translated option A>", "<translated option B>", "<translated option C>", "<translated option D>"]
  }}
]

Questions to translate:
{q_list_json}
"""
        raw_output = self._call_gemini_rest(prompt, is_json=True, system_instruction=system_instruction)
        if raw_output:
            try:
                clean_json = raw_output.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                translated_list = json.loads(clean_json.strip())

                # Merge translated text back, preserving explanation and correct_option_index from originals
                orig_map = {q["question_id"]: q for q in questions}
                merged = []
                for t in translated_list:
                    orig = orig_map.get(t["question_id"], {})
                    merged.append({
                        "question_id": t["question_id"],
                        "question_text": t.get("question_text", orig.get("question_text", "")),
                        "options": t.get("options", orig.get("options", [])),
                        # Keep original answer metadata intact
                        "correct_option_index": orig.get("correct_option_index"),
                        "explanation": orig.get("explanation", "")
                    })
                return merged
            except Exception as err:
                print(f"[Translation Error] Failed to parse translated JSON: {err}")

        # Fallback: return original questions unchanged
        return questions


ai_service = AIService()

