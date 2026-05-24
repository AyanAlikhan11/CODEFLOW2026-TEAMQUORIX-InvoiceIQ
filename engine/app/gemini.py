import base64
import json
import re

import httpx
from fastapi import HTTPException

from app.config import get_gemini_api_key, get_gemini_model
from app.models import InvoiceData, PurchasedItem
from app.prompt import EXTRACTION_PROMPT


# ── Helpers ────────────────────────────────────────────────────────────────────

def file_to_base64(content: bytes) -> str:
    return base64.b64encode(content).decode("utf-8")


def build_gemini_payload(b64_data: str, mime_type: str) -> dict:
    return {
        "contents": [
            {
                "parts": [
                    {"text": EXTRACTION_PROMPT},
                    {"inline_data": {"mime_type": mime_type, "data": b64_data}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "topP": 0.8,
            "maxOutputTokens": 8192,
        },
    }


def parse_gemini_response(response_json: dict) -> dict:
    """
    Extract and parse the JSON payload from a Gemini API response.
    If the output was truncated, attempt to salvage partial JSON before failing.
    """
    try:
        text = response_json["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise ValueError(f"Unexpected Gemini response shape: {exc}") from exc

    # Strip accidental markdown fences (```json ... ```)
    text = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text.strip(), flags=re.MULTILINE)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Response was cut off — try to close open brackets/strings and re-parse
        salvaged = text.rstrip().rstrip(",")
        if salvaged.count('"') % 2 != 0:
            salvaged += '"'
        salvaged += "]" * (salvaged.count("[") - salvaged.count("]"))
        salvaged += "}" * (salvaged.count("{") - salvaged.count("}"))
        try:
            return json.loads(salvaged)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Gemini returned truncated/invalid JSON: {exc}\n\nRaw output:\n{text}"
            ) from exc


def build_invoice(extracted: dict) -> InvoiceData:
    """Map a raw Gemini extraction dict into a typed InvoiceData object."""
    invoice = InvoiceData(**{k: extracted.get(k) for k in InvoiceData.model_fields})
    invoice.purchased_items = [
        PurchasedItem(**item)
        for item in extracted.get("purchased_items", [])
        if isinstance(item, dict)
    ]
    return invoice


# ── Main API call ──────────────────────────────────────────────────────────────

async def call_gemini(b64_data: str, mime_type: str) -> dict:
    """
    Send a base64-encoded file to Gemini Vision and return the parsed JSON dict.
    Raises HTTPException on auth or API errors.
    """
    api_key = get_gemini_api_key()
    model   = get_gemini_model()

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set. Add it to your .env file.",
        )

    url     = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    payload = build_gemini_payload(b64_data, mime_type)

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error {resp.status_code}: {resp.text[:500]}",
        )

    return parse_gemini_response(resp.json())