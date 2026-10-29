import { useState } from 'react'
import type { CSSProperties } from 'react'

import type { ModelInfo, Prediction, Schema, ScoreDistribution, StudentValues } from '@/lib/api'
import { formatMarks } from '@/lib/api'
import { groupTotals, nextSteps, percentBelow, position } from '@/lib/model'

// ------------------------------------------------------------------ score gauge

/** A point on the dial for a score from 0 to 100, at the given radius. */
function dial(score: number, radius: number): [number, number] {
  const angle = ((210 - (240 * score) / 100) * Math.PI) / 180
  return [130 + radius * Math.cos(angle), 140 - radius * Math.sin(angle)]
}

function Tick({ className, score }: { className: string; score: number }) {
  const [x1, y1] = dial(score, 92)
  const [x2, y2] = dial(score, 116)
  return <line className={className} x1={x1} y1={y1} x2={x2} y2={y2} />
}

export function ScoreGauge({ prediction, pinned }: { prediction: Prediction; pinned: number | null }) {
  const { score, baseline, clipped, raw_score } = prediction
  const difference = score - baseline
  const [labelX, labelY] = dial(baseline, 130)
  const arc = 'M39.93 192A104 104 0 1 1 220.07 192'

  return (
    <section className="ck-tile ck-s5">
      <h2>Predicted exam score</h2>
      <div className="ck-gauge">
        <svg viewBox="0 0 260 206" aria-hidden>
          <path className="trk" d={arc} />
          <path className="arc" d={arc} pathLength={100} style={{ strokeDasharray: `${score} 100` }} />
          <Tick className="avg" score={baseline} />
          {pinned !== null && <Tick className="pin" score={pinned} />}
          <text x="26" y="205" textAnchor="middle">
            0
          </text>
          <text x="234" y="205" textAnchor="middle">
            100
          </text>
          <text x={labelX} y={labelY} textAnchor="middle">
            avg {baseline.toFixed(1)}
          </text>
        </svg>
        <div className="ck-read" aria-live="polite">
          <b>{score.toFixed(1)}</b>
          <span>out of 100</span>
        </div>
      </div>
      <p className="ck-delta">
        {Math.abs(difference) < 0.05 ? (
          'The same as the average student'
        ) : (
          <>
            <b>{Math.abs(difference).toFixed(1)} marks</b> {difference > 0 ? 'above' : 'below'} the average student
          </>
        )}
      </p>
      <p className="ck-pinline">
        {pinned !== null && (
          <>
            Pinned at <b>{pinned.toFixed(1)}</b>, now <b>{formatMarks(score - pinned)}</b> marks
          </>
        )}
      </p>
      {clipped && (
        <p className="ck-clip">
          The model’s raw output was {raw_score.toFixed(1)}. It is shown limited to the valid 0–100 range.
        </p>
      )}
    </section>
  )
}

// ------------------------------------------------------------------ distribution

export function Distribution({ distribution, score }: { distribution: ScoreDistribution; score: number }) {
  const { start, counts, total } = distribution
  const tallest = Math.max(...counts)
  const index = Math.max(0, Math.min(counts.length - 1, Math.round(score) - start))
  const centre = (i: number) => `${((i + 0.5) / counts.length) * 100}%`
  const percent = percentBelow(distribution, score)
  const labels: number[] = []
  for (let v = start; v < start + counts.length; v += 10) labels.push(v)

  return (
    <section className="ck-tile ck-s7">
      <h2>
        Among all {total.toLocaleString()} students in the data <em>actual exam scores</em>
      </h2>
      <div className="ck-hist" role="img" aria-label="Histogram of the exam scores of every student in the dataset">
        {counts.map((n, i) => (
          <i
            key={i}
            className={i === index ? 'on' : i < index ? 'below' : ''}
            style={{ transform: `scaleY(${Math.max(n / tallest, 0.006)})` }}
          />
        ))}
        <span className="ck-flag" style={{ left: centre(index) }}>
          this student
        </span>
      </div>
      <div className="ck-axis">
        {labels.map((v) => (
          <span key={v} style={{ left: centre(v - start) }}>
            {v}
          </span>
        ))}
      </div>
      <p className="ck-say">
        {score < start ? (
          <>Lower than every student in the data. The lowest real score was {start}.</>
        ) : (
          <>
            Higher than <b>{percent >= 99.5 ? 'over 99' : percent < 1 ? 'under 1' : Math.round(percent)}%</b> of
            students. Almost everyone in the data scored between 60 and 75.
          </>
        )}
      </p>
    </section>
  )
}

// ------------------------------------------------------------------ how the score is built

const LOW = 40
const HIGH = 95
const PLOT_HEIGHT = 190
const scale = (v: number) => (Math.max(LOW, Math.min(HIGH, v)) - LOW) / (HIGH - LOW)

export function BuildChart({ schema, prediction }: { schema: Schema; prediction: Prediction }) {
  const [view, setView] = useState<'groups' | 'factors'>('groups')
  const { baseline, score, contributions } = prediction

  // Each column floats between the running total before and after its group.
  let running = baseline
  const columns = [{ kind: 'start', from: LOW, to: baseline, label: baseline.toFixed(1), marks: 0 }]
  for (const { marks } of groupTotals(schema, contributions)) {
    columns.push({ kind: '', from: running, to: running + marks, label: formatMarks(marks), marks })
    running += marks
  }
  columns.push({ kind: 'end', from: LOW, to: score, label: score.toFixed(1), marks: 0 })

  const strongest = [...contributions].sort((a, b) => Math.abs(b.marks) - Math.abs(a.marks)).slice(0, 10)

  return (
    <section className="ck-tile ck-s12">
      <h2>
        How the score is built
        <span className="ck-switch" role="group" aria-label="Level of detail">
          <button type="button" aria-pressed={view === 'groups'} onClick={() => setView('groups')}>
            By group
          </button>
          <button type="button" aria-pressed={view === 'factors'} onClick={() => setView('factors')}>
            By factor
          </button>
        </span>
      </h2>

      {view === 'groups' ? (
        <>
          <div className="ck-plot" style={{ '--avg': `${(1 - scale(baseline)) * 100}%` } as CSSProperties}>
            {columns.map((c, i) => {
              const low = scale(Math.min(c.from, c.to))
              const height = Math.max(scale(Math.max(c.from, c.to)) - low, 0.012)
              return (
                <div key={i} className={`ck-col ${c.kind} ${c.marks < 0 ? 'neg' : ''}`}>
                  <b style={{ transform: `translateY(${-low * 100}%) scaleY(${height})` }} />
                  <span style={{ transform: `translateY(${-(low + height) * PLOT_HEIGHT - 6}px)` }}>{c.label}</span>
                </div>
              )
            })}
          </div>
          <div className="ck-cols">
            <span>Average student</span>
            {schema.groups.map((g) => (
              <span key={g}>{g}</span>
            ))}
            <span>This student</span>
          </div>
        </>
      ) : (
        <div className="ck-rows">
          {strongest.map((c) => (
            <div key={c.name} className="ck-row">
              <span className="k">{c.label}</span>
              <div className="ck-track">
                <div
                  className={`ck-bar ${c.marks < 0 ? 'neg' : ''}`}
                  style={{ transform: `scaleX(${Math.max(-1, Math.min(1, c.marks / 5))})` }}
                />
              </div>
              <span className="v">{formatMarks(c.marks)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ------------------------------------------------------------------ profile radar

const AXES: [name: string, label: string][] = [
  ['Hours_Studied', 'Study hours'],
  ['Attendance', 'Attendance'],
  ['Previous_Scores', 'Previous score'],
  ['Tutoring_Sessions', 'Tutoring'],
  ['Motivation_Level', 'Motivation'],
  ['Access_to_Resources', 'Resources'],
  ['Parental_Involvement', 'Parents'],
  ['Teacher_Quality', 'Teaching'],
]

export function ProfileRadar({ schema, values }: { schema: Schema; values: StudentValues }) {
  const axes = AXES.flatMap(([name, label]) => {
    const feature = schema.features.find((f) => f.name === name)
    return feature ? [{ feature, label }] : []
  })
  const cx = 175
  const cy = 132
  const radius = 92
  const point = (i: number, t: number): [number, number] => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length
    return [cx + radius * t * Math.cos(angle), cy + radius * t * Math.sin(angle)]
  }
  // Every factor is put on a 0 to 1 scale so that different units can share one chart.
  const share = (i: number, at: number) => {
    const f = axes[i].feature
    const [low, high] = f.type === 'choice' ? [0, f.options.length - 1] : [f.min, f.max]
    return Math.max(0.04, Math.min(1, (at - low) / (high - low)))
  }
  const polygon = (at: (i: number) => number) =>
    axes.map((_, i) => point(i, share(i, at(i))).map((n) => n.toFixed(1)).join(',')).join(' ')

  return (
    <section className="ck-tile ck-s5">
      <h2>Profile against the average student</h2>
      <svg
        className="ck-radar"
        viewBox="0 0 350 270"
        role="img"
        aria-label="Radar chart comparing this student with the average student on eight factors"
      >
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <polygon key={t} className="web" points={axes.map((_, i) => point(i, t).join(',')).join(' ')} />
        ))}
        {axes.map(({ label }, i) => {
          const [x, y] = point(i, 1)
          const [tx, ty] = point(i, 1.2)
          return (
            <g key={label}>
              <line className="spoke" x1={cx} y1={cy} x2={x} y2={y} />
              <text x={tx} y={ty + 4} textAnchor={Math.abs(tx - cx) < 8 ? 'middle' : tx > cx ? 'start' : 'end'}>
                {label}
              </text>
            </g>
          )
        })}
        <polygon className="avgp" points={polygon((i) => axes[i].feature.average)} />
        <polygon className="me" points={polygon((i) => position(axes[i].feature, values[axes[i].feature.name]))} />
      </svg>
      <div className="ck-key">
        <span>
          <i />
          this student
        </span>
        <span>
          <i className="d" />
          average student
        </span>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------ next steps

interface StepsProps {
  schema: Schema
  values: StudentValues
  onApply: (name: string, value: number | string, group: string) => void
}

export function NextSteps({ schema, values, onApply }: StepsProps) {
  const steps = nextSteps(schema, values)
  return (
    <section className="ck-tile ck-s7">
      <h2>
        What would raise it most <em>one realistic step each</em>
      </h2>
      {steps.length === 0 ? (
        <p className="ck-none">This student is already at the top of every factor they can change.</p>
      ) : (
        steps.map((step) => (
          <div key={step.feature.name} className="ck-lever">
            <span>
              {step.label}
              <small>
                {step.feature.label}: {step.from} to {step.to}
              </small>
            </span>
            <div className="g">
              <i style={{ transform: `scaleX(${Math.min(1, step.gain / 2.2)})` }} />
            </div>
            <b>{formatMarks(step.gain)}</b>
            <button
              type="button"
              className="ck-chip"
              onClick={() => onApply(step.feature.name, step.to, step.feature.group)}
            >
              Apply
            </button>
          </div>
        ))
      )}
      <p className="ck-note">
        Worked out from the model’s weights. They describe patterns in the data, not proof that the change causes the
        gain.
      </p>
    </section>
  )
}

// ------------------------------------------------------------------ model accuracy

const SHORT_NAMES: Record<string, string> = { 'Ridge Regression': 'Ridge', 'Lasso Regression': 'Lasso' }

export function ModelStrip({ info }: { info: ModelInfo }) {
  const { test_metrics: m } = info
  const ranked = [...info.comparison].sort((a, b) => b.r2 - a.r2)
  return (
    <section className="ck-tile ck-s12 ck-model">
      <div className="ck-stats">
        <div>
          <b>{m.R2.toFixed(3)}</b>
          <span>R² on unseen students</span>
        </div>
        <div>
          <b>{m.MAE.toFixed(2)}</b>
          <span>average error, marks</span>
        </div>
        <div>
          <b>{m.RMSE.toFixed(2)}</b>
          <span>root mean squared error</span>
        </div>
      </div>
      <div className="ck-cmp" role="img" aria-label="Test R squared of the five models compared">
        {ranked.map((row) => (
          <div key={row.model} className={row.model === info.model ? 'best' : ''}>
            {SHORT_NAMES[row.model] ?? row.model}
            <i style={{ transform: `scaleX(${row.r2})` }} />
            <b>{row.r2.toFixed(3)}</b>
          </div>
        ))}
      </div>
    </section>
  )
}
