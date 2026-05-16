#!/usr/bin/env python3
"""Quick test of ML predictor"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server', 'services'))

from mlPredictor import MLPredictor

predictor = MLPredictor()

if not predictor.is_loaded:
    print("Failed to load models!")
    sys.exit(1)

test_data = {
    'starting_price': 100,
    'current_bid': 450,
    'bidders': 5,
    'total_bids': 15,
    'avg_increment': 30,
    'bid_velocity': 2.0,
    'auction_duration': 120,
    'time_remaining': 50
}

print("Testing Price Prediction:")
result = predictor.predict_price(test_data)
print(result)

print("\nTesting Win Probability:")
result = predictor.predict_win_probability(test_data)
print(result)

print("\nTesting Full Analysis:")
result = predictor.full_analysis(test_data)
print(result)
