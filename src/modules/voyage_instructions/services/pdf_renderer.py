"""PDF renderer for voyage instructions using fpdf2.

Converts a VoyageInstruction (with HTML body) to a real, downloadable PDF.
fpdf2's HTML2FPDF handles basic formatting (headings, paragraphs, lists,
bold, italic). The title and metadata are placed in a header section.
"""
from __future__ import annotations

import re
from datetime import datetime
from io import BytesIO

from fpdf import FPDF, HTMLMixin  # type: ignore[attr-defined]
from fpdf.enums import XPos, YPos  # type: ignore[attr-defined]


class _InstructionPDF(FPDF, HTMLMixin):  # type: ignore[misc]
    def __init__(self, title: str, meta: str) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self._doc_title = title
        self._doc_meta = meta
        self.set_margins(20, 20, 20)
        self.set_auto_page_break(auto=True, margin=15)

    def header(self) -> None:
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 10, self._doc_title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, self._doc_meta, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(0, 0, 0)
        self.ln(4)
        self.set_draw_color(180, 180, 180)
        self.set_line_width(0.3)
        self.line(20, self.get_y(), 190, self.get_y())
        self.ln(4)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(130, 130, 130)
        self.cell(0, 6, f"Page {self.page_no()}", align="C")


def _html_to_plain(html: str) -> str:
    """Strip HTML tags — fallback for any content fpdf2 HTML can't handle."""
    return re.sub(r"<[^>]+>", " ", html).strip()


def render_instruction_pdf(
    title: str,
    body_html: str,
    approved_at: datetime | None = None,
    sent_at: datetime | None = None,
) -> bytes:
    """Return PDF bytes for a voyage instruction."""
    meta_parts: list[str] = []
    if approved_at:
        meta_parts.append(f"Approved: {approved_at.strftime('%d %b %Y %H:%M UTC')}")
    if sent_at:
        meta_parts.append(f"Sent: {sent_at.strftime('%d %b %Y %H:%M UTC')}")
    meta = "  |  ".join(meta_parts) if meta_parts else "DRAFT"

    pdf = _InstructionPDF(title=title, meta=meta)
    pdf.compress = False  # keep streams uncompressed so content is searchable/testable
    pdf.add_page()
    pdf.set_font("Helvetica", "", 11)

    try:
        pdf.write_html(body_html)
    except Exception:
        # If HTML rendering fails, fall back to plain text
        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(0, 6, _html_to_plain(body_html))

    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()
