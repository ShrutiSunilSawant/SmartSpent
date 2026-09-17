"""
app/ml/anomaly_detection.py
-----------------------------
Unsupervised anomaly detection using IsolationForest.

What is IsolationForest?
- An unsupervised ML algorithm — no labeled data needed
- Isolates anomalies instead of profiling normal behavior
- Works by randomly partitioning data; anomalies require fewer splits
- Ideal for detecting unusual spending without knowing what "unusual" looks like

How we use it:
- Features: amount, day of week, hour of day, category encoded
- Train on historical expenses
- Score new expenses: anomaly score < threshold → flag as unusual

Example detections:
- $450 grocery bill when average is $80
- $200 Uber ride
- 3 AM purchase
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder
from typing import List, Optional, TYPE_CHECKING

from app.utils.logger import logger

if TYPE_CHECKING:
    from app.models.expense import Expense


class AnomalyDetector:
    """
    Detects unusual expenses using IsolationForest.
    
    Design:
    - Trained on historical expenses each time is_anomaly() is called
    - This is intentional: model adapts as spending patterns change
    - For production, you'd cache and retrain periodically
    """

    def __init__(self, contamination: float = 0.05):
        """
        Args:
            contamination: Expected fraction of anomalies (0.05 = 5%).
                           This is a hyperparameter you can tune.
        """
        self.contamination = contamination
        self.category_encoder = LabelEncoder()

    def _prepare_features(self, expenses: List["Expense"]) -> Optional[np.ndarray]:
        """
        Convert expense objects into a feature matrix.
        
        Features:
        - amount: the raw dollar amount
        - day_of_week: 0-6 (catches weekend spending anomalies)
        - hour_of_day: 0-23 (catches late-night anomalies)
        - category_encoded: numerical encoding of category
        - amount_log: log of amount (reduces skew from large values)
        """
        if not expenses:
            return None

        categories = [e.category or "Other" for e in expenses]
        # Fit encoder on current data
        try:
            self.category_encoder.fit(categories)
        except Exception:
            pass

        features = []
        for e in expenses:
            try:
                amount = float(e.amount or 0)
                day_of_week = e.date.weekday() if e.date else 0
                hour = e.date.hour if e.date else 12
                category_str = e.category or "Other"

                # Encode category (unknown categories → 0)
                try:
                    cat_encoded = self.category_encoder.transform([category_str])[0]
                except ValueError:
                    cat_encoded = 0

                features.append([
                    amount,
                    np.log1p(amount),     # Log transform reduces skew
                    day_of_week,
                    hour,
                    float(cat_encoded),
                ])
            except Exception as ex:
                logger.warning("Skipping expense in anomaly detection: {}", str(ex))
                features.append([0, 0, 0, 12, 0])

        return np.array(features)

    def is_anomaly(
        self,
        new_expense: "Expense",
        historical_expenses: List["Expense"],
    ) -> bool:
        """
        Check if a new expense is anomalous compared to historical data.
        
        Args:
            new_expense: The expense to evaluate
            historical_expenses: Past expenses to learn patterns from
            
        Returns:
            True if the expense is unusual, False if it looks normal
        """
        # Need at least some history to detect anomalies
        if len(historical_expenses) < 10:
            logger.debug("Not enough history for anomaly detection (need 10+ expenses)")
            return False

        try:
            # Combine historical + new expense for fitting
            all_expenses = historical_expenses + [new_expense]
            features = self._prepare_features(all_expenses)

            if features is None:
                return False

            # Train IsolationForest on all data
            model = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100,
            )
            model.fit(features)

            # Get prediction for new expense (last row)
            # IsolationForest returns: 1 = normal, -1 = anomaly
            new_features = features[-1].reshape(1, -1)
            prediction = model.predict(new_features)[0]
            score = model.score_samples(new_features)[0]

            is_anomalous = prediction == -1

            if is_anomalous:
                logger.warning(
                    "Anomaly detected: ${:.2f} at {} (score: {:.3f})",
                    new_expense.amount,
                    new_expense.merchant or "Unknown",
                    score,
                )

            return is_anomalous

        except Exception as e:
            logger.error("Anomaly detection error: {}", str(e))
            return False

    def get_anomaly_scores(
        self, expenses: List["Expense"]
    ) -> List[dict]:
        """
        Score all expenses and return with anomaly scores.
        Used for the analytics dashboard.
        
        Returns list of:
        {"id": int, "score": float, "is_anomaly": bool}
        """
        if len(expenses) < 10:
            return []

        try:
            features = self._prepare_features(expenses)
            if features is None:
                return []

            model = IsolationForest(
                contamination=self.contamination,
                random_state=42,
            )
            model.fit(features)

            predictions = model.predict(features)
            scores = model.score_samples(features)

            return [
                {
                    "id": expenses[i].id,
                    "score": float(scores[i]),
                    "is_anomaly": predictions[i] == -1,
                    "amount": expenses[i].amount,
                    "merchant": expenses[i].merchant,
                }
                for i in range(len(expenses))
            ]

        except Exception as e:
            logger.error("Batch anomaly scoring failed: {}", str(e))
            return []
