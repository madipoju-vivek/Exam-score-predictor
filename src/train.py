"""Train Linear Regression and the comparison models, evaluate them and save the final pipeline.

Run from the project root:  python -m src.train
"""
import json

import joblib
import pandas as pd
from sklearn.linear_model import Lasso, LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GridSearchCV, KFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeRegressor

from . import config
from .evaluate import linear_coefficients, regression_metrics
from .preprocess import build_preprocessor, clean_data, load_raw_data, split_data

# Each entry: estimator and the hyperparameter grid searched with cross-validation.
CANDIDATES = {
    "Linear Regression": (LinearRegression(), {}),
    "Ridge Regression": (Ridge(), {"model__alpha": [0.01, 0.1, 1, 10, 100]}),
    "Lasso Regression": (Lasso(max_iter=10000), {"model__alpha": [0.001, 0.01, 0.05, 0.1, 0.5]}),
    "Decision Tree": (
        DecisionTreeRegressor(random_state=config.RANDOM_STATE),
        {"model__max_depth": [4, 6, 8, 10], "model__min_samples_leaf": [5, 10, 20]},
    ),
    "Random Forest": (
        RandomForestRegressor(n_estimators=300, random_state=config.RANDOM_STATE, n_jobs=-1),
        {"model__max_depth": [10, 15, None], "model__min_samples_leaf": [1, 3, 5]},
    ),
}

# Feature subsets for the ablation study, all fitted with plain Linear Regression.
ABLATION_SETS = {
    "Previous_Scores only": ["Previous_Scores"],
    "Previous_Scores + Hours_Studied + Attendance": ["Previous_Scores", "Hours_Studied", "Attendance"],
    "All numeric features (6)": config.NUMERIC_FEATURES,
    "All features (19)": config.ALL_FEATURES,
}


def make_pipeline(estimator):
    return Pipeline([("preprocess", build_preprocessor()), ("model", estimator)])


def train_candidates(X_train, y_train, X_test, y_test):
    cv = KFold(n_splits=config.CV_FOLDS, shuffle=True, random_state=config.RANDOM_STATE)
    fitted, rows = {}, []
    for name, (estimator, grid) in CANDIDATES.items():
        pipeline = make_pipeline(estimator)
        if grid:
            search = GridSearchCV(pipeline, grid, cv=cv, scoring="r2", n_jobs=-1)
            search.fit(X_train, y_train)
            pipeline = search.best_estimator_
            params = {k.replace("model__", ""): v for k, v in search.best_params_.items()}
        else:
            pipeline.fit(X_train, y_train)
            params = {}
        cv_r2 = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="r2")
        train = regression_metrics(y_train, pipeline.predict(X_train))
        test = regression_metrics(y_test, pipeline.predict(X_test))
        fitted[name] = pipeline
        rows.append({
            "Model": name,
            "Best_Params": json.dumps(params) if params else "default",
            "CV_R2_Mean": cv_r2.mean(),
            "CV_R2_Std": cv_r2.std(),
            "Train_R2": train["R2"],
            "Test_MAE": test["MAE"],
            "Test_MSE": test["MSE"],
            "Test_RMSE": test["RMSE"],
            "Test_R2": test["R2"],
        })
        print(f"{name:<18} CV R2 {cv_r2.mean():.4f}  Test R2 {test['R2']:.4f}  RMSE {test['RMSE']:.4f}  {params}")
    return fitted, pd.DataFrame(rows)


def ablation_study(X_train, y_train, X_test, y_test):
    """How much of the score can Linear Regression explain from each group of features?"""
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import StandardScaler

    rows = []
    for label, features in ABLATION_SETS.items():
        if features == config.ALL_FEATURES:
            pipeline = make_pipeline(LinearRegression())
        else:
            pre = ColumnTransformer([("num", StandardScaler(), features)])
            pipeline = Pipeline([("preprocess", pre), ("model", LinearRegression())])
        pipeline.fit(X_train, y_train)
        m = regression_metrics(y_test, pipeline.predict(X_test))
        rows.append({"Feature_Set": label, "Test_MAE": m["MAE"], "Test_RMSE": m["RMSE"], "Test_R2": m["R2"]})
    return pd.DataFrame(rows)


def main():
    config.RESULTS_DIR.mkdir(exist_ok=True)
    config.MODEL_PATH.parent.mkdir(exist_ok=True)

    df, cleaning_log = clean_data(load_raw_data())
    df.to_csv(config.PROCESSED_DATA, index=False)
    X_train, X_test, y_train, y_test = split_data(df)
    print(f"Cleaned rows: {len(df)}  Train: {len(X_train)}  Test: {len(X_test)}\n")

    fitted, comparison = train_candidates(X_train, y_train, X_test, y_test)
    comparison.to_csv(config.RESULTS_DIR / "model_comparison.csv", index=False)

    ablation = ablation_study(X_train, y_train, X_test, y_test)
    ablation.to_csv(config.RESULTS_DIR / "feature_ablation.csv", index=False)

    final = fitted[config.FINAL_MODEL]
    joblib.dump(final, config.MODEL_PATH)

    coefficients = linear_coefficients(final)
    coefficients.to_csv(config.RESULTS_DIR / "linear_regression_coefficients.csv", index=False)

    # Test-set predictions of every model, used for the result graphs and prediction examples.
    predictions = X_test.copy()
    predictions["Actual_Exam_Score"] = y_test
    for name, pipeline in fitted.items():
        predictions[f"Pred_{name.replace(' ', '_')}"] = pipeline.predict(X_test)
    predictions.to_csv(config.RESULTS_DIR / "test_predictions.csv", index=False)

    lasso = fitted["Lasso Regression"].named_steps["model"]
    summary = {
        "cleaning": cleaning_log,
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "final_model": config.FINAL_MODEL,
        "intercept": float(final.named_steps["model"].intercept_),
        "final_test_metrics": regression_metrics(y_test, final.predict(X_test)),
        "final_train_metrics": regression_metrics(y_train, final.predict(X_train)),
        "lasso_features_zeroed": int((lasso.coef_ == 0).sum()),
    }
    with open(config.RESULTS_DIR / "metrics.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nSaved final model ({config.FINAL_MODEL}) to {config.MODEL_PATH.relative_to(config.ROOT)}")
    print("\nFeature ablation (Linear Regression):")
    print(ablation.round(4).to_string(index=False))


if __name__ == "__main__":
    main()
