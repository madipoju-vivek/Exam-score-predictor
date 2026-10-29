"""Central configuration: paths, column groups and experiment settings."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

RAW_DATA = ROOT / "dataset" / "StudentPerformanceFactors.csv"
PROCESSED_DATA = ROOT / "dataset" / "StudentPerformance_processed.csv"
MODEL_PATH = ROOT / "models" / "exam_score_model.pkl"
RESULTS_DIR = ROOT / "results"
GRAPHS_DIR = ROOT / "graphs"

TARGET = "Exam_Score"
TEST_SIZE = 0.20
RANDOM_STATE = 42
CV_FOLDS = 5

NUMERIC_FEATURES = [
    "Hours_Studied",
    "Attendance",
    "Sleep_Hours",
    "Previous_Scores",
    "Tutoring_Sessions",
    "Physical_Activity",
]

# Categories with a natural order, listed from lowest to highest level.
ORDINAL_FEATURES = {
    "Parental_Involvement": ["Low", "Medium", "High"],
    "Access_to_Resources": ["Low", "Medium", "High"],
    "Motivation_Level": ["Low", "Medium", "High"],
    "Family_Income": ["Low", "Medium", "High"],
    "Teacher_Quality": ["Low", "Medium", "High"],
    "Peer_Influence": ["Negative", "Neutral", "Positive"],
    "Parental_Education_Level": ["High School", "College", "Postgraduate"],
    "Distance_from_Home": ["Far", "Moderate", "Near"],
}

# Two-valued categories with no order; each becomes a single 0/1 column.
BINARY_FEATURES = {
    "Extracurricular_Activities": ["No", "Yes"],
    "Internet_Access": ["No", "Yes"],
    "School_Type": ["Public", "Private"],
    "Learning_Disabilities": ["No", "Yes"],
    "Gender": ["Female", "Male"],
}

ALL_FEATURES = NUMERIC_FEATURES + list(ORDINAL_FEATURES) + list(BINARY_FEATURES)

# The model whose pipeline is saved and served by the app.
FINAL_MODEL = "Linear Regression"
