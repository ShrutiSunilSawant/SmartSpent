import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.utils.config import settings
from app.utils.logger import logger


def _send(to: str, subject: str, html: str) -> None:
    if not settings.email_user or not settings.email_password:
        logger.warning("Email not configured — skipping send to {}", to)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"SmartSpent <{settings.email_user}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.email_host, settings.email_port) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.email_user, settings.email_password)
        smtp.sendmail(settings.email_user, to, msg.as_string())

    logger.info("Email sent → {} | {}", to, subject)


def send_verification_email(to: str, token: str) -> None:
    url = f"{settings.app_url}/verify-email?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1117;border-radius:12px;">
      <h2 style="color:#818cf8;margin-bottom:8px;">Verify your SmartSpent account</h2>
      <p style="color:#94a3b8;margin-bottom:24px;">Click the button below to confirm your email address.</p>
      <a href="{url}" style="display:inline-block;background:#5567f3;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Verify Email</a>
      <p style="color:#475569;font-size:12px;margin-top:24px;">This link expires in 24 hours.<br>If you didn't create a SmartSpent account you can safely ignore this email.</p>
    </div>
    """
    _send(to, "Verify your SmartSpent account", html)


def send_password_reset_email(to: str, token: str) -> None:
    url = f"{settings.app_url}/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1117;border-radius:12px;">
      <h2 style="color:#818cf8;margin-bottom:8px;">Reset your SmartSpent password</h2>
      <p style="color:#94a3b8;margin-bottom:24px;">Click the button below to set a new password. This link expires in <strong style="color:#f1f5f9;">1 hour</strong>.</p>
      <a href="{url}" style="display:inline-block;background:#5567f3;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Reset Password</a>
      <p style="color:#475569;font-size:12px;margin-top:24px;">If you didn't request a password reset you can safely ignore this email.</p>
    </div>
    """
    _send(to, "Reset your SmartSpent password", html)
