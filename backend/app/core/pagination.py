from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


def normalize_pagination(page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> tuple[int, int, int]:
    page = max(1, page)
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    offset = (page - 1) * page_size
    return page, page_size, offset


def build_paginated(items: list[T], total: int, page: int, page_size: int) -> PaginatedResponse[T]:
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
