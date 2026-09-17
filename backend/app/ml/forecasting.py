"""
app/ml/forecasting.py
----------------------
Expense forecasting using Prophet (with ARIMA fallback).

What is Prophet?
- Open-source time series forecasting by Meta
- Handles: seasonality, holidays, missing data, outliers
- Very user-friendly API
- Great for financial forecasting

What is ARIMA?
- Classical time series model
- More mature, widely understood
- Fallback if Prophet isn't installed

How we use it:
- Aggregate daily/monthly expenses into time series
- Train on historical data
- Forecast next 30-90 days
- Return predicted amounts with confidence intervals
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from app.utils.logger import logger


def _try_import_prophet():
    """Try to import Prophet; return None if not installed."""
    try:
        from prophet import Prophet
        return Prophet
    except ImportError:
        logger.warning("Prophet not installed. Using ARIMA fallback.")
        return None


class ExpenseForecaster:
    """
    Forecasts future expenses using historical spending patterns.
    
    Priority: Prophet → ARIMA → Simple moving average
    """

    def forecast(
        self,
        expense_data: List[Dict[str, Any]],
        days_ahead: int = 30,
    ) -> Dict[str, Any]:
        """
        Generate expense forecast.
        
        Args:
            expense_data: List of expense dicts with 'date' and 'amount' keys
            days_ahead: How many days to forecast into the future
            
        Returns:
            Dict with forecast data, confidence intervals, and summary
        """
        if not expense_data:
            return self._empty_forecast(days_ahead)

        # Convert to DataFrame
        df = pd.DataFrame(expense_data)
        df["date"] = pd.to_datetime(df["date"])
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)

        # Aggregate by day (sum all expenses per day)
        daily = (
            df.groupby(df["date"].dt.date)["amount"]
            .sum()
            .reset_index()
        )
        daily.columns = ["date", "amount"]
        daily["date"] = pd.to_datetime(daily["date"])

        if len(daily) < 7:
            # Not enough data for time series — use simple average
            return self._simple_average_forecast(daily, days_ahead)

        # Try Prophet first, fall back to ARIMA, then moving average
        Prophet = _try_import_prophet()
        if Prophet is not None:
            return self._prophet_forecast(daily, days_ahead, Prophet)
        else:
            return self._arima_forecast(daily, days_ahead)

    def _prophet_forecast(
        self, daily: pd.DataFrame, days_ahead: int, Prophet
    ) -> Dict[str, Any]:
        """
        Use Meta's Prophet for time series forecasting.
        Prophet requires columns named 'ds' (date) and 'y' (value).
        """
        try:
            # Prepare Prophet input
            prophet_df = daily.rename(columns={"date": "ds", "amount": "y"})

            # Initialize and train Prophet
            model = Prophet(
                daily_seasonality=False,
                weekly_seasonality=True,    # Spending varies by day of week
                yearly_seasonality=False,   # Need 2+ years for this
                changepoint_prior_scale=0.05,  # Controls trend flexibility
                seasonality_prior_scale=10,
            )
            model.fit(prophet_df)

            # Create future dataframe for predictions
            future = model.make_future_dataframe(periods=days_ahead)
            forecast = model.predict(future)

            # Extract only the future predictions (after last data point)
            future_forecast = forecast[forecast["ds"] > daily["date"].max()]

            # Build response
            predictions = [
                {
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "predicted": max(0, round(float(row["yhat"]), 2)),
                    "lower": max(0, round(float(row["yhat_lower"]), 2)),
                    "upper": max(0, round(float(row["yhat_upper"]), 2)),
                }
                for _, row in future_forecast.iterrows()
            ]

            total_predicted = sum(p["predicted"] for p in predictions)
            avg_daily = total_predicted / days_ahead if days_ahead > 0 else 0

            return {
                "method": "Prophet",
                "predictions": predictions,
                "summary": {
                    "total_predicted": round(total_predicted, 2),
                    "avg_daily": round(avg_daily, 2),
                    "days_ahead": days_ahead,
                    "confidence": "high",
                },
                "historical_daily": [
                    {
                        "date": row["date"].strftime("%Y-%m-%d"),
                        "amount": round(float(row["amount"]), 2),
                    }
                    for _, row in daily.iterrows()
                ],
            }

        except Exception as e:
            logger.error("Prophet forecasting failed: {}", str(e))
            return self._arima_forecast(daily, days_ahead)

    def _arima_forecast(self, daily: pd.DataFrame, days_ahead: int) -> Dict[str, Any]:
        """
        ARIMA fallback using statsmodels.
        ARIMA(p,d,q): p=autoregressive, d=differencing, q=moving average
        """
        try:
            from statsmodels.tsa.arima.model import ARIMA

            amounts = daily["amount"].values
            last_date = daily["date"].max()

            # Fit ARIMA model (simple 1,1,1 order — good general default)
            model = ARIMA(amounts, order=(1, 1, 1))
            fitted = model.fit()

            # Forecast
            forecast = fitted.forecast(steps=days_ahead)
            conf_int = fitted.get_forecast(steps=days_ahead).conf_int()

            predictions = []
            for i in range(days_ahead):
                pred_date = last_date + timedelta(days=i + 1)
                predicted = max(0, float(forecast.iloc[i]))
                lower = max(0, float(conf_int.iloc[i, 0]))
                upper = max(0, float(conf_int.iloc[i, 1]))

                predictions.append({
                    "date": pred_date.strftime("%Y-%m-%d"),
                    "predicted": round(predicted, 2),
                    "lower": round(lower, 2),
                    "upper": round(upper, 2),
                })

            total_predicted = sum(p["predicted"] for p in predictions)

            return {
                "method": "ARIMA",
                "predictions": predictions,
                "summary": {
                    "total_predicted": round(total_predicted, 2),
                    "avg_daily": round(total_predicted / days_ahead, 2),
                    "days_ahead": days_ahead,
                    "confidence": "medium",
                },
                "historical_daily": [
                    {
                        "date": row["date"].strftime("%Y-%m-%d"),
                        "amount": round(float(row["amount"]), 2),
                    }
                    for _, row in daily.iterrows()
                ],
            }

        except Exception as e:
            logger.error("ARIMA forecasting failed: {}", str(e))
            return self._simple_average_forecast(daily, days_ahead)

    def _simple_average_forecast(
        self, daily: pd.DataFrame, days_ahead: int
    ) -> Dict[str, Any]:
        """
        Fallback: use moving average when no advanced model is available.
        """
        if daily.empty:
            return self._empty_forecast(days_ahead)

        # Use last 7 days average as prediction
        avg_daily = daily["amount"].tail(7).mean()
        last_date = daily["date"].max() if not daily.empty else datetime.now()

        predictions = [
            {
                "date": (last_date + timedelta(days=i + 1)).strftime("%Y-%m-%d"),
                "predicted": round(float(avg_daily), 2),
                "lower": round(float(avg_daily * 0.7), 2),
                "upper": round(float(avg_daily * 1.3), 2),
            }
            for i in range(days_ahead)
        ]

        total_predicted = avg_daily * days_ahead

        return {
            "method": "MovingAverage",
            "predictions": predictions,
            "summary": {
                "total_predicted": round(float(total_predicted), 2),
                "avg_daily": round(float(avg_daily), 2),
                "days_ahead": days_ahead,
                "confidence": "low",
            },
            "historical_daily": [
                {
                    "date": row["date"].strftime("%Y-%m-%d"),
                    "amount": round(float(row["amount"]), 2),
                }
                for _, row in daily.iterrows()
            ],
        }

    def _empty_forecast(self, days_ahead: int) -> Dict[str, Any]:
        """Return empty forecast when no data is available."""
        return {
            "method": "NoData",
            "predictions": [],
            "summary": {
                "total_predicted": 0,
                "avg_daily": 0,
                "days_ahead": days_ahead,
                "confidence": "none",
            },
            "historical_daily": [],
        }


# Singleton
expense_forecaster = ExpenseForecaster()
