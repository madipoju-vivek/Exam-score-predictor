# Exam Score Prediction Using Linear Regression

Predicts a student's final examination score (0–100) from previous scores, study hours, attendance and
16 other academic, family and lifestyle factors. Linear Regression is the main model; Ridge, Lasso,
Decision Tree and Random Forest are trained as comparison models. The model is served by a FastAPI
backend to a React web application.

## Results (test set, 1,322 students)

| Model             | MAE   | RMSE  | R²    |
|-------------------|-------|-------|-------|
| Linear Regression | 0.410 | 1.518 | 0.826 |
| Ridge Regression  | 0.411 | 1.518 | 0.826 |
| Lasso Regression  | 0.411 | 1.518 | 0.826 |
| Random Forest     | 1.009 | 1.887 | 0.731 |
| Decision Tree     | 1.446 | 2.298 | 0.601 |

## Folder structure

```
ML_Project/
├── dataset/      original CSV and the cleaned copy written by train.py
├── notebooks/    analysis.ipynb, the step-by-step analysis with outputs
├── src/          config, preprocess, train, evaluate, visualize, predict
├── models/       exam_score_model.pkl (saved Linear Regression pipeline)
├── results/      comparison tables, test predictions, error analysis, screenshots
├── graphs/       all figures
├── backend/      main.py, the FastAPI application (REST API)
├── frontend/     React + TypeScript web interface (src/ is the source, dist/ the built app)
└── requirements.txt
```

## Run the web application

Run every command from inside the `ML_Project` folder.

```bash
pip install -r requirements.txt
uvicorn backend.main:app
```

Then open http://localhost:8000. The backend serves the built frontend, so this one command starts
the whole application. The API documentation is at http://localhost:8000/docs.

## Deploy on Render

The repository is ready for Render's free tier. `render.yaml` describes one web service that installs
`backend/requirements.txt` (the runtime libraries only) and starts the API, which also serves
`frontend/dist`. No Node build runs on the host, so `frontend/dist` must be committed.

1. Push this folder to a GitHub repository, with `render.yaml` at the repository root.
2. In the Render dashboard choose **New > Blueprint** and select the repository.
3. Confirm the service. The first build takes a few minutes; the app is then at the
   `onrender.com` address Render shows.

A free service sleeps after about 15 minutes without visitors, and the next visit takes up to a
minute to wake it.

## Rebuild the model and the results

```bash
python -m src.train        # clean data, train the 5 models, save results and the model
python -m src.visualize    # generate all graphs and the error analysis
python -m src.predict      # predict for three new students
```

`src.train` must be run before the other two, because they load its outputs.

## Work on the frontend

Needs Node.js. Run these inside the `frontend` folder, with the backend already running.

```bash
npm install
npm run dev      # development server at http://localhost:5173, with live reload
npm run build    # rebuild frontend/dist after changing the source
```

`frontend/node_modules` is large and can be deleted before submitting; `npm install` recreates it.
The finished application needs only `frontend/dist`.

## API

| Endpoint          | Method | Returns                                                        |
|-------------------|--------|----------------------------------------------------------------|
| `/api/health`     | GET    | whether the service is running and which model is loaded       |
| `/api/schema`     | GET    | the 19 features with ranges, options, defaults, weights and average values; the presets; the average student's score |
| `/api/predict`    | POST   | the predicted score and each factor's contribution, in marks   |
| `/api/model-info` | GET    | test metrics, the five-model comparison and the distribution of exam scores in the data |

## Dataset

"Student Performance Factors", Kaggle, published by user lainguyn123:
https://www.kaggle.com/datasets/lainguyn123/student-performance-factors

6,607 students and 20 columns. The data are synthetic. One record with an exam score of 101 is removed
during cleaning; missing values in three categorical columns are imputed inside the model pipeline.
