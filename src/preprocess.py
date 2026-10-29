"""Data loading, cleaning and the preprocessing transformer shared by all models."""
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler

from . import config


def load_raw_data(path=config.RAW_DATA):
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {path}. Place StudentPerformanceFactors.csv in the dataset/ folder."
        )
    return pd.read_csv(path)


def clean_data(df):
    """Remove records that cannot be valid; return the cleaned frame and a log of what changed.

    Missing values are NOT filled here. They are imputed inside the model pipeline so that
    the imputation values are learned from the training split only.
    """
    log = {"rows_before": len(df)}

    duplicates = int(df.duplicated().sum())
    df = df.drop_duplicates()
    log["duplicates_removed"] = duplicates

    # An exam score is a percentage, so anything outside 0-100 is a recording error.
    invalid = ~df[config.TARGET].between(0, 100)
    log["invalid_target_removed"] = int(invalid.sum())
    df = df.loc[~invalid].reset_index(drop=True)

    log["rows_after"] = len(df)
    log["missing_values"] = {c: int(n) for c, n in df.isna().sum().items() if n > 0}
    return df, log


def split_data(df):
    X = df[config.ALL_FEATURES]
    y = df[config.TARGET]
    return train_test_split(X, y, test_size=config.TEST_SIZE, random_state=config.RANDOM_STATE)


def build_preprocessor():
    """Impute, encode and scale. Fitted on training data only, inside each model pipeline."""
    numeric = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    ordinal = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("encode", OrdinalEncoder(categories=list(config.ORDINAL_FEATURES.values()))),
    ])
    binary = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("encode", OneHotEncoder(categories=list(config.BINARY_FEATURES.values()), drop="first")),
    ])
    return ColumnTransformer(
        [
            ("num", numeric, config.NUMERIC_FEATURES),
            ("ord", ordinal, list(config.ORDINAL_FEATURES)),
            ("bin", binary, list(config.BINARY_FEATURES)),
        ],
        verbose_feature_names_out=False,
    )
