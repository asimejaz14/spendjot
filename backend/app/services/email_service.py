"""Transactional email.

Two transports, preferred in order: the Resend HTTP API (works where outbound
SMTP ports are blocked, e.g. Render), then SMTP over implicit TLS (port 465).

Sends are best-effort: if email isn't configured or a send fails, we log and move
on — a signup must never fail because the mail provider is unreachable.

The HTML is hand-built for email clients (not browsers): table layout, fully
inline styles, a hidden preheader, bulletproof (VML) buttons for Outlook, a
fluid width with a small responsive `<style>` enhancement, and a forced light
color-scheme so dark-mode clients don't invert the design into poor contrast.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
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
_VIOLET_DK = "#4F46E5"
_LILAC = "#E9D5FF"
_MIST = "#F6F4FF"
_MUTED = "#6B6580"
_LINE = "#E7E3F5"
_FAINT = "#9A95AD"
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


# ---------------------------------------------------------------------------
# Shared HTML building blocks
# ---------------------------------------------------------------------------

# Embedded styles: an enhancement layer for clients that honour <style>
# (Apple Mail, Gmail, iOS). Outlook ignores it and renders the fluid base.
# Only literal braces live here, so keep this OUT of any f-string.
_STYLE = """
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    body, table, td { margin: 0; padding: 0; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
    a { text-decoration: none; }
    .sj-card { width: 100%; max-width: 512px; }
    @media only screen and (max-width: 600px) {
      .sj-pad { padding-left: 22px !important; padding-right: 22px !important; }
      .sj-hero { font-size: 34px !important; }
      .sj-h1 { font-size: 20px !important; }
      .sj-shell { padding: 20px 8px !important; }
    }
  </style>
"""


def _app_url() -> str:
    return settings.frontend_url.rstrip("/")


def _preheader(text: str) -> str:
    """Hidden inbox-preview text; trailing entities stop the client from
    spilling body copy into the preview line."""
    filler = "&nbsp;&zwnj;" * 60
    return (
        f'<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;'
        f'font-size:1px;line-height:1px;color:{_MIST};opacity:0;">{text}{filler}</div>'
    )


def _button(href: str, label: str) -> str:
    """Bulletproof CTA: a VML round-rect for Outlook, a gradient anchor
    everywhere else."""
    return f"""\
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="{_VIOLET}" style="border-radius:12px;background:{_VIOLET};background-image:{_GRADIENT};">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{href}" style="height:48px;v-text-anchor:middle;width:230px;" arcsize="25%" strokecolor="{_VIOLET}" fillcolor="{_VIOLET}">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:{_FONT_HEAD};font-size:15px;font-weight:bold;">{label}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{href}" style="display:inline-block;padding:14px 34px;font-family:{_FONT_HEAD};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:12px;">{label}</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>"""


def _shell(*, title: str, preheader: str, content: str, footer_note: str) -> str:
    """Wrap section `content` in the shared frame: brand header + card + footer."""
    app_url = _app_url()
    logo_url = f"{app_url}/brand/icon-png/spendjot-icon-256.png"
    year = datetime.now(timezone.utc).year

    header = f"""\
          <tr>
            <td align="center" bgcolor="{_VIOLET}" style="background:{_VIOLET};background-image:{_GRADIENT};padding:38px 24px 32px;">
              <img src="{logo_url}" width="60" height="60" alt="Spend Jot"
                   style="display:block;border:0;border-radius:16px;margin:0 auto 14px;">
              <div style="font-family:{_FONT_HEAD};font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">
                Spend<span style="color:{_LILAC};">Jot</span>
              </div>
            </td>
          </tr>"""

    footer = f"""\
          <tr>
            <td class="sj-pad" style="padding:24px 34px 28px;background:{_MIST};border-top:1px solid {_LINE};">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:{_FAINT};text-align:center;">
                {footer_note}
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:{_FAINT};text-align:center;">
                <a href="{app_url}" style="color:{_VIOLET};text-decoration:none;font-weight:600;">Spend&nbsp;Jot</a>
                &nbsp;·&nbsp;Expense tracking, jotted in seconds.<br>
                &copy; {year} Spend Jot
              </p>
            </td>
          </tr>"""

    return (
        '<!doctype html>\n'
        '<html lang="en" xmlns="http://www.w3.org/1999/xhtml" '
        'xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n'
        '<head>\n'
        '  <meta charset="utf-8">\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n'
        '  <meta name="color-scheme" content="light">\n'
        '  <meta name="supported-color-schemes" content="light">\n'
        f'  <title>{title}</title>\n'
        '  <!--[if mso]><style>* { font-family: "Segoe UI", Arial, sans-serif !important; }</style><![endif]-->\n'
        + _STYLE +
        '</head>\n'
        f'<body style="margin:0;padding:0;background:{_MIST};">\n'
        + _preheader(preheader) +
        f'''  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{_MIST};">
    <tr>
      <td class="sj-shell" align="center" style="padding:32px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="sj-card"
               style="width:100%;max-width:512px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid {_LINE};font-family:{_FONT_BODY};">
{header}
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
{content}
              </table>
            </td>
          </tr>
{footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'''
    )


def _feature(icon: str, title: str, body: str) -> str:
    """A single 'what you can do' row: icon chip + title + one-liner."""
    return f"""\
                <tr>
                  <td width="48" valign="top" style="padding:9px 0;">
                    <div style="width:38px;height:38px;border-radius:11px;background:{_MIST};border:1px solid {_LINE};text-align:center;line-height:38px;font-size:18px;">{icon}</div>
                  </td>
                  <td valign="top" style="padding:9px 0 9px 12px;">
                    <div style="font-family:{_FONT_HEAD};font-size:15px;font-weight:600;color:{_INK};line-height:1.3;">{title}</div>
                    <div style="font-size:13px;line-height:1.5;color:{_MUTED};margin-top:2px;">{body}</div>
                  </td>
                </tr>"""


# ---------------------------------------------------------------------------
# Welcome email
# ---------------------------------------------------------------------------

def build_welcome_email(display_name: str | None) -> tuple[str, str, str]:
    """Return (subject, html, text) for the signup welcome email."""
    name = _first_name(display_name)
    greeting = f"Welcome, {name}!" if name else "Welcome to Spend Jot!"
    app_url = _app_url()
    subject = "Welcome to Spend Jot 🎉"
    preheader = "You're all set — start jotting expenses in seconds."

    text = (
        f"{greeting}\n\n"
        "You're all set. Here's what you can do with Spend Jot:\n\n"
        "• Jot in seconds — add an expense faster than you can find your wallet.\n"
        "• See where your money goes — clean charts and a monthly breakdown.\n"
        "• Stay on budget — set a budget and see what's safe to spend.\n\n"
        f"Open Spend Jot: {app_url}\n\n"
        "— The Spend Jot team\n"
        "You're receiving this because you just created a Spend Jot account."
    )

    content = f"""\
                <tr>
                  <td class="sj-pad" style="padding:36px 34px 4px;">
                    <h1 class="sj-h1" style="margin:0 0 8px;font-family:{_FONT_HEAD};font-size:22px;font-weight:700;color:{_INK};line-height:1.25;">{greeting}</h1>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:{_MUTED};">
                      You're all set. Here's what you can do with Spend Jot:
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="sj-pad" style="padding:16px 34px 4px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
{_feature("⚡", "Jot in seconds", "Add an expense faster than you can find your wallet.")}
{_feature("📊", "See where your money goes", "Clean charts and a clear monthly breakdown.")}
{_feature("🎯", "Stay on budget", "Set a budget and always know what's safe to spend.")}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" class="sj-pad" style="padding:28px 34px 38px;">
{_button(app_url, "Open Spend Jot")}
                  </td>
                </tr>"""

    html = _shell(
        title=subject,
        preheader=preheader,
        content=content,
        footer_note="You're receiving this because you just created a Spend Jot account.",
    )
    return subject, html, text


async def send_welcome_email(to_email: str, display_name: str | None) -> None:
    subject, html, text = build_welcome_email(display_name)
    await send_email(to=to_email, subject=subject, html=html, text=text)


# ---------------------------------------------------------------------------
# Weekly recap email
# ---------------------------------------------------------------------------

def _pkr(amount: Decimal | int | float | None) -> str:
    """Whole-rupee PKR, e.g. 'Rs 12,500'."""
    if amount is None:
        return "—"
    return f"Rs {int(Decimal(str(amount))):,}"


def _first_name(display_name: str | None) -> str:
    return (display_name or "").strip().split(" ")[0] if display_name else ""


def _stat_row(label: str, value: str, *, last: bool = False) -> str:
    border = "" if last else f"border-bottom:1px solid {_LINE};"
    return f"""\
                      <tr>
                        <td style="padding:13px 0;font-size:14px;color:{_MUTED};{border}">{label}</td>
                        <td align="right" style="padding:13px 0;font-size:14px;font-weight:600;color:{_INK};{border}">{value}</td>
                      </tr>"""


def build_weekly_recap_email(display_name: str | None, stats: "WeeklyStats") -> tuple[str, str, str]:
    """Return (subject, html, text) for the weekly spending recap."""
    name = _first_name(display_name)
    greeting = f"Here's your week, {name}" if name else "Here's your week"
    app_url = _app_url()
    subject = "Your week on Spend Jot 📊"

    week_word = "expense" if stats.week_count == 1 else "expenses"
    preheader = f"You spent {_pkr(stats.week_total)} across {stats.week_count} {week_word} this week."
    if stats.top_category:
        preheader += f" Top: {stats.top_category}."

    has_budget = stats.month_budget is not None
    pct = int(round((stats.month_pct or 0) * 100))
    bar_pct = max(0, min(100, pct))
    bar_color = "#ef4444" if bar_pct >= 100 else "#f59e0b" if bar_pct >= 75 else "#10b981"

    # --- plain text ---
    lines = [
        greeting + "!",
        "",
        f"This week you spent {_pkr(stats.week_total)} across {stats.week_count} "
        f"{week_word}.",
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

    # --- stat rows (spend is shown big in the hero, so rows carry the rest) ---
    has_top = bool(stats.top_category)
    rows = _stat_row("Expenses logged", str(stats.week_count), last=not has_top)
    if has_top:
        rows += _stat_row("Top category", f"{stats.top_category} · {_pkr(stats.top_category_amount)}", last=True)

    # --- optional monthly budget block ---
    budget_block = ""
    if has_budget:
        safe_line = ""
        if stats.safe_per_day is not None and (stats.month_remaining or 0) > 0:
            safe_line = (
                f'<p style="margin:10px 0 0;font-size:13px;color:{_MUTED};">'
                f'Safe to spend <strong style="color:{_INK};">{_pkr(stats.safe_per_day)}/day</strong> '
                f'for {stats.days_left} {"day" if stats.days_left == 1 else "days"}.</p>'
            )
        budget_block = f"""\
                <tr>
                  <td class="sj-pad" style="padding:6px 34px 4px;">
                    <div style="background:{_MIST};border:1px solid {_LINE};border-radius:16px;padding:18px 20px;">
                      <div style="font-size:13px;color:{_MUTED};margin-bottom:8px;">
                        {stats.month_label} budget · <strong style="color:{_INK};">{_pkr(stats.month_spent)}</strong> of {_pkr(stats.month_budget)} ({pct}%)
                      </div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                             style="border-radius:999px;overflow:hidden;background:#ECE9F6;">
                        <tr>
                          <td width="{bar_pct}%" style="background:{bar_color};height:9px;font-size:0;line-height:0;">&nbsp;</td>
                          <td style="height:9px;font-size:0;line-height:0;">&nbsp;</td>
                        </tr>
                      </table>
                      <p style="margin:10px 0 0;font-size:13px;color:{_MUTED};">
                        <strong style="color:{_INK};">{_pkr(stats.month_remaining)}</strong> left this month.
                      </p>
                      {safe_line}
                    </div>
                  </td>
                </tr>"""

    content = f"""\
                <tr>
                  <td class="sj-pad" style="padding:34px 34px 2px;">
                    <h1 class="sj-h1" style="margin:0 0 4px;font-family:{_FONT_HEAD};font-size:22px;font-weight:700;color:{_INK};line-height:1.25;">{greeting}</h1>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:{_MUTED};">Here's how your week looked.</p>
                  </td>
                </tr>
                <tr>
                  <td class="sj-pad" style="padding:16px 34px 2px;">
                    <div style="background:{_MIST};border:1px solid {_LINE};border-radius:18px;padding:22px 24px;text-align:center;">
                      <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:{_MUTED};">Spent this week</div>
                      <div class="sj-hero" style="font-family:{_FONT_HEAD};font-size:40px;font-weight:700;color:{_INK};line-height:1.1;margin:6px 0 2px;">{_pkr(stats.week_total)}</div>
                      <div style="font-size:13px;color:{_MUTED};">across {stats.week_count} {week_word}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="sj-pad" style="padding:6px 34px 2px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
{rows}
                    </table>
                  </td>
                </tr>
{budget_block}
                <tr>
                  <td align="center" class="sj-pad" style="padding:26px 34px 38px;">
{_button(app_url, "Open Spend Jot")}
                  </td>
                </tr>"""

    html = _shell(
        title=subject,
        preheader=preheader,
        content=content,
        footer_note="You're receiving your weekly Spend Jot recap.",
    )
    return subject, html, text


async def send_weekly_recap_email(
    to_email: str, display_name: str | None, stats: "WeeklyStats"
) -> bool:
    subject, html, text = build_weekly_recap_email(display_name, stats)
    return await send_email(to=to_email, subject=subject, html=html, text=text)


# ---------------------------------------------------------------------------
# PIN reset email
# ---------------------------------------------------------------------------

def build_pin_reset_email(
    display_name: str | None, code: str, minutes: int
) -> tuple[str, str, str]:
    """Return (subject, html, text) for the forgot-PIN one-time code."""
    name = _first_name(display_name)
    greeting = f"Hi {name}," if name else "Hi,"
    app_url = _app_url()
    subject = "Your Spend Jot PIN reset code"
    preheader = f"Use this code to reset your PIN. It expires in {minutes} minutes."

    text = (
        f"{greeting}\n\n"
        f"Your Spend Jot PIN reset code is: {code}\n\n"
        f"It expires in {minutes} minutes. Enter it in the app to set a new PIN.\n\n"
        "If you didn't request this, you can safely ignore this email — your PIN "
        "won't change.\n\n"
        "— The Spend Jot team"
    )

    # Space the digits out so the code is easy to read and transcribe.
    spaced_code = " ".join(list(code))

    content = f"""\
                <tr>
                  <td class="sj-pad" style="padding:36px 34px 2px;">
                    <h1 class="sj-h1" style="margin:0 0 8px;font-family:{_FONT_HEAD};font-size:22px;font-weight:700;color:{_INK};line-height:1.25;">Reset your PIN</h1>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:{_MUTED};">
                      {greeting} enter this code in the app to set a new PIN.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="sj-pad" style="padding:18px 34px 2px;">
                    <div style="background:{_MIST};border:1px solid {_LINE};border-radius:16px;padding:22px 16px;text-align:center;">
                      <div style="font-family:{_FONT_HEAD};font-size:34px;font-weight:700;letter-spacing:8px;color:{_INK};line-height:1.1;">{spaced_code}</div>
                    </div>
                    <div style="text-align:center;margin-top:14px;">
                      <span style="display:inline-block;background:{_MIST};border:1px solid {_LINE};border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;color:{_VIOLET};">
                        ⏱ Expires in {minutes} minutes
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="sj-pad" style="padding:20px 34px 34px;">
                    <p style="margin:0;font-size:13px;line-height:1.6;color:{_MUTED};text-align:center;">
                      Didn't request this? You can safely ignore this email — your PIN won't change.
                    </p>
                  </td>
                </tr>"""

    html = _shell(
        title=subject,
        preheader=preheader,
        content=content,
        footer_note="For your security, never share this code with anyone.",
    )
    return subject, html, text


async def send_pin_reset_email(to_email: str, display_name: str | None, code: str) -> bool:
    subject, html, text = build_pin_reset_email(
        display_name, code, settings.otp_expire_minutes
    )
    return await send_email(to=to_email, subject=subject, html=html, text=text)
