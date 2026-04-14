import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

print("Loading data...")
try:
    df = pd.read_csv('IPL.zip', low_memory=False)
except FileNotFoundError:
    print("Error: IPL.zip not found")
    exit(1)

# Extract match level data (group by match_id)
print("Extracting match-level data...")
match_df = df.groupby('match_id').first().reset_index()
match_df = match_df[['batting_team', 'bowling_team', 'toss_winner', 'toss_decision', 'venue', 'match_won_by']]

# Drop rows with null values in crucial columns
match_df.dropna(inplace=True)

# Standardize Team Names
team_replacements = {
    'Delhi Daredevils': 'Delhi Capitals',
    'Deccan Chargers': 'Sunrisers Hyderabad',
    'Kings XI Punjab': 'Punjab Kings',
    'Rising Pune Supergiants': 'Rising Pune Supergiant',
    'Rising Pune Supergiant': 'Rising Pune Supergiant',
    'Pune Warriors': 'Pune Warriors', 
    'Gujarat Lions': 'Gujarat Titans', # Roughly associating them for simplicity
    'Royal Challengers Bangalore': 'Royal Challengers Bengaluru'
}
match_df.replace(team_replacements, inplace=True)

valid_teams = [
    'Chennai Super Kings', 'Delhi Capitals', 'Gujarat Titans', 
    'Kolkata Knight Riders', 'Lucknow Super Giants', 'Mumbai Indians', 
    'Punjab Kings', 'Rajasthan Royals', 'Royal Challengers Bengaluru', 
    'Sunrisers Hyderabad'
]

match_df = match_df[match_df['batting_team'].isin(valid_teams)]
match_df = match_df[match_df['bowling_team'].isin(valid_teams)]
match_df = match_df[match_df['match_won_by'].isin(valid_teams)]

match_df.rename(columns={'batting_team': 'team1', 'bowling_team': 'team2'}, inplace=True)

X = match_df[['team1', 'team2', 'toss_winner', 'toss_decision', 'venue']]
y = match_df['match_won_by']

# Encode categorical variables
encoders = {}
X_encoded = pd.DataFrame(index=X.index)
for col in X.columns:
    le = LabelEncoder()
    # Fit with valid teams for team-related columns
    if col in ['team1', 'team2', 'toss_winner']:
        le.fit(valid_teams)
    else:
        le.fit(X[col].astype(str))
    
    # Transform
    X_encoded[col] = le.transform(X[col].astype(str))
    encoders[col] = le

X = X_encoded

y_encoder = LabelEncoder()
y_encoder.fit(valid_teams)
y_encoded = y_encoder.transform(y)

print("Training RandomForest model...")
model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
model.fit(X, y_encoded)
score = model.score(X, y_encoded)
print(f"Model Training Accuracy: {score:.2f}")

print("Saving model and encoders...")
joblib.dump(model, 'model.pkl')
joblib.dump(encoders, 'encoders.pkl')
joblib.dump(y_encoder, 'target_encoder.pkl')
joblib.dump(valid_teams, 'valid_teams.pkl')

print("All done!")
