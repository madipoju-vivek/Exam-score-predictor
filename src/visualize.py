"""Generate every EDA and result graph, plus the residual and Lasso analyses.

Run after training, from the project root:  python -m src.visualize
"""
import json

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import Lasso
from sklearn.pipeline import Pipeline

from . import config
from .preprocess import build_preprocessor, clean_data, load_raw_data, split_data

NAVY, CORAL, TEAL, GREY = "#1F3A5F", "#D9603B", "#2A9D8F", "#8A94A3"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "axes.titlesize": 12,
    "axes.titleweight": "bold",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.color": "#E3E7EC",
    "grid.linewidth": 0.8,
    "axes.axisbelow": True,
    "figure.dpi": 100,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
})


def save(fig, name):
    fig.savefig(config.GRAPHS_DIR / name, facecolor="white")
    plt.close(fig)
    print("saved", name)


def label(name):
    return name.replace("_", " ")


def plot_target_distribution(raw):
    fig, ax = plt.subplots(figsize=(8, 4.2))
    scores = raw[config.TARGET]
    bins = np.arange(scores.min() - 0.5, scores.max() + 1.5, 1)
    ax.hist(scores, bins=bins, color=NAVY, edgecolor="white", linewidth=0.4)
    ax.axvline(scores.mean(), color=CORAL, linewidth=2, label=f"Mean = {scores.mean():.2f}")
    ax.axvspan(80, scores.max() + 0.5, color=CORAL, alpha=0.10)
    high = int((scores >= 80).sum())
    ax.text(90.5, ax.get_ylim()[1] * 0.55, f"{high} students score 80+\n({high / len(scores):.1%} of the data)",
            ha="center", color=CORAL, fontsize=9.5)
    ax.set(title="Distribution of Exam Score", xlabel="Exam score", ylabel="Number of students")
    ax.legend(frameon=False)
    save(fig, "01_exam_score_distribution.png")


def plot_missing_values(raw):
    missing = raw.isna().sum()
    missing = missing[missing > 0].sort_values()
    fig, ax = plt.subplots(figsize=(7, 2.8))
    bars = ax.barh([label(c) for c in missing.index], missing.values, color=NAVY, height=0.55)
    for bar, n in zip(bars, missing.values):
        ax.text(n + 1.5, bar.get_y() + bar.get_height() / 2, f"{n}  ({n / len(raw):.2%})", va="center", fontsize=9.5)
    ax.set(title="Missing Values by Column", xlabel="Number of missing records", xlim=(0, missing.max() * 1.3))
    ax.grid(axis="y", visible=False)
    save(fig, "02_missing_values.png")


def plot_numeric_relationships(df):
    fig, axes = plt.subplots(2, 3, figsize=(11, 6.4), sharey=True)
    for ax, col in zip(axes.ravel(), config.NUMERIC_FEATURES):
        rng = np.random.default_rng(0)
        jitter = rng.uniform(-0.3, 0.3, len(df))
        ax.scatter(df[col] + jitter, df[config.TARGET], s=5, alpha=0.18, color=NAVY, linewidths=0)
        slope, intercept = np.polyfit(df[col], df[config.TARGET], 1)
        xs = np.array([df[col].min(), df[col].max()])
        ax.plot(xs, slope * xs + intercept, color=CORAL, linewidth=2)
        r = df[col].corr(df[config.TARGET])
        ax.set_title(f"{label(col)}   (r = {r:+.2f})", fontsize=10.5)
        ax.set_xlabel(label(col))
    for ax in axes[:, 0]:
        ax.set_ylabel("Exam score")
    fig.suptitle("Numeric Features against Exam Score", fontweight="bold", fontsize=13, y=1.0)
    fig.tight_layout()
    save(fig, "03_numeric_vs_exam_score.png")


def plot_correlation_heatmap(df):
    cols = config.NUMERIC_FEATURES + [config.TARGET]
    corr = df[cols].corr()
    fig, ax = plt.subplots(figsize=(7, 5.8))
    im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(cols)), [label(c) for c in cols], rotation=40, ha="right")
    ax.set_yticks(range(len(cols)), [label(c) for c in cols])
    for i in range(len(cols)):
        for j in range(len(cols)):
            v = corr.iloc[i, j]
            ax.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=9,
                    color="white" if abs(v) > 0.5 else "#222222")
    ax.grid(False)
    for s in ax.spines.values():
        s.set_visible(False)
    fig.colorbar(im, ax=ax, shrink=0.8, label="Pearson correlation")
    ax.set_title("Correlation Heatmap of Numeric Features")
    save(fig, "04_correlation_heatmap.png")


def plot_categorical_effects(df):
    cats = {**config.ORDINAL_FEATURES, **config.BINARY_FEATURES}
    fig, axes = plt.subplots(3, 5, figsize=(13, 7.2), sharey=True)
    axes = axes.ravel()
    overall = df[config.TARGET].mean()
    for ax, (col, order) in zip(axes, cats.items()):
        means = df.groupby(col)[config.TARGET].mean().reindex(order)
        ax.axhline(overall, color=GREY, linewidth=1, linestyle="--")
        ax.plot(range(len(order)), means.values, color=NAVY, marker="o", markersize=7, linewidth=1.8)
        for x, m in enumerate(means.values):
            ax.text(x, m + 0.12, f"{m:.1f}", ha="center", fontsize=8.5)
        ax.set_xticks(range(len(order)), order, fontsize=8.5)
        ax.set_xlim(-0.5, len(order) - 0.5)
        ax.set_title(label(col), fontsize=10)
    for ax in axes[len(cats):]:
        ax.axis("off")
    for ax in axes[::5]:
        ax.set_ylabel("Mean exam score")
    axes[0].set_ylim(65.5, 69.2)
    fig.suptitle("Mean Exam Score by Category (dashed line = overall mean)", fontweight="bold", fontsize=13)
    fig.tight_layout()
    save(fig, "05_categorical_vs_exam_score.png")


def plot_model_comparison(comparison):
    comparison = comparison.sort_values("Test_R2", ascending=True)
    colors = [CORAL if m == config.FINAL_MODEL else NAVY for m in comparison["Model"]]
    fig, axes = plt.subplots(1, 2, figsize=(11, 3.8), sharey=True)
    for ax, col, title in zip(axes, ["Test_R2", "Test_RMSE"],
                              ["Test R² (higher is better)", "Test RMSE in marks (lower is better)"]):
        bars = ax.barh(comparison["Model"], comparison[col], color=colors, height=0.6)
        for bar, v in zip(bars, comparison[col]):
            ax.text(v + comparison[col].max() * 0.01, bar.get_y() + bar.get_height() / 2, f"{v:.3f}",
                    va="center", fontsize=9.5)
        ax.set_title(title, fontsize=11)
        ax.set_xlim(0, comparison[col].max() * 1.13)
        ax.grid(axis="y", visible=False)
    fig.suptitle("Model Comparison on the Held-out Test Set", fontweight="bold", fontsize=13)
    fig.tight_layout()
    save(fig, "06_model_comparison.png")


def plot_actual_vs_predicted(preds):
    actual, pred = preds["Actual_Exam_Score"], preds["Pred_Linear_Regression"]
    big = (actual - pred).abs() > 5
    fig, ax = plt.subplots(figsize=(6.4, 6))
    ax.scatter(actual[~big], pred[~big], s=14, alpha=0.45, color=NAVY, linewidths=0, label="Error within 5 marks")
    ax.scatter(actual[big], pred[big], s=26, color=CORAL, linewidths=0, label=f"Error above 5 marks ({big.sum()} students)")
    lims = [min(actual.min(), pred.min()) - 1, max(actual.max(), pred.max()) + 1]
    ax.plot(lims, lims, color=GREY, linestyle="--", linewidth=1.2, label="Perfect prediction")
    ax.set(xlim=lims, ylim=lims, xlabel="Actual exam score", ylabel="Predicted exam score",
           title="Linear Regression: Actual vs Predicted (test set)")
    ax.legend(frameon=False, loc="upper left")
    save(fig, "07_actual_vs_predicted.png")


def plot_residuals(preds):
    pred = preds["Pred_Linear_Regression"]
    resid = preds["Actual_Exam_Score"] - pred
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    axes[0].scatter(pred, resid, s=12, alpha=0.45, color=NAVY, linewidths=0)
    axes[0].axhline(0, color=CORAL, linewidth=1.5)
    axes[0].set(title="Residuals vs Predicted Score", xlabel="Predicted exam score", ylabel="Residual (actual − predicted)")
    core = resid[resid.abs() <= 5]
    axes[1].hist(core, bins=40, color=NAVY, edgecolor="white", linewidth=0.4)
    axes[1].set(title=f"Residual Distribution (the {len(core)} students within ±5 marks)",
                xlabel="Residual (marks)", ylabel="Number of students")
    fig.tight_layout()
    save(fig, "08_residual_analysis.png")


def plot_feature_effects(coefs, df):
    """Marks gained when a feature moves across its whole observed range, others held fixed."""
    rows = []
    for _, r in coefs.iterrows():
        if r["Type"] == "numeric":
            span = df[r["Feature"]].max() - df[r["Feature"]].min()
        elif r["Type"] == "ordinal":
            span = 2
        else:
            span = 1
        rows.append((r["Feature"], r["Marks_Per_Unit"] * span))
    effects = pd.DataFrame(rows, columns=["Feature", "Effect"]).sort_values("Effect", key=abs)
    fig, ax = plt.subplots(figsize=(8, 6.2))
    colors = [TEAL if v >= 0 else CORAL for v in effects["Effect"]]
    bars = ax.barh([label(f) for f in effects["Feature"]], effects["Effect"], color=colors, height=0.65)
    for bar, v in zip(bars, effects["Effect"]):
        ax.text(v + (0.15 if v >= 0 else -0.15), bar.get_y() + bar.get_height() / 2, f"{v:+.2f}",
                va="center", ha="left" if v >= 0 else "right", fontsize=9)
    ax.axvline(0, color="#444444", linewidth=0.8)
    ax.set_xlim(effects["Effect"].min() - 1.6, effects["Effect"].max() + 1.6)
    ax.set(title="Linear Regression: Effect of Each Feature on Exam Score",
           xlabel="Change in predicted marks from lowest to highest value of the feature")
    ax.grid(axis="y", visible=False)
    save(fig, "09_feature_effects.png")
    return effects.sort_values("Effect", key=abs, ascending=False)


def plot_ablation(ablation):
    fig, ax = plt.subplots(figsize=(8, 3.4))
    labels = ["Previous Scores\nonly", "+ Hours Studied\n+ Attendance", "All 6 numeric\nfeatures", "All 19\nfeatures"]
    bars = ax.bar(labels, ablation["Test_R2"], color=[GREY, NAVY, NAVY, CORAL], width=0.6)
    for bar, v in zip(bars, ablation["Test_R2"]):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 0.015, f"{v:.3f}", ha="center", fontsize=10, fontweight="bold")
    ax.set(title="How Much Each Group of Features Adds (Linear Regression)", ylabel="Test R²", ylim=(0, 0.95))
    ax.grid(axis="x", visible=False)
    save(fig, "10_feature_ablation.png")


def lasso_path(X_train, y_train):
    """Refit Lasso over a range of penalties to see which features are dropped first."""
    alphas = [0.001, 0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1.0]
    records = {}
    for a in alphas:
        pipe = Pipeline([("preprocess", build_preprocessor()), ("model", Lasso(alpha=a, max_iter=10000))])
        pipe.fit(X_train, y_train)
        names = [n.rsplit("_", 1)[0] if n.rsplit("_", 1)[0] in config.BINARY_FEATURES else n
                 for n in pipe.named_steps["preprocess"].get_feature_names_out()]
        records[a] = pd.Series(pipe.named_steps["model"].coef_, index=names)
    path = pd.DataFrame(records)

    fig, ax = plt.subplots(figsize=(9, 4.8))
    strongest = path[alphas[0]].abs().sort_values(ascending=False).index
    palette = plt.cm.tab10.colors
    for i, feat in enumerate(strongest):
        top = i < 6
        ax.plot(alphas, path.loc[feat], marker="o", markersize=3.5,
                linewidth=2 if top else 1, color=palette[i] if top else "#C3C9D1",
                label=label(feat) if top else None, zorder=3 if top else 2)
    ax.set_xscale("log")
    ax.axhline(0, color="#444444", linewidth=0.8)
    ax.set(title="Lasso Coefficient Path: Weak Features Shrink to Zero First",
           xlabel="Regularisation strength α (log scale)", ylabel="Coefficient")
    ax.legend(frameon=False, fontsize=8.5, ncol=2, title="Six strongest features (others in grey)")
    save(fig, "11_lasso_coefficient_path.png")

    dropped = {str(a): sorted(path.index[path[a] == 0]) for a in alphas}
    return dropped


def residual_summary(preds, y_train_pred_error):
    resid = preds["Actual_Exam_Score"] - preds["Pred_Linear_Regression"]
    big = resid.abs() > 5
    core = resid[~big]
    return {
        "test_rows": int(len(resid)),
        "test_errors_above_5": int(big.sum()),
        "test_share_within_1_mark": float((resid.abs() <= 1).mean()),
        "test_share_within_2_marks": float((resid.abs() <= 2).mean()),
        "test_mae_excluding_large_errors": float(core.abs().mean()),
        "test_rmse_excluding_large_errors": float(np.sqrt((core ** 2).mean())),
        "test_largest_error": float(resid.abs().max()),
        "train_rows": int(len(y_train_pred_error)),
        "train_errors_above_5": int((y_train_pred_error.abs() > 5).sum()),
        "train_largest_error": float(y_train_pred_error.abs().max()),
    }


def main():
    config.GRAPHS_DIR.mkdir(exist_ok=True)
    raw = load_raw_data()
    df, _ = clean_data(raw)
    X_train, X_test, y_train, y_test = split_data(df)

    comparison = pd.read_csv(config.RESULTS_DIR / "model_comparison.csv")
    ablation = pd.read_csv(config.RESULTS_DIR / "feature_ablation.csv")
    coefs = pd.read_csv(config.RESULTS_DIR / "linear_regression_coefficients.csv")
    preds = pd.read_csv(config.RESULTS_DIR / "test_predictions.csv")
    model = joblib.load(config.MODEL_PATH)

    plot_target_distribution(raw)
    plot_missing_values(raw)
    plot_numeric_relationships(df)
    plot_correlation_heatmap(df)
    plot_categorical_effects(df)
    plot_model_comparison(comparison)
    plot_actual_vs_predicted(preds)
    plot_residuals(preds)
    effects = plot_feature_effects(coefs, df)
    plot_ablation(ablation)
    dropped = lasso_path(X_train, y_train)

    effects.to_csv(config.RESULTS_DIR / "feature_effects_full_range.csv", index=False)
    analysis = {
        "residuals": residual_summary(preds, y_train - model.predict(X_train)),
        "lasso_features_dropped_by_alpha": dropped,
    }
    with open(config.RESULTS_DIR / "error_analysis.json", "w") as f:
        json.dump(analysis, f, indent=2)
    print(json.dumps(analysis, indent=2))


if __name__ == "__main__":
    main()
