"""Regression metrics and helpers for interpreting the fitted linear model."""
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from . import config


def regression_metrics(y_true, y_pred):
    mse = mean_squared_error(y_true, y_pred)
    return {
        "MAE": mean_absolute_error(y_true, y_pred),
        "MSE": mse,
        "RMSE": float(np.sqrt(mse)),
        "R2": r2_score(y_true, y_pred),
    }


def linear_coefficients(pipeline):
    """Coefficients of a fitted linear pipeline, converted back to original feature units.

    Numeric features are standardised before fitting, so the raw coefficient is "marks per
    standard deviation". Dividing by the scaler's standard deviation gives "marks per unit"
    (for example marks per extra hour studied). Ordinal features are coded 0/1/2, so their
    coefficient is marks gained per step up; binary features are marks for the second category.
    """
    pre = pipeline.named_steps["preprocess"]
    model = pipeline.named_steps["model"]
    names = list(pre.get_feature_names_out())
    scale = pre.named_transformers_["num"].named_steps["scale"].scale_

    rows = []
    for i, (name, coef) in enumerate(zip(names, model.coef_)):
        if i < len(config.NUMERIC_FEATURES):
            feature, kind, per_unit = name, "numeric", coef / scale[i]
        elif name in config.ORDINAL_FEATURES:
            feature, kind, per_unit = name, "ordinal", coef
        else:
            feature = next(f for f in config.BINARY_FEATURES if name.startswith(f))
            kind, per_unit = "binary", coef
        rows.append({
            "Feature": feature,
            "Type": kind,
            "Model_Coefficient": coef,
            "Marks_Per_Unit": per_unit,
        })
    table = pd.DataFrame(rows)
    return table.reindex(table["Model_Coefficient"].abs().sort_values(ascending=False).index).reset_index(drop=True)
