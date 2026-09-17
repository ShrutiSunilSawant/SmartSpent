"""
app/ml/category_model.py
--------------------------
Automatic expense category classification using ML.

Model: TF-IDF Vectorizer + Multinomial Naive Bayes

How it works:
1. Training data: merchant names and descriptions mapped to categories
2. TF-IDF converts text → numerical feature vectors
3. Naive Bayes classifies based on word frequencies
4. Model is trained at startup and cached in memory

Examples:
- "Starbucks" → "Food"
- "Uber" → "Transport"
- "Netflix" → "Entertainment"
- "CVS Pharmacy" → "Healthcare"

Why Naive Bayes?
- Very fast, works great for text classification
- Low memory requirements
- Interpretable: based on word probability
- Works well with small training datasets
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
import numpy as np
from typing import Optional

from app.utils.logger import logger


# ─── Training Data ─────────────────────────────────────────────────────────────
# Format: (text_input, category)
# text_input combines merchant name and common descriptions
# Add more examples to improve accuracy

TRAINING_DATA = [
    # Food & Dining
    ("starbucks coffee", "Food"),
    ("mcdonalds fast food", "Food"),
    ("subway sandwich", "Food"),
    ("pizza hut pizza", "Food"),
    ("chipotle burrito", "Food"),
    ("whole foods grocery", "Food"),
    ("trader joes grocery", "Food"),
    ("walmart grocery food", "Food"),
    ("kroger supermarket", "Food"),
    ("doordash food delivery", "Food"),
    ("ubereats food delivery", "Food"),
    ("grubhub food delivery", "Food"),
    ("instacart grocery delivery", "Food"),
    ("restaurant dinner", "Food"),
    ("cafe lunch coffee", "Food"),
    ("bar drinks beer", "Food"),
    ("bakery bread pastry", "Food"),
    ("sushi japanese restaurant", "Food"),
    ("taco bell mexican food", "Food"),
    ("burger king fast food", "Food"),

    # Transport
    ("uber ride", "Transport"),
    ("lyft ride", "Transport"),
    ("shell gas station", "Transport"),
    ("exxon gas fuel", "Transport"),
    ("chevron gas station", "Transport"),
    ("bp gas fuel", "Transport"),
    ("parking lot garage", "Transport"),
    ("metro subway transit", "Transport"),
    ("bus ticket transit", "Transport"),
    ("train amtrak ticket", "Transport"),
    ("airline flight ticket", "Transport"),
    ("delta airlines flight", "Transport"),
    ("united airlines ticket", "Transport"),
    ("car rental enterprise", "Transport"),
    ("hertz car rental", "Transport"),
    ("toll road highway", "Transport"),
    ("auto repair mechanic", "Transport"),
    ("jiffy lube oil change", "Transport"),

    # Entertainment
    ("netflix subscription streaming", "Entertainment"),
    ("spotify music streaming", "Entertainment"),
    ("hulu streaming tv", "Entertainment"),
    ("disney plus streaming", "Entertainment"),
    ("amazon prime subscription", "Entertainment"),
    ("movie theater cinema ticket", "Entertainment"),
    ("amc theater movie", "Entertainment"),
    ("concert ticket show", "Entertainment"),
    ("steam game gaming", "Entertainment"),
    ("xbox playstation gaming", "Entertainment"),
    ("apple arcade gaming subscription", "Entertainment"),
    ("audible book subscription", "Entertainment"),
    ("kindle books reading", "Entertainment"),
    ("youtube premium subscription", "Entertainment"),

    # Healthcare
    ("cvs pharmacy medicine", "Healthcare"),
    ("walgreens pharmacy", "Healthcare"),
    ("rite aid pharmacy drugs", "Healthcare"),
    ("doctor visit copay", "Healthcare"),
    ("dentist dental care", "Healthcare"),
    ("hospital medical bill", "Healthcare"),
    ("optometrist eye care", "Healthcare"),
    ("gym membership fitness", "Healthcare"),
    ("planet fitness gym", "Healthcare"),
    ("vitamins supplements health", "Healthcare"),
    ("therapy counseling mental health", "Healthcare"),

    # Shopping
    ("amazon purchase online", "Shopping"),
    ("target store retail", "Shopping"),
    ("walmart retail shopping", "Shopping"),
    ("best buy electronics", "Shopping"),
    ("apple store electronics", "Shopping"),
    ("clothing apparel fashion", "Shopping"),
    ("nike shoes athletic", "Shopping"),
    ("zara clothing fashion", "Shopping"),
    ("home depot hardware", "Shopping"),
    ("lowes home improvement", "Shopping"),
    ("ikea furniture home", "Shopping"),

    # Utilities
    ("electric bill utility", "Utilities"),
    ("water bill utility", "Utilities"),
    ("gas heating utility", "Utilities"),
    ("internet cable comcast", "Utilities"),
    ("phone bill att verizon", "Utilities"),
    ("rent mortgage housing", "Utilities"),

    # Education
    ("udemy course online learning", "Education"),
    ("coursera education course", "Education"),
    ("book textbook education", "Education"),
    ("tuition school university", "Education"),
    ("github pro developer tools", "Education"),

    # Finance
    ("bank fee service charge", "Finance"),
    ("atm withdrawal cash", "Finance"),
    ("insurance premium", "Finance"),
    ("investment brokerage", "Finance"),
    ("venmo payment transfer", "Finance"),
    ("paypal payment", "Finance"),

    # Travel
    ("hotel airbnb lodging", "Travel"),
    ("marriott hilton hotel", "Travel"),
    ("airbnb vacation rental", "Travel"),
    ("travel insurance trip", "Travel"),
    ("baggage fee airline", "Travel"),
]


class CategoryPredictor:
    """
    ML pipeline for predicting expense categories from text.
    
    Architecture:
    TF-IDF → MultinomialNB → Category label
    """

    def __init__(self):
        """Initialize and train the model at startup."""
        self.pipeline: Optional[Pipeline] = None
        self.categories = [
            "Food", "Transport", "Entertainment", "Healthcare",
            "Shopping", "Utilities", "Education", "Finance", "Travel", "Other"
        ]
        self._train()

    def _train(self) -> None:
        """
        Train the TF-IDF + Naive Bayes pipeline on built-in training data.
        Called once at startup — fast (< 1 second).
        """
        try:
            texts = [text for text, _ in TRAINING_DATA]
            labels = [label for _, label in TRAINING_DATA]

            self.pipeline = Pipeline([
                (
                    "tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 2),    # Use 1-grams and 2-grams
                        min_df=1,              # Include words appearing once
                        max_features=5000,     # Limit vocabulary size
                        sublinear_tf=True,     # Apply log normalization
                    ),
                ),
                (
                    "clf",
                    MultinomialNB(alpha=0.5),  # Laplace smoothing
                ),
            ])

            self.pipeline.fit(texts, labels)
            logger.info("Category predictor trained on {} examples", len(TRAINING_DATA))

        except Exception as e:
            logger.error("Failed to train category model: {}", str(e))
            self.pipeline = None

    def predict(self, merchant: str, description: str = "") -> str:
        """
        Predict the category for an expense.
        
        Args:
            merchant: Merchant/store name (e.g., "Starbucks")
            description: Optional description (e.g., "morning coffee")
            
        Returns:
            Category string (e.g., "Food"), defaults to "Other"
        """
        if not self.pipeline:
            return "Other"

        # Combine merchant and description for better context
        text = f"{merchant} {description}".strip().lower()

        if not text:
            return "Other"

        try:
            prediction = self.pipeline.predict([text])[0]
            confidence = max(self.pipeline.predict_proba([text])[0])

            # Only use prediction if confident enough
            if confidence >= 0.3:
                return prediction
            else:
                return "Other"

        except Exception as e:
            logger.error("Category prediction failed: {}", str(e))
            return "Other"

    def predict_with_confidence(self, merchant: str, description: str = "") -> dict:
        """
        Like predict() but also returns confidence scores for all categories.
        Useful for debugging and showing users alternative categories.
        """
        if not self.pipeline:
            return {"category": "Other", "confidence": 0.0, "alternatives": {}}

        text = f"{merchant} {description}".strip().lower()

        try:
            classes = self.pipeline.classes_
            probas = self.pipeline.predict_proba([text])[0]

            # Sort by confidence
            ranked = sorted(
                zip(classes, probas),
                key=lambda x: x[1],
                reverse=True,
            )

            return {
                "category": ranked[0][0],
                "confidence": round(float(ranked[0][1]), 3),
                "alternatives": {k: round(float(v), 3) for k, v in ranked[1:4]},
            }
        except Exception as e:
            logger.error("Prediction with confidence failed: {}", str(e))
            return {"category": "Other", "confidence": 0.0, "alternatives": {}}
