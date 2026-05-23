import re
import numpy as np

try:
    import easyocr
except ImportError:
    raise RuntimeError("pip install easyocr")


class CustomDocumentIntelligenceModel:
    """
    Fully local invoice extraction pipeline (optimised for dense tables).

    Stage 1 — EasyOCR reads all text blocks with bounding boxes.
    Stage 2 — Rows are clustered by Y position.
    Stage 3 — Table header is detected by keyword matching + fallback.
    Stage 4 — Column boundaries are derived from header block edges,
               then refined using data row centres (without changing column roles).
    Stage 5 — Each data row's blocks are sorted left‑to‑right by X centre,
               then assigned to columns based on positional index.
    Stage 6 — Numeric fragments are merged before assignment.
    Stage 7 — Grand total extracted from tail rows even without keyword.
    Stage 8 — S.No bleed into service column is corrected.
    """

    def __init__(self):
        print("Loading EasyOCR (CRAFT + CRNN) onto local hardware…")
        gpu = self._gpu_available()
        self.device = "gpu" if gpu else "cpu"
        self.reader = easyocr.Reader(["en"], gpu=gpu, verbose=False)
        print(f"EasyOCR ready on [{self.device}]")

    # ── public ─────────────────────────────────────────────────────────────────

    def analyze_invoice_image(self, image_path: str) -> dict:
        raw = self.reader.readtext(image_path, detail=1)
        blocks = [self._to_block(bb, t, c) for bb, t, c in raw if c > 0.25]
        blocks.sort(key=lambda b: b["y"])

        rows = self._cluster_rows(blocks)
        result = self._build_invoice_dict(rows)

        print(f"DEBUG store_name : {result.get('store_name')}")
        print(f"DEBUG columns    : {result.get('columns')}")
        print(f"DEBUG line_items : {len(result.get('line_items', []))}")
        return result

    # ── geometry helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _gpu_available() -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    @staticmethod
    def _to_block(bbox, text: str, conf: float) -> dict:
        xs = [p[0] for p in bbox]
        ys = [p[1] for p in bbox]
        return {
            "x":     (min(xs) + max(xs)) / 2,
            "y":     (min(ys) + max(ys)) / 2,
            "x_min": min(xs),
            "x_max": max(xs),
            "h":     max(ys) - min(ys),
            "text":  text.strip(),
            "conf":  conf,
        }

    def _cluster_rows(self, blocks: list, factor: float = 0.65) -> list:
        """Group blocks into rows using median block height as Y tolerance."""
        if not blocks:
            return []
        heights = [b["h"] for b in blocks if b["h"] > 2]
        tol = float(np.median(heights)) * factor if heights else 12.0

        rows, cur_row, cur_y = [], [blocks[0]], blocks[0]["y"]
        for b in blocks[1:]:
            if abs(b["y"] - cur_y) <= tol:
                cur_row.append(b)
            else:
                rows.append(sorted(cur_row, key=lambda x: x["x"]))
                cur_row, cur_y = [b], b["y"]
        rows.append(sorted(cur_row, key=lambda x: x["x"]))
        return rows

    # ── column boundary detection (header + data refinement) ───────────────────

    TABLE_KEYWORDS = {
        "service", "item", "description", "hours", "rate",
        "subtotal", "cgst", "sgst", "total", "qty", "quantity",
        "amount", "price", "tax", "discount", "unit", "sno", "s.no",
        "sr", "sl", "no",
    }

    def _find_table_header(self, rows: list) -> tuple:
        """Return (row_index, col_boundaries) using keyword match or fallback."""
        # First try keyword matching
        for i, row in enumerate(rows):
            hits = sum(
                1 for b in row
                if any(kw in b["text"].lower() for kw in self.TABLE_KEYWORDS)
            )
            if hits >= 2:
                return i, self._build_col_boundaries(row)
        # Fallback: look for a row with 3+ blocks and at least one word per block
        for i, row in enumerate(rows):
            if len(row) >= 3 and all(len(b["text"].split()) >= 1 for b in row):
                return i, self._build_col_boundaries(row)
        return None, []

    def _build_col_boundaries(self, header_row: list) -> list:
        """
        Build column boundary dicts from header block edges.
        Boundary between column i and i+1 = midpoint of right-edge of col i
        and left-edge of col i+1.
        """
        cols = sorted(header_row, key=lambda b: b["x"])
        result = []
        for i, b in enumerate(cols):
            raw_name  = b["text"].strip()
            norm_name = self._normalize_col_name(raw_name)
            if i > 0:
                x_left = (cols[i - 1]["x_max"] + b["x_min"]) / 2
            else:
                x_left = 0.0
            if i < len(cols) - 1:
                x_right = (b["x_max"] + cols[i + 1]["x_min"]) / 2
            else:
                x_right = float("inf")
            result.append({
                "raw":     raw_name,
                "key":     norm_name,
                "x":       b["x"],
                "x_left":  x_left,
                "x_right": x_right,
            })
        return result

    def _refine_boundaries_with_data(self, col_bounds: list, data_rows: list) -> list:
        """
        Adjust x_right for each column using actual data block centres.
        Preserves column keys and semantics; only refines boundaries.
        """
        if not data_rows:
            return col_bounds
        col_centres = {i: [] for i in range(len(col_bounds))}
        for row in data_rows:
            for block in row:
                x = block["x"]
                for idx, col in enumerate(col_bounds):
                    if col["x_left"] <= x < col["x_right"]:
                        col_centres[idx].append(x)
                        break
        new_bounds = []
        for i, col in enumerate(col_bounds):
            if i < len(col_bounds) - 1:
                left_median = np.median(col_centres[i]) if col_centres[i] else col["x"]
                right_median = np.median(col_centres[i+1]) if col_centres[i+1] else col_bounds[i+1]["x"]
                x_right = (left_median + right_median) / 2
            else:
                x_right = float("inf")
            new_bounds.append({
                **col,
                "x_right": x_right,
            })
        return new_bounds

    @staticmethod
    def _normalize_col_name(text: str) -> str:
        """'Rate (₹)' → 'rate'  |  'CGST 9%' → 'cgst_9'  |  'S.No' → 's_no'"""
        s = text.lower()
        s = re.sub(r"[₹$€£%().]", "", s)
        s = re.sub(r"[^a-z0-9\s]", " ", s)
        s = re.sub(r"\s+", "_", s.strip())
        s = re.sub(r"_+", "_", s).strip("_")
        return s or "col"

    # ── row pre-processing: merge split numeric fragments ──────────────────────

    @staticmethod
    def _merge_numeric_fragments(blocks: list) -> list:
        """
        Merge consecutive all‑digit blocks that are very close horizontally.
        """
        if not blocks:
            return blocks
        merged = [blocks[0].copy()]
        for b in blocks[1:]:
            prev = merged[-1]
            gap  = b["x_min"] - prev["x_max"]
            both_numeric = (
                re.fullmatch(r"[\d,]+", prev["text"]) and
                re.fullmatch(r"[\d,]+", b["text"])
            )
            if both_numeric and gap < 12:
                merged[-1] = {
                    **prev,
                    "text":  prev["text"] + b["text"],
                    "x_max": b["x_max"],
                    "x":     (prev["x_min"] + b["x_max"]) / 2,
                }
            else:
                merged.append(b.copy())
        return merged

    # ── cell assignment: rank-based (immune to pixel drift) ───────────────────

    def _assign_cells(self, row: list, col_bounds: list) -> dict:
        """
        Assign each block in a data row to a column.
        Pass 1: pixel‑range assignment.
        Pass 2: if unmapped, assign to nearest column centre.
        """
        row = self._merge_numeric_fragments(row)
        item: dict = {}

        for block in row:
            x = block["x"]
            matched = None
            for col in col_bounds:
                if col["x_left"] <= x < col["x_right"]:
                    matched = col["key"]
                    break
            if matched is None:
                matched = min(col_bounds, key=lambda c: abs(c["x"] - x))["key"]

            prev = item.get(matched, "")
            item[matched] = (prev + " " + block["text"]).strip() if prev else block["text"]

        return item

    # ── item-name cleaner (including S.No bleed removal) ──────────────────────

    @staticmethod
    def _clean_item_name(name: str) -> str:
        """Strip leading S.No bleed: '3 |Invoice Verification' → 'Invoice Verification'"""
        cleaned = re.sub(r"^\d+\s*[|:\-]\s*", "", name).strip()
        cleaned = re.sub(r"\s{2,}", " ", cleaned)
        return cleaned if cleaned else name

    # ── metadata extraction ────────────────────────────────────────────────────

    def _extract_metadata(self, rows: list, all_text: str) -> dict:
        meta = {
            "store_name":     "",
            "invoice_number": "",
            "invoice_date":   "",
            "client_name":    "",
        }

        # Merchant name: first substantive non‑contact row in the top 6
        for row in rows[:6]:
            text = " ".join(b["text"] for b in row).strip()
            if len(text) > 8 and not re.search(
                r"invoice|email|phone|www|support@", text, re.I
            ):
                meta["store_name"] = text
                break
        if not meta["store_name"] and rows:
            meta["store_name"] = " ".join(b["text"] for b in rows[0]).strip()

        # Invoice number — must have a digit right after INV to avoid "INVOICE"
        m = re.search(r"INV[-\s]?\d[\w\-]+", all_text, re.I)
        if m:
            meta["invoice_number"] = m.group().strip()

        # Invoice date
        m = re.search(
            r"\d{1,2}[-/][A-Za-z]{3,9}[-/]\d{2,4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}",
            all_text,
        )
        if m:
            meta["invoice_date"] = m.group()

        # Client name — prefer "Client Name" / "Billed To"; fallback to "Company Name"
        company_fallback = ""
        for row in rows:
            rt = " ".join(b["text"] for b in row)
            m = re.search(r"(?:client\s+name|billed\s+to)[:\s]+(.+)", rt, re.I)
            if m:
                meta["client_name"] = m.group(1).strip()
                break
            m = re.search(r"company\s+name[:\s]+(.+)", rt, re.I)
            if m and not company_fallback:
                company_fallback = m.group(1).strip()

        if not meta["client_name"]:
            meta["client_name"] = company_fallback

        return meta

    # ── grand total extraction from tail (no keyword needed) ──────────────────

    @staticmethod
    def _parse_num(val) -> float:
        """Extract the last number from a cell (handles bleed)."""
        if not val:
            return 0.0
        s = str(val).replace(",", "").replace("₹", "").strip()
        nums = re.findall(r"\d+\.?\d*", s)
        return float(nums[-1]) if nums else 0.0

    def _extract_grand_total_from_tail(self, rows: list, header_idx: int, computed_sum: float = None) -> str:
        """Look for a numeric total after the table, optionally using computed sum to disambiguate."""
        if header_idx is None:
            tail_rows = rows
        else:
            tail_rows = rows[header_idx + 1:]
        candidates = []
        for row in reversed(tail_rows):
            row_text = " ".join(b["text"] for b in row).strip()
            numbers = re.findall(r"[\d,]+\.?\d*", row_text.replace(",", ""))
            if numbers:
                val = float(numbers[-1])  # rightmost number in the row
                candidates.append(val)
            if len(candidates) >= 2:
                break
        if not candidates:
            return ""
        if computed_sum and candidates:
            best = min(candidates, key=lambda x: abs(x - computed_sum))
            return str(int(best) if best.is_integer() else f"{best:.2f}")
        return str(int(candidates[0]) if candidates[0].is_integer() else f"{candidates[0]:.2f}")

    # ── top-level assembly ─────────────────────────────────────────────────────

    def _build_invoice_dict(self, rows: list) -> dict:
        all_text = " ".join(b["text"] for row in rows for b in row)
        meta     = self._extract_metadata(rows, all_text)
        result   = {**meta, "columns": [], "line_items": [], "grand_total": ""}

        header_idx, col_bounds = self._find_table_header(rows)
        if header_idx is None or not col_bounds:
            return result

        # Refine column boundaries using data rows (preserves semantics)
        data_rows = rows[header_idx + 1:]
        col_bounds = self._refine_boundaries_with_data(col_bounds, data_rows)

        # Deduplicate: if OCR produced two header tokens with same normalised key
        seen: dict = {}
        for cb in col_bounds:
            if cb["key"] not in seen:
                seen[cb["key"]] = cb
        col_bounds = list(seen.values())

        result["columns"] = [c["key"] for c in col_bounds]

        serial_key = next(
            (c["key"] for c in col_bounds
             if re.search(r"^s[_\s]?no|^sr|^serial|^sl|^no$", c["key"])),
            None,
        )

        for row in data_rows:
            row_text = " ".join(b["text"] for b in row).strip()

            # Stop at Grand Total (if keyword exists)
            if re.search(r"grand\s*total|total\s*amount", row_text, re.I):
                nums = re.findall(r"\d[\d,]*\.?\d*", row_text.replace(",", ""))
                if nums:
                    result["grand_total"] = nums[-1]
                break

            if len(row) < 2:
                continue

            item = self._assign_cells(row, col_bounds)

            # Recover S.No if it leaked into service/item column
            if serial_key and serial_key not in item:
                # Look for leading number in service/item/description
                for text_key in ("service", "item", "description", "particulars"):
                    if text_key in item:
                        candidate = item[text_key].strip()
                        # Pattern: "3 |Invoice Verification" or "3 Invoice Verification"
                        m = re.match(r"^(\d{1,3})\s*[|:.-]\s*(.*)", candidate)
                        if m:
                            item[serial_key] = m.group(1)
                            item[text_key] = m.group(2).strip()
                            break
                        # If the whole field is just a number
                        if re.fullmatch(r"\d{1,3}", candidate):
                            item[serial_key] = candidate
                            del item[text_key]
                            break

            # Drop S.No‑only rows
            if serial_key and len(item) == 1 and serial_key in item:
                continue

            # Clean service/item name
            for text_key in ("service", "item", "description", "particulars"):
                if text_key in item:
                    item[text_key] = self._clean_item_name(item[text_key])
                    break

            has_text   = any(not re.fullmatch(r"[\d,.\s]+", v) for v in item.values())
            has_number = any(re.search(r"\d", v) for v in item.values())
            if has_text and has_number:
                result["line_items"].append(item)

        # If no grand_total captured yet, extract from tail rows
        if not result["grand_total"]:
            # Compute sum of line totals (if any) to help disambiguate
            line_total_sum = sum(self._parse_num(item.get("total", item.get("line_total", "")))
                                 for item in result["line_items"])
            result["grand_total"] = self._extract_grand_total_from_tail(rows, header_idx, line_total_sum)

        return result


local_ai_model = CustomDocumentIntelligenceModel()