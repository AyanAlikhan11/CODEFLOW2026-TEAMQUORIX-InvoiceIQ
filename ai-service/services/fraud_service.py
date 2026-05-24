"""
Fraud Detection Service
========================

Multi-signal fraud detection for invoices.  Combines:
  • Duplicate detection (embedding similarity)
  • Amount anomaly detection (statistical outliers via z-score and IQR)
  • Merchant verification (GST format validation)
  • Timing analysis (unusual submission times / intervals)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

import numpy as np

logger = logging.getLogger("invoiceiq.ai.services.fraud")


class FraudService:
    """
    Orchestrates multiple fraud detection strategies and produces an
    aggregated fraud score with per-signal breakdowns.
    """

    # Risk level thresholds
    RISK_THRESHOLDS = {
        "low": 0.25,
        "medium": 0.50,
        "high": 0.75,
        "critical": 1.00,
    }

    def __init__(self) -> None:
        """Initialise the fraud detection service."""
        # In-memory store for historical amounts (per-merchant)
        # In production, this would be loaded from a database.
        self._merchant_amounts: dict[str, list[float]] = {}
        self._submission_times: list[datetime] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calculate_fraud_score(
        self,
        invoice: dict[str, Any],
        embedding_service: Any | None = None,
        history: Optional[list[dict[str, Any]]] = None,
    ) -> dict[str, Any]:
        """
        Run all fraud detection signals and produce a composite score.

        Args:
            invoice: Invoice dict with keys like 'invoice_id', 'merchant_name',
                     'amount', 'date', 'invoice_number', 'text', 'merchant_gst'.
            embedding_service: Optional EmbeddingService for duplicate detection.
            history: Optional list of previous invoices for context.

        Returns:
            Dict with 'fraud_score' (0–1), 'risk_level', 'signals', 'recommendation'.
        """
        signals: list[dict[str, Any]] = []
        total_weight = 0.0
        weighted_score = 0.0

        # --- 1. Duplicate detection (weight: 0.35) ---
        if embedding_service and invoice.get("text"):
            dup_signal = self.detect_duplicates(
                text=invoice["text"],
                embedding_service=embedding_service,
                threshold=0.92,
            )
            if dup_signal:
                signals.append(dup_signal)
                weighted_score += dup_signal["confidence"] * 0.35
                total_weight += 0.35

        # --- 2. Amount anomaly detection (weight: 0.30) ---
        amount_signal = self.detect_amount_anomaly(
            merchant_name=invoice.get("merchant_name"),
            amount=invoice.get("amount", 0),
            history=history,
        )
        if amount_signal:
            signals.append(amount_signal)
            weighted_score += amount_signal["confidence"] * 0.30
            total_weight += 0.30

        # --- 3. Merchant verification (weight: 0.15) ---
        merchant_signal = self.verify_merchant(
            merchant_name=invoice.get("merchant_name"),
            merchant_gst=invoice.get("merchant_gst"),
        )
        if merchant_signal:
            signals.append(merchant_signal)
            weighted_score += merchant_signal["confidence"] * 0.15
            total_weight += 0.15

        # --- 4. Timing anomaly (weight: 0.20) ---
        timing_signal = self.detect_timing_anomaly(
            invoice_date=invoice.get("date"),
            history=history,
        )
        if timing_signal:
            signals.append(timing_signal)
            weighted_score += timing_signal["confidence"] * 0.20
            total_weight += 0.20

        # --- Aggregate score ---
        fraud_score = weighted_score / total_weight if total_weight > 0 else 0.0
        fraud_score = round(min(max(fraud_score, 0.0), 1.0), 4)

        risk_level = self._classify_risk(fraud_score)
        recommendation = self._generate_recommendation(fraud_score, risk_level, signals)

        return {
            "fraud_score": fraud_score,
            "risk_level": risk_level,
            "signals": signals,
            "recommendation": recommendation,
        }

    def detect_duplicates(
        self,
        text: str,
        embedding_service: Any,
        threshold: float = 0.92,
    ) -> Optional[dict[str, Any]]:
        """
        Check for duplicate / near-duplicate invoices via embedding similarity.

        Args:
            text: Invoice text to check.
            embedding_service: An EmbeddingService instance with a populated index.
            threshold: Cosine similarity threshold for duplicate flagging.

        Returns:
            A signal dict if a potential duplicate is found, else None.
        """
        try:
            query_embedding = embedding_service.generate_embedding(text)
            results = embedding_service.similarity_search(
                query_embedding=query_embedding,
                k=3,
                threshold=threshold,
            )

            if results:
                best = max(results, key=lambda r: r["similarity"])
                severity = (
                    "critical" if best["similarity"] >= 0.98
                    else "high" if best["similarity"] >= 0.95
                    else "medium"
                )
                return {
                    "signal_type": "duplicate",
                    "severity": severity,
                    "description": (
                        f"Potential duplicate of invoice {best['id']} "
                        f"(similarity: {best['similarity']:.2%})"
                    ),
                    "confidence": best["similarity"],
                }

        except Exception as exc:
            logger.warning("Duplicate detection failed: %s", exc)

        return None

    def detect_amount_anomaly(
        self,
        merchant_name: Optional[str],
        amount: float,
        history: Optional[list[dict[str, Any]]] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Detect statistically anomalous invoice amounts.

        Uses z-score and IQR methods to flag outliers.

        Args:
            merchant_name: Merchant name for per-merchant analysis.
            amount: Invoice amount to check.
            history: Historical invoices for context.

        Returns:
            A signal dict if an anomaly is detected, else None.
        """
        if not history or len(history) < 3:
            return None

        amounts = [
            inv.get("amount", 0)
            for inv in history
            if inv.get("amount", 0) > 0
        ]
        if len(amounts) < 3:
            return None

        amounts_arr = np.array(amounts)
        mean = float(np.mean(amounts_arr))
        std = float(np.std(amounts_arr))
        z_score = (amount - mean) / std if std > 0 else 0

        # IQR method
        q1 = float(np.percentile(amounts_arr, 25))
        q3 = float(np.percentile(amounts_arr, 75))
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        is_outlier = abs(z_score) > 3 or amount < lower_bound or amount > upper_bound

        if is_outlier:
            severity = (
                "critical" if abs(z_score) > 5
                else "high" if abs(z_score) > 4
                else "medium"
            )
            return {
                "signal_type": "amount_anomaly",
                "severity": severity,
                "description": (
                    f"Amount ₹{amount:,.0f} is anomalous "
                    f"(z-score: {z_score:.1f}, avg: ₹{mean:,.0f})"
                ),
                "confidence": min(abs(z_score) / 5.0, 1.0),
            }

        return None

    def detect_timing_anomaly(
        self,
        invoice_date: Optional[str],
        history: Optional[list[dict[str, Any]]] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Detect timing-based anomalies such as:
          - Backdated invoices (date > 90 days in the past)
          - Future-dated invoices
          - Unusual submission patterns

        Args:
            invoice_date: ISO date string or DD/MM/YYYY.
            history: Historical invoices for pattern analysis.

        Returns:
            A signal dict if a timing anomaly is detected, else None.
        """
        if not invoice_date:
            return None

        try:
            # Parse date — try multiple formats
            parsed_date = self._parse_date(invoice_date)
            if parsed_date is None:
                return None

            now = datetime.now(parsed_date.tzinfo)

            # Check backdated (older than 90 days)
            age_days = (now - parsed_date).days
            if age_days > 90:
                severity = (
                    "critical" if age_days > 365
                    else "high" if age_days > 180
                    else "medium"
                )
                return {
                    "signal_type": "timing_anomaly",
                    "severity": severity,
                    "description": (
                        f"Invoice is backdated by {age_days} days "
                        f"(date: {invoice_date})"
                    ),
                    "confidence": min(age_days / 365.0, 1.0),
                }

            # Check future-dated
            if age_days < -7:
                return {
                    "signal_type": "timing_anomaly",
                    "severity": "high",
                    "description": (
                        f"Invoice date is {abs(age_days)} days in the future "
                        f"(date: {invoice_date})"
                    ),
                    "confidence": 0.8,
                }

            # Check for unusual submission patterns (rapid successive invoices)
            if history and len(history) >= 3:
                recent_dates = []
                for inv in history[-10:]:
                    if inv.get("date"):
                        d = self._parse_date(inv["date"])
                        if d:
                            recent_dates.append(d)

                if len(recent_dates) >= 3:
                    recent_dates.sort()
                    intervals = [
                        (recent_dates[i + 1] - recent_dates[i]).days
                        for i in range(len(recent_dates) - 1)
                    ]
                    avg_interval = sum(intervals) / len(intervals)
                    if avg_interval < 1:
                        return {
                            "signal_type": "timing_anomaly",
                            "severity": "medium",
                            "description": (
                                f"Unusually rapid invoice submissions "
                                f"(avg interval: {avg_interval:.1f} days)"
                            ),
                            "confidence": 0.6,
                        }

        except Exception as exc:
            logger.warning("Timing analysis failed: %s", exc)

        return None

    def verify_merchant(
        self,
        merchant_name: Optional[str],
        merchant_gst: Optional[str],
    ) -> Optional[dict[str, Any]]:
        """
        Basic merchant verification checks:
          - GST format validation (if GST number provided)
          - Suspicious merchant name patterns

        Args:
            merchant_name: Merchant / vendor name.
            merchant_gst: Indian GST identification number.

        Returns:
            A signal dict if verification fails, else None.
        """
        signals: list[dict[str, Any]] = []

        # GST validation
        if merchant_gst:
            import re
            gst_pattern = re.compile(
                r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$"
            )
            if not gst_pattern.match(merchant_gst.strip()):
                signals.append({
                    "signal_type": "merchant_verification",
                    "severity": "high",
                    "description": f"Invalid GST number format: {merchant_gst}",
                    "confidence": 0.9,
                })

        # Suspicious name patterns
        if merchant_name:
            suspicious_patterns = [
                "cash", "personal", "self", "na", "n/a", "unknown",
                "not provided", "blank", "test", "dummy",
            ]
            name_lower = merchant_name.lower().strip()
            for pattern in suspicious_patterns:
                if pattern in name_lower:
                    signals.append({
                        "signal_type": "merchant_verification",
                        "severity": "medium",
                        "description": (
                            f"Suspicious merchant name: '{merchant_name}' "
                            f"(contains '{pattern}')"
                        ),
                        "confidence": 0.7,
                    })
                    break

        # Return the highest-severity signal or None
        if signals:
            return max(signals, key=lambda s: s["confidence"])
        return None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _classify_risk(score: float) -> str:
        """Map a fraud score to a risk level."""
        if score >= 0.75:
            return "critical"
        elif score >= 0.50:
            return "high"
        elif score >= 0.25:
            return "medium"
        return "low"

    @staticmethod
    def _generate_recommendation(
        score: float,
        risk_level: str,
        signals: list[dict[str, Any]],
    ) -> str:
        """Generate a human-readable recommendation based on the fraud score."""
        if risk_level == "low":
            return "Invoice appears legitimate. No immediate action required."
        elif risk_level == "medium":
            signal_types = [s["signal_type"] for s in signals]
            return (
                f"Review recommended — potential issues detected: "
                f"{', '.join(signal_types)}. "
                "Manual verification advised."
            )
        elif risk_level == "high":
            return (
                "High fraud risk detected. Invoice should be blocked and "
                "escalated to the finance team for manual review."
            )
        else:  # critical
            return (
                "Critical fraud risk. Invoice blocked automatically. "
                "Immediate investigation required. "
                "Notify compliance team."
            )

    @staticmethod
    def _parse_date(date_str: str) -> Optional[datetime]:
        """Parse a date string in multiple common formats."""
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%m/%d/%Y",
            "%d.%m.%Y",
            "%Y/%m/%d",
            "%d %b %Y",
            "%d %B %Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        return None
