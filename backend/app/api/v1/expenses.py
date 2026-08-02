from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.core.timeutils import as_utc, now_utc
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseListOut,
    ExpenseOut,
    ExpenseUpdate,
    ParsedExpenseOut,
    ParseRequest,
)
from app.services import expense_service, export_service, parse_service

router = APIRouter(prefix="/expenses", tags=["expenses"])

_EXPORT_MEDIA = {
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


@router.get("", response_model=ExpenseListOut)
async def list_expenses(
    db: DbSession,
    current_user: CurrentUser,
    start: datetime | None = Query(default=None, description="Filter: spent on/after"),
    end: datetime | None = Query(default=None, description="Filter: spent on/before"),
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ExpenseListOut:
    items, total, total_amount = await expense_service.list_expenses(
        db,
        current_user,
        start=as_utc(start) if start else None,
        end=as_utc(end) if end else None,
        category_id=category_id,
        search=search,
        page=page,
        page_size=page_size,
    )
    return ExpenseListOut(
        items=[ExpenseOut.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_amount=total_amount,
    )


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate, db: DbSession, current_user: CurrentUser
) -> ExpenseOut:
    expense = await expense_service.create_expense(db, current_user, payload)
    return ExpenseOut.model_validate(expense)


@router.post("/parse", response_model=ParsedExpenseOut)
async def parse_expense(
    payload: ParseRequest, db: DbSession, current_user: CurrentUser
) -> ParsedExpenseOut:
    draft = await parse_service.parse_expense(db, payload.text)
    return ParsedExpenseOut(
        name=draft.name,
        amount=draft.amount,
        category_id=draft.category_id,
        category_name=draft.category_name,
        spent_at=draft.spent_at,
    )


@router.get("/export")
async def export_expenses(
    db: DbSession,
    current_user: CurrentUser,
    format: str = Query(default="xlsx", pattern="^(xlsx|pdf)$"),
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
) -> Response:
    items, total = await expense_service.export_expenses(
        db,
        current_user,
        start=as_utc(start) if start else None,
        end=as_utc(end) if end else None,
        category_id=category_id,
        search=search,
    )
    stamp = now_utc().strftime("%Y%m%d")
    if format == "xlsx":
        content = export_service.build_xlsx(items, total)
    else:
        subtitle = (
            f"{len(items)} {'expense' if len(items) == 1 else 'expenses'} · "
            f"Total ₨ {int(total):,} · Generated {now_utc().strftime('%d %b %Y')}"
        )
        content = export_service.build_pdf(items, total, subtitle)

    return Response(
        content=content,
        media_type=_EXPORT_MEDIA[format],
        headers={
            "Content-Disposition": f'attachment; filename="spendjot-expenses-{stamp}.{format}"'
        },
    )


@router.patch("/{expense_id}", response_model=ExpenseOut)
async def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ExpenseOut:
    expense = await expense_service.update_expense(db, current_user, expense_id, payload)
    return ExpenseOut.model_validate(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> Response:
    await expense_service.delete_expense(db, current_user, expense_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
