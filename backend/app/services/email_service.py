"""
Email notification service using Python's built-in smtplib.
Sends HTML emails for subscription alerts, quiz milestones, etc.

Configuration (set in .env or environment):
    EMAIL_HOST      = smtp.gmail.com
    EMAIL_PORT      = 587
    EMAIL_USER      = your-gmail@gmail.com
    EMAIL_PASS      = your-app-password   (Gmail: Settings → Security → App Passwords)
    EMAIL_FROM_NAME = Smart Learning AI

If EMAIL_USER is not configured, emails are silently skipped (development mode).
"""

import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

EMAIL_HOST      = os.getenv("EMAIL_HOST",      "smtp.gmail.com")
EMAIL_PORT      = int(os.getenv("EMAIL_PORT",  "587"))
EMAIL_USER      = os.getenv("EMAIL_USER",      "")        # set in .env
EMAIL_PASS      = os.getenv("EMAIL_PASS",      "")        # set in .env
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Smart Learning AI")


def _send(to_email: str, subject: str, html_body: str) -> bool:
    """Low-level send. Returns True on success, False on failure."""
    if not EMAIL_USER or not EMAIL_PASS:
        print(f"[Email] Skipped (no credentials): {subject} → {to_email}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{EMAIL_FROM_NAME} <{EMAIL_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, to_email, msg.as_string())
        print(f"[Email] ✓ Sent: '{subject}' → {to_email}")
        return True
    except Exception as e:
        print(f"[Email] ✗ Failed: {e}")
        return False


def _base_template(content_html: str) -> str:
    """Wraps content in a clean branded email shell."""
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
              🎓 Smart Learning AI
            </h1>
            <p style="margin:6px 0 0;color:#c7d2fe;font-size:13px;">Your AI-powered academic companion</p>
          </td>
        </tr>

        <!-- Content -->
        <tr><td style="padding:32px;">
          {content_html}
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              © {datetime.utcnow().year} Smart Learning AI · Powered by Gemini AI<br>
              You are receiving this because you are a registered student.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ─── Public API ───────────────────────────────────────────────────────────────

def send_quiz_milestone_email(to_email: str, full_name: str, quiz_count: int) -> bool:
    """
    Sent after a student completes their 8th quiz — promotes subscription upgrade.
    """
    first = full_name.split()[0] if full_name else "Student"
    content = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:800;">
        🏆 Amazing Progress, {first}!
      </h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
        You've just completed your <strong style="color:#4f46e5;">{quiz_count}th quiz</strong> on Smart Learning AI!
        That's incredible dedication to your studies.
      </p>

      <!-- Stats card -->
      <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:13px;color:#4f46e5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">
          Your Learning Milestone
        </p>
        <p style="margin:8px 0 0;font-size:32px;font-weight:900;color:#1e293b;">
          {quiz_count} Quizzes ✅
        </p>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Keep going — you're building real exam-ready skills!</p>
      </div>

      <!-- Upgrade CTA -->
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
        <p style="margin:0 0 6px;color:#c7d2fe;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">
          🔓 Unlock Your Full Potential
        </p>
        <h3 style="margin:0 0 10px;color:#fff;font-size:18px;font-weight:800;">
          Upgrade to Smart Pro
        </h3>
        <p style="margin:0 0 16px;color:#c7d2fe;font-size:13px;">
          Get detailed step-by-step AI answers, unlimited queries,<br>formula walkthroughs &amp; personalized exam strategy.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="padding:0 8px;">
              <span style="display:inline-block;background:#fff;color:#4f46e5;font-weight:800;font-size:13px;padding:10px 20px;border-radius:8px;">
                ⚡ Smart Pro — ₹99/month
              </span>
            </td>
            <td style="padding:0 8px;">
              <span style="display:inline-block;background:rgba(255,255,255,.15);color:#fff;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;border:1px solid rgba(255,255,255,.3);">
                👑 Smart Elite — ₹799/year
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Feature list -->
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1e293b;">What you unlock with Pro:</p>
      <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:13px;line-height:1.8;">
        <li>✅ Detailed step-by-step AI Tutor answers</li>
        <li>✅ Unlimited quiz generation on any topic</li>
        <li>✅ Formula derivations &amp; worked examples</li>
        <li>✅ Exam strategy &amp; mark-allocation tips</li>
        <li>✅ Hindi &amp; Gujarati quiz translation</li>
        <li>✅ Priority AI response speed</li>
      </ul>

      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Open the app and click <strong>Upgrade to Pro</strong> in the AI Tutor to get started instantly.
      </p>
    """
    return _send(
        to_email=to_email,
        subject=f"🏆 You've completed {quiz_count} quizzes! Unlock Smart Pro",
        html_body=_base_template(content)
    )


def send_subscription_activated_email(to_email: str, full_name: str, plan: str) -> bool:
    """Confirmation email after a student subscribes."""
    first  = full_name.split()[0] if full_name else "Student"
    label  = "Smart Elite 👑" if plan == "elite" else "Smart Pro ⚡"
    price  = "₹799/year" if plan == "elite" else "₹99/month"
    content = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:800;">
        Welcome to {label}, {first}! 🎉
      </h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
        Your subscription has been activated. You now have full access to all premium AI features.
      </p>
      <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:13px;color:#059669;font-weight:700;">✅ Subscription Active</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#1e293b;">{label}</p>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">{price} · Instant activation</p>
      </div>
      <p style="color:#475569;font-size:13px;">
        Head back to the <strong>AI Tutor</strong> and ask any question with <em>"explain in detail"</em>
        or <em>"step by step"</em> to experience the full power of your upgrade.
      </p>
    """
    return _send(
        to_email=to_email,
        subject=f"✅ {label} Activated — Welcome aboard!",
        html_body=_base_template(content)
    )


def send_welcome_email(to_email: str, full_name: str) -> bool:
    """Welcome email on registration."""
    first = full_name.split()[0] if full_name else "Student"
    content = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:800;">
        Welcome to Smart Learning AI, {first}! 🚀
      </h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
        Your account is all set. Here's what you can do right away:
      </p>
      <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:13px;line-height:1.9;">
        <li>📄 Upload your textbook PDF and get AI-generated study notes</li>
        <li>🧠 Ask the AI Tutor any academic question</li>
        <li>📝 Take subject-wise MCQ quizzes to test your knowledge</li>
        <li>📊 Track your progress on the dashboard</li>
      </ul>
      <p style="color:#94a3b8;font-size:12px;">Happy learning! 🎓</p>
    """
    return _send(
        to_email=to_email,
        subject="🎓 Welcome to Smart Learning AI!",
        html_body=_base_template(content)
    )


def send_otp_email(to_email: str, full_name: str, otp: str, purpose: str = "login") -> bool:
    """
    Sends a 6-digit OTP for login, registration, payment, or account deletion.
    purpose: "login" | "register" | "payment" | "delete_account"
    """
    first = (full_name or "Student").split()[0]
    if purpose == "payment":
        title    = "💳 Payment Verification OTP"
        subtitle = "Use this OTP to confirm your UPI payment and activate your subscription."
        context  = "After entering this OTP your plan will be activated instantly."
    elif purpose == "register":
        title    = "🎓 Verify Your Email — Smart Learning AI"
        subtitle = "You're almost there! Verify your email to complete account registration."
        context  = "This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone."
    elif purpose == "delete_account":
        title    = "⚠️ Account Deletion Confirmation OTP"
        subtitle = "You requested to permanently delete your Smart Learning AI account."
        context  = "<strong style='color:#dc2626;'>WARNING:</strong> Entering this OTP will <strong>permanently delete your account</strong> and all associated data. This action cannot be undone. OTP is valid for <strong>10 minutes</strong>."
    else:
        title    = "🔐 Your Login OTP"
        subtitle = "Use this one-time password to sign in to Smart Learning AI."
        context  = "This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone."

    content = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:800;">
        {title}
      </h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
        Hi {first}! {subtitle}
      </p>

      <!-- OTP Display -->
      <div style="text-align:center;margin:0 0 24px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px;padding:24px 40px;">
          <p style="margin:0 0 4px;color:#c7d2fe;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
            Your OTP
          </p>
          <p style="margin:0;color:#fff;font-size:40px;font-weight:900;letter-spacing:12px;font-family:monospace;">
            {otp}
          </p>
        </div>
      </div>

      <p style="color:#475569;font-size:13px;text-align:center;margin:0 0 16px;">
        {context}
      </p>
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">
        If you did not request this OTP, please ignore this email.
      </p>
    """
    return _send(
        to_email=to_email,
        subject=f"{'💳' if purpose == 'payment' else '🔐'} Your Smart Learning AI OTP: {otp}",
        html_body=_base_template(content)
    )

