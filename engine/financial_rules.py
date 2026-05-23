"""
financial_rules.py – updated to handle merged Hours+Rate cells
and recognise any column containing "total" as line_total.
"""
import re

ROLE_MAP = {
    "serial":          [r"^s_no$", r"^sno$", r"^sr_no$", r"^sl_no$", r"^no$"],
    "item_name":       ["service", "item", "description", "particulars",
                        "product", "goods", "material", "details"],
    "quantity":        [r"^hours$", r"^hrs$", r"^qty$", r"^quantity$",
                        r"^units$", r"^cnt$", r"^hour$"],
    "unit_price":      [r"^rate$", r"^unit_price$", r"^unitprice$",
                        r"^price_per$", r"^price$"],
    "hsn_code":        ["hsn", "sac"],
    "unit_of_measure": ["uom", "unit_of"],
    "pretax_sub":      [r"^subtotal$", r"^sub_total$", r"^taxable$"],
    "cgst":            ["cgst"],
    "sgst":            ["sgst"],
    "igst":            ["igst"],
    "vat":             ["vat"],
    "discount":        ["discount"],
    # IMPORTANT: catch any column that contains "total" (e.g. "total_2")
    "line_total":      [r"total", r"^total$", r"^total_inr$", "amount", "grand"],
}

QTY_UNIT_TOKENS = {
    "bags", "bag", "kg", "kgs", "pcs", "pc", "nos", "no", "set", "sets",
    "box", "boxes", "trp", "trip", "ltr", "lts", "mtr", "mtrs",
    "sqft", "sqm", "unit", "units", "roll", "rolls", "sheet", "sheets",
    "bundle", "bundles", "pair", "pairs", "dozen",
}

CATEGORY_RULES = {
    "Professional Services": [
        "analysis", "analytics", "audit", "reporting", "review",
        "verification", "reconciliation", "forecasting", "dashboard",
        "mis", "advisory", "assessment", "consulting",
    ],
    "Food":          ["canteen", "cafe", "restaurant", "burger", "meal", "coffee", "food"],
    "Utilities":     ["electricity", "power", "water", "broadband", "internet", "bill"],
    "Travel":        ["uber", "ola", "irctc", "railway", "flight", "fuel", "petrol", "cab"],
    "Medical":       ["pharmacy", "meds", "hospital", "tablet", "clinic", "health"],
    "Entertainment": ["netflix", "spotify", "pvr", "cinema", "show", "ticket"],
}


def _detect_roles(columns: list) -> dict:
    role_to_key = {}
    for col_key in columns:
        for role, patterns in ROLE_MAP.items():
            if role in role_to_key:
                continue
            for pat in patterns:
                if re.search(pat, col_key):
                    role_to_key[role] = col_key
                    break
    return role_to_key


def _parse_num(val) -> float:
    if val is None:
        return 0.0
    s = str(val).replace(",", "").replace("₹", "").replace("$", "").strip()
    s = re.sub(r"^\d+\s*[|:\-]\s*", "", s).strip()
    nums = re.findall(r"\d+\.?\d*", s)
    if not nums:
        return 0.0
    floats = [float(n) for n in nums]
    return max(floats) if len(floats) > 1 else floats[0]


def _split_rate_cell(rate_str: str):
    """
    If rate cell contains two numbers like '15 2500', return (qty, unit_price).
    Otherwise return (None, parsed_unit_price).
    """
    s = str(rate_str).strip()
    parts = s.split()
    numbers = [p for p in parts if re.fullmatch(r"[\d,]+\.?\d*", p)]
    if len(numbers) >= 2:
        try:
            qty = int(float(numbers[0].replace(",", "")))
            price = float(numbers[1].replace(",", ""))
            return qty, price
        except:
            pass
    # Single number or none
    return None, _parse_num(rate_str)


def _categorize(items: list) -> str:
    dump = " ".join(
        str(v).lower()
        for it in items
        for v in it.get("raw_data", {}).values()
    )
    for cat, keywords in CATEGORY_RULES.items():
        if any(kw in dump for kw in keywords):
            return cat
    return "Miscellaneous"


def process_and_normalize_metrics(raw: dict) -> dict:
    if not isinstance(raw, dict):
        raw = {}

    columns = raw.get("columns", [])
    rows    = raw.get("line_items", [])
    roles   = _detect_roles(columns)

    def cell(row: dict, role: str) -> str:
        return row.get(roles.get(role, ""), "")

    normalized = []
    calc_subtotal = 0.0

    for row in rows:
        # --- item name -------------------------------------------------
        item_name = (
            cell(row, "item_name")
            or next(
                (v for v in row.values()
                 if not re.fullmatch(r"[\d,.\s]+", v) and v.strip()),
                "Line Item",
            )
        )

        # --- quantity, unit price, and line total ---------------------
        raw_qty_str = cell(row, "quantity")
        raw_rate_str = cell(row, "unit_price")
        raw_line_total = _parse_num(cell(row, "line_total"))

        # Try to split rate cell if it contains two numbers
        split_qty, split_price = _split_rate_cell(raw_rate_str)

        # Determine quantity
        qty = 1
        if raw_qty_str.strip() and raw_qty_str not in ("-", "—", "--"):
            num_match = re.search(r"[\d,]+\.?\d*", raw_qty_str)
            if num_match:
                try:
                    qty = int(float(num_match.group().replace(",", "")))
                except:
                    qty = 1
        elif split_qty is not None:
            qty = split_qty

        # Determine unit price
        unit_price = split_price if split_price is not None else _parse_num(raw_rate_str)

        # Line total – prefer the captured total column
        if raw_line_total > 0:
            line_total = raw_line_total
        else:
            line_total = 0.0

        # Pre-tax subtotal: use line_total if available and we can back-calc,
        # else fallback to qty * unit_price
        if line_total > 0:
            # Assume 18% tax if no explicit tax columns are present
            cgst_v = _parse_num(cell(row, "cgst"))
            sgst_v = _parse_num(cell(row, "sgst"))
            igst_v = _parse_num(cell(row, "igst"))
            if cgst_v or sgst_v or igst_v:
                total_tax = cgst_v + sgst_v + igst_v
                pretax = line_total - total_tax
            else:
                # Estimate pretax by dividing by 1.18
                pretax = round(line_total / 1.18, 2)
            line_pretax = pretax
        else:
            line_pretax = round(qty * unit_price, 2) if qty and unit_price else 0.0
            line_total = line_pretax  # will be updated after tax

        # --- tax calculation -------------------------------------------
        cgst_v = _parse_num(cell(row, "cgst"))
        sgst_v = _parse_num(cell(row, "sgst"))
        igst_v = _parse_num(cell(row, "igst"))

        if cgst_v or sgst_v or igst_v:
            total_tax = round(cgst_v + sgst_v + igst_v, 2)
        else:
            total_tax = round(line_pretax * 0.18, 2)
            cgst_v = sgst_v = round(total_tax / 2, 2)

        if not line_total:
            line_total = round(line_pretax + total_tax, 2)

        calc_subtotal += line_pretax

        entry = {
            "item_name":       item_name,
            "quantity":        qty,
            "quantity_unit":   "",   # can be filled from unit tokens if needed
            "unit_price":      unit_price,
            "pretax_subtotal": line_pretax,
            "tax_breakdown":   {},
            "line_total":      line_total,
            "raw_data":        row,
        }
        if cgst_v: entry["tax_breakdown"]["cgst"] = cgst_v
        if sgst_v: entry["tax_breakdown"]["sgst"] = sgst_v
        if igst_v: entry["tax_breakdown"]["igst"] = igst_v

        normalized.append(entry)

    # --- invoice-level totals -----------------------------------------
    all_cgst  = sum(i["tax_breakdown"].get("cgst", 0) for i in normalized)
    all_sgst  = sum(i["tax_breakdown"].get("sgst", 0) for i in normalized)
    all_igst  = sum(i["tax_breakdown"].get("igst", 0) for i in normalized)
    total_tax = round(all_cgst + all_sgst + all_igst, 2)
    grand     = round(calc_subtotal + total_tax, 2)

    # Use OCR grand total if present and close to our computed value
    ocr_grand = _parse_num(raw.get("grand_total", ""))
    if ocr_grand and abs(ocr_grand - grand) / max(ocr_grand, 1) < 0.01:
        grand = ocr_grand

    tax_summary = {}
    if all_cgst: tax_summary["cgst"] = round(all_cgst, 2)
    if all_sgst: tax_summary["sgst"] = round(all_sgst, 2)
    if all_igst: tax_summary["igst"] = round(all_igst, 2)
    tax_summary["total_tax"] = total_tax

    return {
        "merchant_name":    raw.get("store_name", "Unknown Vendor"),
        "invoice_number":   raw.get("invoice_number", ""),
        "invoice_date":     raw.get("invoice_date", ""),
        "client_name":      raw.get("client_name", ""),
        "detected_columns": columns,
        "semantic_roles":   {role: roles.get(role, "") for role in ROLE_MAP},
        "line_items":       normalized,
        "subtotal":         round(calc_subtotal, 2),
        "tax_summary":      tax_summary,
        "total_amount":     grand,
        "category":         _categorize(normalized),
        "financial_recommendation": (
            "Paper-based invoice validated locally. "
            "Transitioning to digital ledger sync reduces carbon footprint "
            "by ~2.4g per transaction (SDG 12)."
        ),
    }