#!/usr/bin/env python3
"""Check model and scaler feature info"""
import joblib
import os

base_dir = os.path.dirname(os.path.abspath(__file__))

# Load models and scaler
price_model = joblib.load(os.path.join(base_dir, 'price_pred.pkl'))
cls_model = joblib.load(os.path.join(base_dir, 'classification.pkl'))
scaler = joblib.load(os.path.join(base_dir, 'feature_scaler.pkl'))

print("=" * 60)
print("PRICE MODEL (Regression)")
print("=" * 60)
print(f"Model type: {type(price_model)}")
print(f"Number of features: {price_model.n_features_in_}")
print(f"Feature names: {price_model.get_booster().feature_names if hasattr(price_model, 'get_booster') else 'N/A'}")

print("\n" + "=" * 60)
print("CLASSIFICATION MODEL")
print("=" * 60)
print(f"Model type: {type(cls_model)}")
print(f"Number of features: {cls_model.n_features_in_}")

print("\n" + "=" * 60)
print("SCALER")
print("=" * 60)
print(f"Scaler type: {type(scaler)}")
print(f"Number of features: {scaler.n_features_in_}")
if hasattr(scaler, 'feature_names_in_'):
    print(f"Feature names: {list(scaler.feature_names_in_)}")
