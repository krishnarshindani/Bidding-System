#!/usr/bin/env python3
"""
ML Model Predictor Service
Loads XGBoost models and scaler from pickle files and makes predictions
"""

import json
import sys
import pickle
import joblib
import numpy as np
import os

# Model paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.normpath(os.path.join(BASE_DIR, '..', '..', 'ml'))

MODEL_PATHS = {
    'regression': os.path.join(ML_DIR, 'price_pred.pkl'),
    'classification': os.path.join(ML_DIR, 'classification.pkl'),
    'scaler': os.path.join(ML_DIR, 'feature_scaler.pkl')
}

# Feature columns (must match training data)
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

class MLPredictor:
    def __init__(self):
        self.reg_model = None
        self.cls_model = None
        self.scaler = None
        self.is_loaded = False
        self.load_models()
    
    def load_models(self):
        """Load all models from pickle files"""
        try:
            self.reg_model = joblib.load(MODEL_PATHS['regression'])
            self.cls_model = joblib.load(MODEL_PATHS['classification'])
            self.scaler = joblib.load(MODEL_PATHS['scaler'])
            
            self.is_loaded = True
            return True
        except Exception as e:
            print(json.dumps({
                'error': f'Failed to load models: {str(e)}',
                'status': 'error'
            }))
            return False
    
    def _preprocess_features(self, features_dict):
        """Dynamically build fixed machine learning features from a raw array of real bid history."""
        bid_history = features_dict.get('bid_history', [])
        
        if isinstance(bid_history, list) and len(bid_history) > 0:
            # Sort by timestamp or amount
            bids = sorted(bid_history, key=lambda x: x.get('amount', 0))
            
            features_dict['total_bids'] = len(bids)
            
            # Count unique bidders if available
            bidders = set([b.get('bidderName') for b in bids if b.get('bidderName')])
            if len(bidders) > 0:
                features_dict['bidders'] = len(bidders)
                
            # Calculate average bid increment
            if len(bids) > 1:
                increments = [bids[i].get('amount', 0) - bids[i-1].get('amount', 0) for i in range(1, len(bids))]
                features_dict['avg_increment'] = sum(increments) / len(increments)
                
            # Calculate bid velocity (bids per hour)
            if len(bids) >= 2:
                from datetime import datetime
                try:
                    # timestamps like 2026-03-16T17:15:23.000Z
                    fmt = "%Y-%m-%dT%H:%M:%S.%fZ"
                    t1_str = bids[0].get('timestamp', '')
                    tn_str = bids[-1].get('timestamp', '')
                    
                    if t1_str and tn_str:
                        # Fallback parsing replacing Z
                        t1_str = t1_str.replace('Z', '')[:23] # Ensure microseconds format matches
                        tn_str = tn_str.replace('Z', '')[:23]
                        
                        try:
                            t1 = datetime.fromisoformat(t1_str)
                            tn = datetime.fromisoformat(tn_str)
                            hours = (tn - t1).total_seconds() / 3600.0
                            if hours > 0:
                                features_dict['bid_velocity'] = len(bids) / hours
                        except ValueError:
                            pass # skip velocity parsing if format is totally unexpected
                except Exception as e:
                    pass

    def predict_price(self, features_dict):
        """Predict final auction price (Regression)"""
        try:
            self._preprocess_features(features_dict)
            
            # Extract features in correct order matching scaler's feature names
            feature_values = [features_dict.get(col, 0) for col in FEATURE_COLUMNS]
            X = np.array([feature_values], dtype=np.float32)
            
            # Set feature names to avoid sklearn warning
            X_df = X.copy()
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            predicted_price = float(self.reg_model.predict(X_scaled)[0])
            
            # Ensure prediction is reasonable (minimum is starting price)
            starting_price = features_dict.get('starting_price', 0)
            current_bid = features_dict.get('current_bid', 0)
            predicted_price = max(predicted_price, current_bid)
            
            # Get feature importances
            importances = self.reg_model.feature_importances_
            top_features = self._get_top_features(importances, 3)
            
            return {
                'predicted_price': predicted_price,
                'top_features': top_features,
                'confidence': 'high' if predicted_price > 0 else 'low'
            }
        except Exception as e:
            return {'error': str(e)}
    
    def predict_win_probability(self, features_dict):
        """Predict win probability (Classification)"""
        try:
            self._preprocess_features(features_dict)
            
            # Extract features in correct order matching scaler's feature names
            feature_values = [features_dict.get(col, 0) for col in FEATURE_COLUMNS]
            X = np.array([feature_values], dtype=np.float32)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction = self.cls_model.predict(X_scaled)[0]
            probabilities = self.cls_model.predict_proba(X_scaled)[0]
            
            # Get feature importances
            importances = self.cls_model.feature_importances_
            top_features = self._get_top_features(importances, 3)
            
            # Normalize probabilities properly
            # probabilities[0] = low price, probabilities[1] = high price
            high_price_prob = float(probabilities[1]) if len(probabilities) > 1 else 0.5
            low_price_prob = float(probabilities[0]) if len(probabilities) > 0 else 0.5
            
            return {
                'win_probability': high_price_prob,
                'high_price_probability': high_price_prob,
                'low_price_probability': low_price_prob,
                'predicted_category': 'high_price' if prediction == 1 else 'low_price',
                'top_features': top_features
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _get_top_features(self, importances, top_n=3):
        """Get top N important features"""
        indices = np.argsort(importances)[-top_n:][::-1]
        top_features = []
        for idx in indices:
            top_features.append({
                'feature': FEATURE_COLUMNS[idx],
                'importance': float(importances[idx])
            })
        return top_features
    
    def full_analysis(self, features_dict):
        """Get full auction analysis with both price and win probability"""
        try:
            price_pred = self.predict_price(features_dict)
            win_pred = self.predict_win_probability(features_dict)
            
            # Combine results
            return {
                'price_prediction': price_pred,
                'win_probability': win_pred,
                'status': 'success'
            }
        except Exception as e:
            return {'error': str(e), 'status': 'error'}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing command', 'status': 'error'}))
        sys.exit(1)
    
    predictor = MLPredictor()
    
    if not predictor.is_loaded:
        sys.exit(1)
    
    command = sys.argv[1]
    
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Missing data', 'status': 'error'}))
        sys.exit(1)
    
    try:
        data = json.loads(sys.argv[2])
    except json.JSONDecodeError:
        print(json.dumps({'error': 'Invalid JSON data', 'status': 'error'}))
        sys.exit(1)
    
    if command == 'price':
        result = predictor.predict_price(data)
    elif command == 'win':
        result = predictor.predict_win_probability(data)
    elif command == 'analysis':
        result = predictor.full_analysis(data)
    else:
        result = {'error': 'Unknown command', 'status': 'error'}
    
    print(json.dumps(result))

if __name__ == '__main__':
    main()
