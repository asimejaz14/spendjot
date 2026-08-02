"""Transactional email.

Two transports, preferred in order: the Resend HTTP API (works where outbound
SMTP ports are blocked, e.g. Render), then SMTP over implicit TLS (port 465).

Sends are best-effort: if email isn't configured or a send fails, we log and move
on — a signup must never fail because the mail provider is unreachable.
"""
from __future__ import annotations

import logging
from decimal import Decimal
from email.message import EmailMessage
from typing import TYPE_CHECKING

import aiosmtplib
import httpx

from app.core.config import settings

if TYPE_CHECKING:
    from app.services.recap_service import WeeklyStats

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
    """Send one email via the best available transport.

    Returns True if sent, False if skipped/failed. Never raises — a mail outage
    must not break the request that triggered it.
    """
    if not settings.emails_enabled:
        logger.info("Email skipped (no transport configured): to=%s subject=%s", to, subject)
        return False

    if settings.resend_api_key:
        return await _send_via_resend(to=to, subject=subject, html=html, text=text)
    return await _send_via_smtp(to=to, subject=subject, html=html, text=text)


async def _send_via_resend(*, to: str, subject: str, html: str, text: str) -> bool:
    """Send through the Resend HTTP API (https://resend.com/docs/api-reference)."""
    payload = {
        "from": f"{settings.smtp_from_name} <{settings.smtp_from_email}>",
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json=payload,
            )
        if resp.is_success:
            logger.info(
                "Email sent via Resend: to=%s subject=%s id=%s",
                to, subject, resp.json().get("id"),
            )
            return True
        logger.warning(
            "Resend send failed: to=%s status=%s body=%s", to, resp.status_code, resp.text
        )
        return False
    except Exception as exc:  # noqa: BLE001 — never let email break the request
        logger.warning("Resend send error: to=%s error=%s", to, exc)
        return False


async def _send_via_smtp(*, to: str, subject: str, html: str, text: str) -> bool:
    """Send through SMTP over implicit TLS (port 465)."""
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
        logger.info("Email sent via SMTP: to=%s subject=%s", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001 — never let email break the request
        logger.warning("SMTP send failed: to=%s error=%s", to, exc)
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


def _pkr(amount: Decimal | int | float | None) -> str:
    """Whole-rupee PKR, e.g. '₨ 12,500'."""
    if amount is None:
        return "—"
    return f"₨ {int(Decimal(str(amount))):,}"


def _first_name(display_name: str | None) -> str:
    return (display_name or "").strip().split(" ")[0] if display_name else ""


def _stat_row(label: str, value: str) -> str:
    return f"""\
              <tr>
                <td style="padding:10px 0;font-size:14px;color:{_MUTED};">{label}</td>
                <td align="right" style="padding:10px 0;font-size:14px;font-weight:600;color:{_INK};">{value}</td>
              </tr>"""


def build_weekly_recap_email(display_name: str | None, stats: "WeeklyStats") -> tuple[str, str, str]:
    """Return (subject, html, text) for the weekly spending recap."""
    name = _first_name(display_name)
    greeting = f"Here's your week, {name}" if name else "Here's your week"
    app_url = settings.frontend_url.rstrip("/")
    logo_url = f"{app_url}/brand/icon-png/spendjot-icon-256.png"
    subject = "Your week on Spend Jot 📊"

    # Budget context lines (only when an overall budget is set).
    has_budget = stats.month_budget is not None
    pct = int(round((stats.month_pct or 0) * 100))
    bar_pct = max(0, min(100, pct))
    bar_color = "#ef4444" if bar_pct >= 100 else "#f59e0b" if bar_pct >= 75 else "#10b981"

    # --- plain text ---
    lines = [
        greeting + "!",
        "",
        f"This week you spent {_pkr(stats.week_total)} across {stats.week_count} "
        f"{'expense' if stats.week_count == 1 else 'expenses'}.",
    ]
    if stats.top_category:
        lines.append(f"Top category: {stats.top_category} ({_pkr(stats.top_category_amount)}).")
    if has_budget:
        lines += [
            "",
            f"{stats.month_label} budget: {_pkr(stats.month_spent)} of "
            f"{_pkr(stats.month_budget)} ({pct}%). {_pkr(stats.month_remaining)} left.",
        ]
        if stats.safe_per_day is not None and (stats.month_remaining or 0) > 0:
            lines.append(
                f"Safe to spend: {_pkr(stats.safe_per_day)}/day for {stats.days_left} "
                f"{'day' if stats.days_left == 1 else 'days'}."
            )
    lines += ["", f"Open Spend Jot: {app_url}", "", "— The Spend Jot team"]
    text = "\n".join(lines)

    # --- html rows ---
    rows = _stat_row("Spent this week", _pkr(stats.week_total))
    rows += _stat_row("Expenses logged", str(stats.week_count))
    if stats.top_category:
        rows += _stat_row("Top category", f"{stats.top_category} · {_pkr(stats.top_category_amount)}")

    budget_block = ""
    if has_budget:
        safe_line = ""
        if stats.safe_per_day is not None and (stats.month_remaining or 0) > 0:
            safe_line = (
                f'<p style="margin:8px 0 0;font-size:13px;color:{_MUTED};">'
                f'Safe to spend <strong style="color:{_INK};">{_pkr(stats.safe_per_day)}/day</strong> '
                f'for {stats.days_left} {"day" if stats.days_left == 1 else "days"}.</p>'
            )
        budget_block = f"""\
          <tr>
            <td style="padding:4px 32px 8px;">
              <div style="font-size:13px;color:{_MUTED};margin-bottom:6px;">
                {stats.month_label} budget · <strong style="color:{_INK};">{_pkr(stats.month_spent)}</strong> of {_pkr(stats.month_budget)} ({pct}%)
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="border-radius:6px;overflow:hidden;background:#ECE9F6;">
                <tr>
                  <td width="{bar_pct}%" style="background:{bar_color};height:8px;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="height:8px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:13px;color:{_MUTED};">
                <strong style="color:{_INK};">{_pkr(stats.month_remaining)}</strong> left this month.
              </p>
              {safe_line}
            </td>
          </tr>"""

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
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 16px;font-family:{_FONT_HEAD};font-size:22px;
                         font-weight:700;color:{_INK};">{greeting}</h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse;">
                {rows}
              </table>
            </td>
          </tr>
{budget_block}
          <tr>
            <td align="center" style="padding:26px 32px 36px;">
              <a href="{app_url}"
                 style="display:inline-block;background:{_VIOLET};color:#ffffff;
                        text-decoration:none;font-family:{_FONT_HEAD};font-weight:600;
                        font-size:15px;padding:13px 30px;border-radius:12px;">
                Open Spend Jot
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:{_MIST};border-top:1px solid #E7E3F5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9A95AD;text-align:center;">
                You're receiving your weekly Spend Jot recap.<br>
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


async def send_weekly_recap_email(
    to_email: str, display_name: str | None, stats: "WeeklyStats"
) -> bool:
    subject, html, text = build_weekly_recap_email(display_name, stats)
    return await send_email(to=to_email, subject=subject, html=html, text=text)
