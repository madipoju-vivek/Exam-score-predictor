"""Load the saved pipeline and predict the exam score of new, unseen students.

Run from the project root:  python -m src.predict
"""
import joblib
import pandas as pd

from . import config

# Three hypothetical students that do not appear in the dataset.
NEW_STUDENTS = [
    {
        "Profile": "Struggling student",
        "Hours_Studied": 8, "Attendance": 62, "Sleep_Hours": 5, "Previous_Scores": 55,
        "Tutoring_Sessions": 0, "Physical_Activity": 1,
        "Parental_Involvement": "Low", "Access_to_Resources": "Low", "Motivation_Level": "Low",
        "Family_Income": "Low", "Teacher_Quality": "Medium", "Peer_Influence": "Negative",
        "Parental_Education_Level": "High School", "Distance_from_Home": "Far",
        "Extracurricular_Activities": "No", "Internet_Access": "No", "School_Type": "Public",
        "Learning_Disabilities": "Yes", "Gender": "Male",
    },
    {
        "Profile": "Average student",
        "Hours_Studied": 20, "Attendance": 80, "Sleep_Hours": 7, "Previous_Scores": 75,
        "Tutoring_Sessions": 1, "Physical_Activity": 3,
        "Parental_Involvement": "Medium", "Access_to_Resources": "Medium", "Motivation_Level": "Medium",
        "Family_Income": "Medium", "Teacher_Quality": "Medium", "Peer_Influence": "Neutral",
        "Parental_Education_Level": "College", "Distance_from_Home": "Moderate",
        "Extracurricular_Activities": "Yes", "Internet_Access": "Yes", "School_Type": "Public",
        "Learning_Disabilities": "No", "Gender": "Female",
    },
    {
        "Profile": "High-effort student",
        "Hours_Studied": 34, "Attendance": 97, "Sleep_Hours": 8, "Previous_Scores": 92,
        "Tutoring_Sessions": 4, "Physical_Activity": 4,
        "Parental_Involvement": "High", "Access_to_Resources": "High", "Motivation_Level": "High",
        "Family_Income": "High", "Teacher_Quality": "High", "Peer_Influence": "Positive",
        "Parental_Education_Level": "Postgraduate", "Distance_from_Home": "Near",
        "Extracurricular_Activities": "Yes", "Internet_Access": "Yes", "School_Type": "Private",
        "Learning_Disabilities": "No", "Gender": "Female",
    },
]


def load_model(path=config.MODEL_PATH):
    if not path.exists():
        raise FileNotFoundError(f"Model not found at {path}. Run 'python -m src.train' first.")
    return joblib.load(path)


def predict_score(model, student):
    """Predict one student's score. `student` maps every feature name to a value."""
    row = pd.DataFrame([student])[config.ALL_FEATURES]
    return float(model.predict(row)[0])


def main():
    model = load_model()
    rows = []
    for student in NEW_STUDENTS:
        rows.append({**student, "Predicted_Exam_Score": round(predict_score(model, student), 2)})
    table = pd.DataFrame(rows)
    table.to_csv(config.RESULTS_DIR / "new_data_predictions.csv", index=False)
    print(table[["Profile", "Hours_Studied", "Attendance", "Previous_Scores", "Predicted_Exam_Score"]].to_string(index=False))


if __name__ == "__main__":
    main()
