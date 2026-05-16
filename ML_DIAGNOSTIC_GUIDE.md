# ML Model Integration - Diagnostic Guide

## Overview
This document outlines how to verify that ML models are working correctly in the Bid Brilliance system.

## ML Models Location
- **Regression Model** (Price Prediction): `ml/price_pred.pkl`
- **Classification Model** (Win Probability): `ml/classification.pkl`
- **Feature Scaler**: `ml/feature_scaler.pkl`

## Expected Behavior

### 1. Price Prediction (Regression Model)
- **Input**: Auction features (8 dimensions)
  - `starting_price`: Initial auction price
  - `current_bid`: Current highest bid
  - `bidders`: Number of unique bidders
  - `total_bids`: Total number of bids placed
  - `avg_increment`: Average bid increment
  - `bid_velocity`: Bids per hour
  - `auction_duration`: Total auction duration in minutes
  - `time_remaining`: Minutes left in auction

- **Output**: Predicted final auction price (float)
  
- **Display Format**:
  - Lower Bound: `max(0.75 * predicted_price, current_bid)`
  - Upper Bound: `1.25 * predicted_price`
  - Display: `{lower} - {upper} CR`

### 2. Win Probability (Classification Model)
- **Input**: Same 8 features as regression model
- **Output**: Probability of auction reaching "high price" (0.0 to 1.0)
  - `0.0` = Very likely low price
  - `1.0` = Very likely high price
  
- **Display Format**: Convert to percentage (0-100%)
  - Example: 0.52 → `52%` win probability
  - Clamped to [5%, 99%] range for reasonable display

## Feature Preprocessing
The `mlPredictor.py` script handles:
1. **Bid History Analysis**: Extracts metrics from bid history if provided
   - Calculates `total_bids` from bid list
   - Counts unique `bidders`
   - Computes `avg_increment` between consecutive bids
   - Calculates `bid_velocity` from timestamps

2. **Feature Scaling**: All features are standardized using `StandardScaler`
   - Ensures consistent model performance
   - Features centered at 0 with unit variance

## Testing ML Integration

### Run ML Model Test
```bash
cd server
node test_ml_models.js
```

This will:
1. Test with an active auction scenario
2. Test with a late-stage, high-activity auction
3. Display predicted prices and win probabilities
4. Show the price range calculation

### Expected Output Format
```
Price Range: 471 - 765 CR
Win Probability: 52.00%
Top Features:
  - current_bid (45.2%)
  - bidders (28.1%)
  - total_bids (15.3%)
```

## Debugging Steps

### 1. Check Model Files Exist
```bash
ls -la ml/price_pred.pkl ml/classification.pkl ml/feature_scaler.pkl
```

### 2. Verify Feature Order
The FEATURE_COLUMNS in `mlPredictor.py` MUST match training data:
```python
FEATURE_COLUMNS = [
    'starting_price',
    'current_bid',
    'bidders',
    'total_bids',
    'avg_increment',
    'bid_velocity',
    'auction_duration',
    'time_remaining'
]
```

### 3. Check Server Logs
Look for ML analysis logs:
```
[INFO] Sending to ML model: {...}
[INFO] ML Analysis Response: {...}
```

### 4. Validate ML Output
- Price must be positive number
- Win probability must be between 0 and 1
- Top features must be returned with importances

## Common Issues & Solutions

### Issue: Always showing 50% win probability
**Cause**: Classification model returning 0.5 for all inputs
**Solution**:
1. Verify model file isn't corrupted
2. Check feature values are in expected ranges
3. Retrain model if needed with more diverse data

### Issue: Price predictions are negative or zero
**Cause**: Model scaling issue or invalid features
**Solution**:
1. Ensure `current_bid > starting_price` in most cases
2. Check bid_velocity isn't NaN (from timestamp parsing)
3. Verify all features are numeric values

### Issue: ML service timeout
**Cause**: Python subprocess not starting
**Solution**:
1. Verify Python 3 is installed: `python --version`
2. Check dependencies: `pip list | grep scikit-learn`
3. Test directly: `python server/services/mlPredictor.py`

## Performance Notes

- ML inference should complete in <100ms per request
- Models are loaded once at startup
- Feature scaling uses standardized coefficients from training

## Integration Points

1. **Frontend**: Displays predicted price range and win probability
2. **Backend**: `/bidding-analysis` and `/winning-probability` endpoints
3. **ML Service**: `mlPredictionService.js` → `mlPredictor.py`

The system is designed to:
- Use ML predictions as primary source of truth
- Fall back to formula-based estimates if ML fails
- Always clamp probabilities to reasonable [5%, 99%] range
- Log all ML operations for debugging
