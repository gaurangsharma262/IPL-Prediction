from flask import Flask, request, jsonify, render_template
import joblib
import random
import os

app = Flask(__name__)

# Load Model and Encoders safely
BASE_DIR = os.path.dirname(os.path.abspath(__name__))
try:
    model = joblib.load(os.path.join(BASE_DIR, 'model.pkl'))
    encoders = joblib.load(os.path.join(BASE_DIR, 'encoders.pkl'))
    y_encoder = joblib.load(os.path.join(BASE_DIR, 'target_encoder.pkl'))
    valid_teams = joblib.load(os.path.join(BASE_DIR, 'valid_teams.pkl'))
    venues = list(encoders['venue'].classes_)
except Exception as e:
    print("Warning: Model or encoders not found. Have you run model_builder.py?", e)
    valid_teams = []
    venues = []

@app.route('/')
def index():
    return render_template('index.html', teams=valid_teams, venues=venues)

@app.route('/predict_match', methods=['POST'])
def predict_match():
    data = request.json
    team1 = data.get('team1')
    team2 = data.get('team2')
    venue = data.get('venue')
    toss_winner = data.get('toss_winner')
    toss_decision = data.get('toss_decision')
    
    if not all([team1, team2, venue, toss_winner, toss_decision]):
        return jsonify({'error': 'Missing parameters'}), 400

    if team1 == team2:
         return jsonify({'error': 'Team 1 and Team 2 cannot be the same'}), 400

    try:
        # Encode inputs
        t1_encoded = encoders['team1'].transform([team1])[0]
        t2_encoded = encoders['team2'].transform([team2])[0]
        toss_w_encoded = encoders['toss_winner'].transform([toss_winner])[0]
        toss_d_encoded = encoders['toss_decision'].transform([toss_decision])[0]
        v_encoded = encoders['venue'].transform([venue])[0]

        # Predict
        features = [[t1_encoded, t2_encoded, toss_w_encoded, toss_d_encoded, v_encoded]]
        pred_prob = model.predict_proba(features)[0]
        
        # Determine probabilities for team1 and team2
        # Since pred_prob gives prob for all classes, we extract for the specific teams
        t1_class = y_encoder.transform([team1])[0]
        t2_class = y_encoder.transform([team2])[0]
        
        prob_t1 = pred_prob[t1_class]
        prob_t2 = pred_prob[t2_class]
        
        # Normalize between the two since they are the ones playing
        total = prob_t1 + prob_t2
        if total == 0:
            prob_t1, prob_t2 = 0.5, 0.5
        else:
            prob_t1, prob_t2 = prob_t1 / total, prob_t2 / total
            
        winner = team1 if prob_t1 > prob_t2 else team2

        return jsonify({
            'team1_prob': round(prob_t1 * 100, 2),
            'team2_prob': round(prob_t2 * 100, 2),
            'winner': winner
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/simulate_future', methods=['GET'])
def simulate_future():
    years_str = request.args.get('years', '10')
    try:
        years = int(years_str)
        if years > 50: years = 50
    except:
        years = 10

    # Base weights derived conceptually from historical success
    # Could be drawn from data, but fixed for simulation styling purpose
    team_weights = {
        'Chennai Super Kings': 18,
        'Mumbai Indians': 18,
        'Kolkata Knight Riders': 14,
        'Sunrisers Hyderabad': 10,
        'Rajasthan Royals': 9,
        'Gujarat Titans': 8,
        'Royal Challengers Bengaluru': 7,
        'Delhi Capitals': 6,
        'Punjab Kings': 5,
        'Lucknow Super Giants': 5
    }

    current_year = 2026
    simulations = []
    
    for _ in range(years):
        # Slightly alter weights over time to simulate eras of dominance shifting
        # Introduce randomness
        year_weights = []
        teams_list = []
        for team, weight in team_weights.items():
            luck_factor = random.uniform(0.5, 1.5)
            year_weights.append(weight * luck_factor)
            teams_list.append(team)
            
        winner = random.choices(teams_list, weights=year_weights, k=1)[0]
        runner_up = random.choices([t for t in teams_list if t != winner], k=1)[0]
        
        simulations.append({
            'year': current_year,
            'winner': winner,
            'runner_up': runner_up
        })
        current_year += 1
        
    return jsonify({'results': simulations})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
