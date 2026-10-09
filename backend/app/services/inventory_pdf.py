"""PDF rendering for inventory tracking sheets."""

from __future__ import annotations

from html import escape
from io import BytesIO
from typing import Literal

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.house import House
from app.schemas.inventory_form import InventoryFormCreate


Language = Literal["pt", "en"]

CATEGORY_LABELS = {
    "pt": {
        "bed_linen": "1. Têxteis de cama (quartos)",
        "bath_linen": "2. Têxteis de banho",
        "kitchen_cleaning": "3. Têxteis de cozinha e limpeza",
        "decorative_textiles": "4. Decoração, acessórios e têxteis decorativos",
    },
    "en": {
        "bed_linen": "1. Bed linen (bedrooms)",
        "bath_linen": "2. Bath linen",
        "kitchen_cleaning": "3. Kitchen and cleaning textiles",
        "decorative_textiles": "4. Decor, accessories and decorative textiles",
    },
}

COPY = {
    "pt": {
        "title": "Ficha de rastreio de inventário",
        "date": "Data da contagem",
        "operation": "Tipo de operação",
        "room": "Quarto / divisão",
        "responsible": "Responsável",
        "all_rooms": "Todas as divisões",
        "inventory": "Contagem de inventário",
        "operations": {"check_in": "Check-in", "check_out": "Check-out", "laundry": "Lavandaria"},
        "columns": ["Descrição", "Stock total", "Na casa", "Saída", "Entrada", "Estado / observações"],
        "notice": "Atenção: registar peças em falta, danificadas ou manchadas e comunicar imediatamente diferenças entre a saída e o retorno da lavandaria.",
        "counted": "Contagem feita por",
        "signature": "Assinatura do responsável",
        "checked": "Conferido por",
        "page": "Página",
    },
    "en": {
        "title": "Inventory tracking sheet",
        "date": "Count date",
        "operation": "Operation type",
        "room": "Room / area",
        "responsible": "Person responsible",
        "all_rooms": "All rooms",
        "inventory": "Inventory count",
        "operations": {"check_in": "Check-in", "check_out": "Check-out", "laundry": "Laundry"},
        "columns": ["Description", "Total stock", "In house", "Sent out", "Returned", "Condition / notes"],
        "notice": "Notice: record missing, damaged, or stained items and immediately report differences between laundry items sent and returned.",
        "counted": "Counted by",
        "signature": "Responsible person's signature",
        "checked": "Checked by",
        "page": "Page",
    },
}


def _text(value: object) -> str:
    if value is None or value == "":
        return "-"
    return escape(str(value))


def build_inventory_pdf(house: House, form_data: InventoryFormCreate, language: Language) -> bytes:
    """Return a polished, printable PDF for one tracking sheet."""
    copy = COPY[language]
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=f"{copy['title']} - {house.name}",
        author="Madeira Cleaning & Care",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "PdfTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#172033"),
        spaceAfter=3 * mm,
    )
    house_style = ParagraphStyle(
        "HouseName",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#244488"),
        spaceAfter=1 * mm,
    )
    small_style = ParagraphStyle("Small", parent=styles["BodyText"], fontSize=7.5, leading=9.5)
    meta_label_style = ParagraphStyle("MetaLabel", parent=small_style, fontName="Helvetica-Bold", textColor=colors.HexColor("#475569"))
    meta_value_style = ParagraphStyle("MetaValue", parent=small_style, fontSize=8.5, leading=10.5)
    category_style = ParagraphStyle(
        "Category",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#244488"),
        spaceBefore=3 * mm,
        spaceAfter=1.5 * mm,
    )
    header_style = ParagraphStyle("TableHeader", parent=small_style, fontName="Helvetica-Bold", alignment=TA_CENTER, textColor=colors.HexColor("#334155"))
    notice_style = ParagraphStyle("Notice", parent=small_style, textColor=colors.HexColor("#991B1B"), leading=10)

    operations = ", ".join(copy["operations"][operation] for operation in form_data.operation_types) or copy["inventory"]
    story = [
        Paragraph(copy["title"], title_style),
        Paragraph(_text(house.name), house_style),
        Paragraph(_text(house.address), meta_value_style),
        Spacer(1, 3 * mm),
    ]

    meta_data = [
        [Paragraph(copy["date"], meta_label_style), Paragraph(copy["operation"], meta_label_style), Paragraph(copy["room"], meta_label_style), Paragraph(copy["responsible"], meta_label_style)],
        [Paragraph(_text(form_data.count_date.strftime("%d/%m/%Y")), meta_value_style), Paragraph(_text(operations), meta_value_style), Paragraph(_text(form_data.room_division or copy["all_rooms"]), meta_value_style), Paragraph(_text(form_data.responsible), meta_value_style)],
    ]
    meta_table = Table(meta_data, colWidths=[48 * mm, 68 * mm, 68 * mm, 68 * mm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([meta_table, Spacer(1, 2 * mm)])

    for category, category_label in CATEGORY_LABELS[language].items():
        category_lines = [line for line in form_data.lines if line.category == category]
        if not category_lines:
            continue
        rows = [[Paragraph(label, header_style) for label in copy["columns"]]]
        for line in category_lines:
            rows.append([
                Paragraph(_text(line.description), small_style),
                Paragraph(_text(line.stock_total), small_style),
                Paragraph(_text(line.current_quantity), small_style),
                Paragraph(_text(line.outgoing_laundry), small_style),
                Paragraph(_text(line.incoming_clean), small_style),
                Paragraph(_text(line.status_observations), small_style),
            ])
        table = Table(rows, colWidths=[60 * mm, 22 * mm, 22 * mm, 22 * mm, 22 * mm, 104 * mm], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E0E7FF")),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 1), (4, -1), "CENTER"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ]))
        story.append(KeepTogether([Paragraph(category_label, category_style), table]))

    validation = Table([
        [Paragraph(copy["counted"], meta_label_style), Paragraph(copy["signature"], meta_label_style), Paragraph(copy["checked"], meta_label_style)],
        [Paragraph(_text(form_data.counter_name), meta_value_style), Paragraph(_text(form_data.responsible_signature), meta_value_style), Paragraph(_text(form_data.checked_by), meta_value_style)],
    ], colWidths=[84 * mm, 84 * mm, 84 * mm])
    validation.setStyle(TableStyle([
        ("LINEBELOW", (0, 1), (-1, 1), 0.6, colors.HexColor("#64748B")),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([Spacer(1, 4 * mm), Paragraph(copy["notice"], notice_style), Spacer(1, 4 * mm), validation])

    def add_page_number(canvas, doc) -> None:  # type: ignore[no-untyped-def]
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawRightString(landscape(A4)[0] - 12 * mm, 7 * mm, f"{copy['page']} {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    return buffer.getvalue()
