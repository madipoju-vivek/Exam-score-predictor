import type { CSSProperties } from 'react'

import type { ChoiceFeature, Contribution, NumberFeature, Schema, StudentValues } from '@/lib/api'
import { formatMarks } from '@/lib/api'
import { groupTotals } from '@/lib/model'

interface Props {
  schema: Schema
  values: StudentValues
  contributions: Contribution[]
  tab: string
  pinned: boolean
  onTab: (group: string) => void
  onChange: (name: string, value: number | string) => void
  onPin: () => void
  onReset: () => void
}

const tone = (marks: number) => (Math.abs(marks) < 0.05 ? '' : marks > 0 ? 'up' : 'down')

export function StudentPanel({ schema, values, contributions, tab, pinned, onTab, onChange, onPin, onReset }: Props) {
  const marks = new Map(contributions.map((c) => [c.name, c.marks]))
  const totals = groupTotals(schema, contributions)

  return (
    <section className="ck-tile ck-student">
      <h2>
        The student <em>{schema.features.length} factors</em>
      </h2>

      <div className="ck-tabs" role="tablist" aria-label="Groups of factors">
        {totals.map(({ group, marks: total }) => (
          <button key={group} type="button" role="tab" aria-selected={group === tab} onClick={() => onTab(group)}>
            {group}
            <b className={tone(total)}>{formatMarks(total)}</b>
          </button>
        ))}
      </div>

      <div className="ck-panel" role="tabpanel" aria-label={tab}>
        {schema.features
          .filter((f) => f.group === tab)
          .map((feature) =>
            feature.type === 'number' ? (
              <NumberField
                key={feature.name}
                feature={feature}
                value={values[feature.name] as number}
                marks={marks.get(feature.name) ?? 0}
                onChange={(v) => onChange(feature.name, v)}
              />
            ) : (
              <ChoiceField
                key={feature.name}
                feature={feature}
                value={values[feature.name] as string}
                marks={marks.get(feature.name) ?? 0}
                onChange={(v) => onChange(feature.name, v)}
              />
            ),
          )}
      </div>

      <div className="ck-foot">
        <button type="button" className="ck-chip" aria-pressed={pinned} onClick={onPin}>
          {pinned ? 'Unpin' : 'Pin to compare'}
        </button>
        <button type="button" className="ck-chip" onClick={onReset}>
          Reset
        </button>
      </div>
    </section>
  )
}

interface FieldProps<F, V> {
  feature: F
  value: V
  marks: number
  onChange: (value: V) => void
}

function NumberField({ feature, value, marks, onChange }: FieldProps<NumberFeature, number>) {
  const id = `ck-${feature.name}`
  const filled = ((value - feature.min) / (feature.max - feature.min)) * 100
  return (
    <div className="ck-field">
      <div className="ck-field-top">
        <label htmlFor={id}>{feature.label}</label>
        <span className="ck-val">
          {value} <small>{feature.unit}</small>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={feature.min}
        max={feature.max}
        step={1}
        value={value}
        style={{ '--p': `${filled}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="ck-field-top" style={{ marginTop: -2 }}>
        <span className="ck-range-note">
          {feature.min} to {feature.max}
        </span>
        <span className="ck-eff">{formatMarks(marks)}</span>
      </div>
    </div>
  )
}

function ChoiceField({ feature, value, marks, onChange }: FieldProps<ChoiceFeature, string>) {
  return (
    <div className="ck-field">
      <div className="ck-field-top">
        <span className="l">{feature.label}</span>
        <span className="ck-eff">{formatMarks(marks)}</span>
      </div>
      <div className="ck-opts" role="group" aria-label={feature.label}>
        {feature.options.map((option) => (
          <button key={option} type="button" aria-pressed={option === value} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
