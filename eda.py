import pandas as pd

try:
    df = pd.read_csv('e:/vs_code/IPL_Prediction/IPL.zip', low_memory=False)
    print("Total rows:", len(df))
    print("Min Year:", df["year"].min())
    print("Max Year:", df["year"].max())
    print("Teams:", df["batting_team"].unique())
except Exception as e:
    print("Error:", e)
