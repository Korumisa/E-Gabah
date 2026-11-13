export type MetricCardData = {
  label: string
  value: string
  delta: string
  positive: boolean
  spark?: number[]
}

export type ActivityRow = {
  date: string
  type: string
  reference: string
  amount: string
  status: 'ok' | 'warn' | 'draft'
  actor: string
}

export type StockRow = {
  label: string
  value: string
  percent: number
  tone?: 'ok' | 'warn'
}

export type DashboardView = {
  title: string
  description: string
  metrics: MetricCardData[]
  chartTitle: string
  chartUnit: string
  chartSeries: { name: string; color: string; values: number[] }[]
  chartLabels: string[]
  activities: ActivityRow[]
  stockTitle: string
  stockRows: StockRow[]
}
