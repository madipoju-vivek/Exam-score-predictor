// Small calculations done in the browser from the weights the API publishes.
// The prediction shown to the user always comes from POST /api/predict; these helpers only
// answer "what if" questions around it (profile cards, next steps, the radar shape).
import type { Contribution, Feature, Schema, ScoreDistribution, StudentValues } from '@/lib/api'

/** A feature's value as a number: the value itself, or the position of the chosen option. */
export function position(feature: Feature, value: number | string): number {
  return feature.type === 'choice' ? feature.options.indexOf(value as string) : (value as number)
}

/** The same sum the model computes: the average student's score plus each factor's share. */
export function estimateScore(schema: Schema, values: StudentValues): number {
  const raw = schema.features.reduce(
    (total, f) => total + f.weight * (position(f, values[f.name]) - f.average),
    schema.baseline,
  )
  return Math.min(100, Math.max(0, raw))
}

export function matches(schema: Schema, a: StudentValues, b: StudentValues): boolean {
  return schema.features.every((f) => a[f.name] === b[f.name])
}

/** Marks added or removed by each group of factors, in the order the groups are listed. */
export function groupTotals(schema: Schema, contributions: Contribution[]) {
  const groupOf = new Map(schema.features.map((f) => [f.name, f.group]))
  return schema.groups.map((group) => ({
    group,
    marks: contributions.filter((c) => groupOf.get(c.name) === group).reduce((sum, c) => sum + c.marks, 0),
  }))
}

/** Share of students in the data who scored below `score`, as a percentage. */
export function percentBelow(distribution: ScoreDistribution, score: number): number {
  const below = distribution.counts.reduce((sum, n, i) => (distribution.start + i < score ? sum + n : sum), 0)
  return (below / distribution.total) * 100
}

// One realistic change per factor a student can influence.
const STEPS: [name: string, step: number, label: string][] = [
  ['Hours_Studied', 5, 'Study 5 more hours a week'],
  ['Attendance', 10, 'Attend 10% more classes'],
  ['Tutoring_Sessions', 2, 'Add 2 tutoring sessions a month'],
  ['Motivation_Level', 1, 'Raise motivation one level'],
  ['Extracurricular_Activities', 1, 'Join an extracurricular activity'],
  ['Physical_Activity', 2, 'Be active 2 more hours a week'],
]

export interface NextStep {
  feature: Feature
  label: string
  from: number | string
  to: number | string
  gain: number
}

/** The steps that would add the most marks, largest first. */
export function nextSteps(schema: Schema, values: StudentValues, limit = 4): NextStep[] {
  const steps: NextStep[] = []
  for (const [name, step, label] of STEPS) {
    const feature = schema.features.find((f) => f.name === name)
    if (!feature) continue
    const now = position(feature, values[name])
    const top = feature.type === 'choice' ? feature.options.length - 1 : feature.max
    const next = Math.min(top, now + step)
    const gain = feature.weight * (next - now)
    if (gain < 0.05) continue
    steps.push({
      feature,
      label,
      from: values[name],
      to: feature.type === 'choice' ? feature.options[next] : next,
      gain,
    })
  }
  return steps.sort((a, b) => b.gain - a.gain).slice(0, limit)
}
