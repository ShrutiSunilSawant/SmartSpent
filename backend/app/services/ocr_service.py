"""
app/services/ocr_service.py
-----------------------------
Receipt and invoice scanning pipeline using OpenCV + Tesseract.

Supports:
- JPEG, PNG, WEBP images
- PDF invoices (first page)

Pipeline:
1. Load image/PDF
2. Check image quality — reject blurry/dark images early
3. Preprocess with OpenCV
4. Run OCR with pytesseract
5. Extract: amount, merchant, date
6. Predict category
7. Return structured result for user confirmation
"""

import re
import io
import os
from typing import Optional
from datetime import datetime

import cv2
import numpy as np
import pytesseract
from PIL import Image

from app.schemas.expense import OCRResult
from app.ml.category_model import CategoryPredictor
from app.utils.config import settings
from app.utils.logger import logger

# ── Tesseract path — read from settings (auto-detected per-OS, overridable via env) ──
pytesseract.pytesseract.tesseract_cmd = settings.tesseract_path

# ── Quality thresholds ────────────────────────────────────────────────────────
MIN_BLUR_SCORE    = 50    # Laplacian variance — below this = too blurry
MIN_BRIGHTNESS    = 40    # Mean pixel value — below this = too dark
MAX_BRIGHTNESS    = 245   # Above this = overexposed
MIN_TEXT_CHARS    = 20    # Minimum OCR chars to consider scan successful
MIN_CONFIDENCE_THRESHOLD = 30  # Below this we flag as low quality

category_predictor = CategoryPredictor()


class OCRService:

    def process_receipt(self, image_bytes: bytes, filename: str = "") -> OCRResult:
        """
        Main pipeline: bytes → structured OCR result.
        Handles both images and PDFs.
        """
        try:
            # ── Load ──────────────────────────────────────────────────────────
            ext = (filename or "").lower().split(".")[-1]
            if ext == "pdf":
                image = self._load_pdf(image_bytes)
            else:
                image = self._load_image(image_bytes)

            # ── Quality check (skip for PDFs — white background always triggers it) ──
            if ext != "pdf":
                quality_issue = self._check_image_quality(image)
                if quality_issue:
                    return OCRResult(
                        raw_text="",
                        confidence=0.0,
                        error=quality_issue,
                    )

            # ── Preprocess ────────────────────────────────────────────────────
            processed = self._preprocess_image(image)

            # ── OCR ───────────────────────────────────────────────────────────
            raw_text = self._run_ocr(processed)
            logger.info("OCR extracted {} characters", len(raw_text))

            if len(raw_text.strip()) < MIN_TEXT_CHARS:
                return OCRResult(
                    raw_text=raw_text,
                    confidence=0.0,
                    error=(
                        "Could not read enough text from this image. "
                        "Please upload a clearer photo — ensure good lighting, "
                        "hold the camera steady, and avoid shadows on the receipt."
                    ),
                )

            # ── Extract fields ────────────────────────────────────────────────
            amount   = self._extract_amount(raw_text)
            merchant = self._extract_merchant(raw_text)
            date     = self._extract_date(raw_text)

            predicted_category = None
            if merchant or raw_text:
                predicted_category = category_predictor.predict(
                    merchant=merchant or "",
                    description=raw_text[:200],
                )

            confidence = self._estimate_confidence(amount, merchant, date, raw_text)

            # ── Warn on low confidence ────────────────────────────────────────
            error = None
            if confidence < MIN_CONFIDENCE_THRESHOLD:
                error = (
                    f"Low confidence scan ({confidence:.0f}%). "
                    "The text may not have been read correctly. "
                    "Please review all fields carefully before saving, "
                    "or retake the photo with better lighting."
                )

            return OCRResult(
                amount=amount,
                merchant=merchant,
                date=date,
                predicted_category=predicted_category,
                raw_text=raw_text,
                confidence=confidence,
                error=error,
            )

        except Exception as e:
            logger.error("OCR processing failed: {}", str(e))
            return OCRResult(
                raw_text=f"OCR Error: {str(e)}",
                confidence=0.0,
                error=f"Scan failed: {str(e)}. Please try again with a clearer image.",
            )

    # ── Loaders ───────────────────────────────────────────────────────────────

    def _load_image(self, image_bytes: bytes) -> np.ndarray:
        """Load image bytes into OpenCV array."""
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

    def _load_pdf(self, pdf_bytes: bytes) -> np.ndarray:
        """Convert first page of PDF to image."""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page = doc[0]
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            return self._load_image(img_bytes)
        except ImportError:
            raise Exception(
                "PDF support requires PyMuPDF. "
                "Install it with: pip install pymupdf"
            )

    # ── Quality check ─────────────────────────────────────────────────────────

    def _check_image_quality(self, image: np.ndarray) -> Optional[str]:
        """
        Returns an error message string if image quality is too poor,
        or None if the image is acceptable.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Blur detection — Laplacian variance
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        if blur_score < MIN_BLUR_SCORE:
            return (
                f"Image is too blurry (score: {blur_score:.0f}). "
                "Please hold the camera steady and retake the photo."
            )

        # Brightness check
        brightness = gray.mean()
        if brightness < MIN_BRIGHTNESS:
            return (
                "Image is too dark. "
                "Please take the photo in better lighting."
            )
        if brightness > MAX_BRIGHTNESS:
            return (
                "Image is overexposed (too bright). "
                "Avoid direct flash on the receipt."
            )

        return None  # Image is acceptable

    # ── Preprocessing ─────────────────────────────────────────────────────────

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Enhance image for better OCR accuracy."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Upscale small images
        h, w = gray.shape
        if h < 1500:
            scale = max(2.0, 1500 / h)
            gray = cv2.resize(gray, None, fx=scale, fy=scale,
                              interpolation=cv2.INTER_CUBIC)

        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)

        # Adaptive threshold — handles shadows and uneven lighting
        threshold = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=21, C=10,
        )

        return threshold

    # ── OCR ───────────────────────────────────────────────────────────────────

    def _run_ocr(self, image: np.ndarray) -> str:
        """Run Tesseract with receipt-optimised settings."""
        # psm 6 = uniform block of text (best for receipts)
        # oem 3 = LSTM + legacy engines
        config = "--psm 6 --oem 3"
        return pytesseract.image_to_string(image, config=config)

    # ── Field extractors ──────────────────────────────────────────────────────

    def _extract_amount(self, text: str) -> Optional[float]:
        """Extract the total amount. Prefers 'Total' lines over line items."""
        # Priority: lines containing total/amount keywords
        total_pattern = r"(?:total|amount due|balance|grand\s*total)[\s:]*\$?\s*([\d,]+\.?\d*)"
        matches = re.findall(total_pattern, text, re.IGNORECASE)

        # Fallback: any dollar amount
        dollar_pattern = r"\$\s*([\d,]+\.\d{2})"
        dollar_matches = re.findall(dollar_pattern, text)

        all_candidates = []
        for m in matches + dollar_matches:
            try:
                val = float(m.replace(",", ""))
                if 0.01 <= val <= 100_000:
                    all_candidates.append(val)
            except ValueError:
                pass

        if not all_candidates:
            return None

        # If we had keyword matches, return the first (most likely the real total)
        if matches:
            try:
                return float(matches[0].replace(",", ""))
            except ValueError:
                pass

        # Otherwise return the largest (usually the grand total)
        return max(all_candidates)

    def _extract_merchant(self, text: str) -> Optional[str]:
        """
        Merchant name is usually in the first 1-3 lines,
        in ALL CAPS, short, and not a date/address/number.
        """
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        if not lines:
            return None

        for line in lines[:6]:
            # Skip dates, amounts, phone numbers, URLs
            if re.search(r"\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}", line): continue
            if re.search(r"\$|total|subtotal|tax|receipt|thank|www\.|\.com|store#|phone|tel:", line, re.IGNORECASE): continue
            if re.search(r"^\d+$", line): continue  # Pure numbers
            if len(line) < 3 or len(line) > 60: continue

            words = line.split()
            if 1 <= len(words) <= 6:
                # Clean up OCR artifacts
                clean = re.sub(r"[^a-zA-Z0-9\s&'\-]", "", line).strip()
                if len(clean) >= 3:
                    return clean.title()

        return lines[0].title() if lines else None

    def _extract_date(self, text: str) -> Optional[datetime]:
        """Extract date from receipt text, supporting multiple formats."""
        # MM/DD/YY or MM/DD/YYYY or M/D/YY
        patterns = [
            (r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})", "mdy"),
            (r"(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})", "ymd"),
        ]
        for pattern, fmt in patterns:
            for match in re.finditer(pattern, text):
                try:
                    g = match.groups()
                    if fmt == "ymd":
                        year, month, day = int(g[0]), int(g[1]), int(g[2])
                    else:
                        month, day, year = int(g[0]), int(g[1]), int(g[2])
                        if year < 100:
                            year += 2000
                    if 1 <= month <= 12 and 1 <= day <= 31 and 2000 <= year <= 2100:
                        return datetime(year, month, day)
                except (ValueError, IndexError):
                    pass

        # Written month: "Dec 16, 2025" or "May 14, 2026"
        month_pat = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})"
        match = re.search(month_pat, text, re.IGNORECASE)
        if match:
            try:
                return datetime.strptime(
                    f"{match.group(1)} {match.group(2)} {match.group(3)}", "%b %d %Y"
                )
            except ValueError:
                pass

        # "14 May 2026" format
        month_pat2 = r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})"
        match = re.search(month_pat2, text, re.IGNORECASE)
        if match:
            try:
                return datetime.strptime(
                    f"{match.group(2)} {match.group(1)} {match.group(3)}", "%b %d %Y"
                )
            except ValueError:
                pass

        return None

    def _estimate_confidence(
        self,
        amount: Optional[float],
        merchant: Optional[str],
        date: Optional[datetime],
        raw_text: str,
    ) -> float:
        """Score 0-100 based on how much we successfully extracted."""
        score = 0.0
        if amount is not None:  score += 50
        if merchant is not None: score += 30
        if date is not None:     score += 20
        # Bonus if text is long and readable
        if len(raw_text) > 200:  score = min(100, score + 10)
        return round(score, 1)


ocr_service = OCRService()
