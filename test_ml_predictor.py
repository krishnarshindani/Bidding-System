import subprocess
import json

data = {
    'starting_price': 150,
    'current_bid': 275,
    'bidders': 7,
    'total_bids': 8,
    'avg_increment': 15,
    'bid_velocity': 0.5,
    'auction_duration': 7380,
    'time_remaining': 7380
}

result = subprocess.run(
    ['python', r'mlPredictor.py', 'analysis', json.dumps(data)],
    cwd=r'C:\Users\rudvi\Downloads\New\bid-brilliance\server\services',
    capture_output=True,
    text=True
)

print("STDOUT:")
print(result.stdout)
if result.stderr:
    print('STDERR:', result.stderr)
print('Return code:', result.returncode)
