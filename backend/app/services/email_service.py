"""Transactional email (SMTP over implicit TLS, e.g. port 465).

Sends are best-effort: if SMTP isn't configured or a send fails, we log and move
on — a signup must never fail because the mail server is unreachable.
"""
from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger("spendjot.email")

# Brand palette (from the Spend Jot brand kit).
_INK = "#13111C"
_VIOLET = "#7C3AED"
_MIST = "#F6F4FF"
_MUTED = "#6B6580"
_GRADIENT = "linear-gradient(135deg,#8B5CF6 0%,#6D5DEF 50%,#4F46E5 100%)"
_FONT_HEAD = "'Sora','Segoe UI',Roboto,Helvetica,Arial,sans-serif"
_FONT_BODY = "'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif"


async def send_email(*, to: str, subject: str, html: str, text: str) -> bool:
    """Send one email. Returns True if sent, False if skipped/failed."""
    if not settings.emails_enabled:
        logger.info("Email skipped (SMTP not configured): to=%s subject=%s", to, subject)
        return False

    message = EmailMessage()
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            use_tls=settings.smtp_use_tls,   # implicit TLS for port 465
            timeout=20,
        )
        logger.info("Email sent: to=%s subject=%s", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001 — never let email break the request
        logger.warning("Email send failed: to=%s error=%s", to, exc)
        return False


def build_welcome_email(display_name: str | None) -> tuple[str, str, str]:
    """Return (subject, html, text) for the signup welcome email."""
    name = (display_name or "").strip().split(" ")[0] if display_name else ""
    greeting = f"Welcome, {name}!" if name else "Welcome to Spend Jot!"
    app_url = settings.frontend_url.rstrip("/")
    logo_url = f"{app_url}/brand/icon-png/spendjot-icon-256.png"

    subject = "Welcome to Spend Jot 🎉"

    text = (
        f"{greeting}\n\n"
        "You're all set — start jotting your expenses in seconds and watch your "
        "spending come to life on a clean, simple dashboard.\n\n"
        f"Open Spend Jot: {app_url}\n\n"
        "— The Spend Jot team\n"
        "You're receiving this because you just created a Spend Jot account."
    )

    html = f"""\
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:{_MIST};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:{_MIST};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;
                      border:1px solid #E7E3F5;font-family:{_FONT_BODY};">
          <!-- Header / brand -->
          <tr>
            <td align="center"
                style="background:{_VIOLET};background-image:{_GRADIENT};padding:36px 24px;">
              <img src="{logo_url}" width="60" height="60" alt="Spend Jot"
                   style="display:block;border:0;border-radius:16px;margin:0 auto 14px;">
              <div style="font-family:{_FONT_HEAD};font-size:24px;font-weight:700;
                          color:#ffffff;letter-spacing:-0.01em;">
                Spend<span style="color:#E9D5FF;">Jot</span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 8px;">
              <h1 style="margin:0 0 12px;font-family:{_FONT_HEAD};font-size:22px;
                         font-weight:700;color:{_INK};">{greeting}</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:{_MUTED};">
                You're all set — start jotting your expenses in seconds and watch your
                spending come to life on a clean, simple dashboard.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td align="center" style="padding:28px 32px 36px;">
              <a href="{app_url}"
                 style="display:inline-block;background:{_VIOLET};color:#ffffff;
                        text-decoration:none;font-family:{_FONT_HEAD};font-weight:600;
                        font-size:15px;padding:13px 30px;border-radius:12px;">
                Open Spend Jot
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:22px 32px;background:{_MIST};border-top:1px solid #E7E3F5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9A95AD;text-align:center;">
                You're receiving this because you just created a Spend Jot account.<br>
                Expense tracking, jotted in seconds.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, html, text


async def send_welcome_email(to_email: str, display_name: str | None) -> None:
    subject, html, text = build_welcome_email(display_name)
    await send_email(to=to_email, subject=subject, html=html, text=text)
