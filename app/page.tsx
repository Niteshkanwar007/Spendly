'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Edit3,
  FileText,
  Home,
  MoreHorizontal,
  PieChart,
  Plus,
  Receipt,
  Settings,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'

type Tab = 'today' | 'history' | 'reports' | 'settings'
type Expense = {
  id: number
  amount: number
  description: string
  category?: string
  expenseDate: string
}

const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Travel', 'Other']
const initialExpenses: Expense[] = []

const currency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const readableDate = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const startOfWeek = (date: Date, firstDay = 1) => {
  const day = date.getDay()
  const offset = (day - firstDay + 7) % 7
  return addDays(startOfDay(date), -offset)
}

function calculatePeriod(expenses: Expense[], start: Date, endExclusive: Date) {
  const startKey = dateKey(start)
  const endKey = dateKey(endExclusive)
  const items = expenses.filter((expense) => expense.expenseDate >= startKey && expense.expenseDate < endKey)
  const total = items.reduce((sum, expense) => sum + expense.amount, 0)
  return { items, total, count: items.length, averageExpense: items.length ? total / items.length : 0 }
}

function compareWeeks(currentTotal: number, previousTotal: number) {
  if (previousTotal === 0) return null
  const difference = currentTotal - previousTotal
  return { difference, percentage: (difference / previousTotal) * 100 }
}

function getWeekDayTotals(expenses: Expense[], weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const key = dateKey(date)
    const total = expenses.filter((expense) => expense.expenseDate === key).reduce((sum, expense) => sum + expense.amount, 0)
    return { date, total }
  })
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthStart(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function monthLabel(key: string) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthStart(key))
}

function calculateMonthlyReport(expenses: Expense[], selectedKey: string, today: Date) {
  const start = monthStart(selectedKey)
  const nextStart = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const isCurrent = selectedKey === monthKey(today)
  const elapsedDays = isCurrent ? today.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const items = expenses.filter((expense) => expense.expenseDate >= dateKey(start) && expense.expenseDate < dateKey(nextStart))
  const total = items.reduce((sum, expense) => sum + expense.amount, 0)
  const byCategory = new Map<string, number>()
  items.forEach((expense) => {
    const category = expense.category || 'Other'
    byCategory.set(category, (byCategory.get(category) ?? 0) + expense.amount)
  })
  const categories = [...byCategory.entries()].map(([name, amount]) => ({ name, amount, percentage: total ? (amount / total) * 100 : 0 })).sort((a, b) => b.amount - a.amount)
  const dayTotals = new Map<string, number>()
  items.forEach((expense) => dayTotals.set(expense.expenseDate, (dayTotals.get(expense.expenseDate) ?? 0) + expense.amount))
  const spendingDays = [...dayTotals.entries()].map(([key, amount]) => ({ date: new Date(`${key}T12:00:00`), amount })).sort((a, b) => b.amount - a.amount)
  const previousKey = monthKey(new Date(start.getFullYear(), start.getMonth() - 1, 1))
  return { items, total, categories, highestCategory: categories[0] ?? null, highestDay: spendingDays[0] ?? null, lowestDay: spendingDays.at(-1) ?? null, averageDaily: total / elapsedDays, projected: isCurrent ? (total / elapsedDays) * daysInMonth : null, previousKey, daysInMonth, isCurrent }
}

function monthComparison(currentTotal: number, previousTotal: number) {
  if (previousTotal === 0) return null
  const difference = currentTotal - previousTotal
  return { difference, percentage: Math.abs((difference / previousTotal) * 100) }
}

type InsightOpportunity = { name: string; amount: number; reduction: number; saving: number; reason: string }

function normalizedDescription(description: string) {
  return description.trim().toLocaleLowerCase()
}

function calculateInsights(report: ReturnType<typeof calculateMonthlyReport>, previous: ReturnType<typeof calculateMonthlyReport>) {
  const categoryMap = new Map(previous.categories.map((category) => [category.name, category.amount]))
  const categoryChanges = report.categories.flatMap((category) => {
    const previousAmount = categoryMap.get(category.name) ?? 0
    if (!previousAmount) return []
    const change = ((category.amount - previousAmount) / previousAmount) * 100
    if (change >= 20) return [{ type: 'increase' as const, name: category.name, amount: category.amount - previousAmount, percentage: change }]
    if (change <= -20) return [{ type: 'decrease' as const, name: category.name, amount: previousAmount - category.amount, percentage: Math.abs(change) }]
    return []
  })
  const descriptions = new Map<string, { name: string; items: Expense[] }>()
  report.items.forEach((item) => {
    const key = normalizedDescription(item.description)
    const group = descriptions.get(key) ?? { name: item.description.trim(), items: [] }
    group.items.push(item)
    descriptions.set(key, group)
  })
  const repeated = [...descriptions.values()].filter((group) => group.items.length >= 4).map((group) => ({ ...group, total: group.items.reduce((sum, item) => sum + item.amount, 0), average: group.items.reduce((sum, item) => sum + item.amount, 0) / group.items.length })).sort((a, b) => b.total - a.total)
  const opportunities: InsightOpportunity[] = []
  if (report.highestCategory) opportunities.push({ name: report.highestCategory.name, amount: report.highestCategory.amount, reduction: 20, saving: report.highestCategory.amount * 0.2, reason: 'highest spending category' })
  report.categories.slice(1, 3).forEach((category) => opportunities.push({ name: category.name, amount: category.amount, reduction: 15, saving: category.amount * 0.15, reason: 'another meaningful category' }))
  repeated.slice(0, 2).forEach((group) => opportunities.push({ name: group.name, amount: group.total, reduction: 30, saving: group.total * 0.3, reason: `${group.items.length} repeated purchases` }))
  const dailyAverage = report.averageDaily
  const highDayRatio = report.highestDay && dailyAverage ? report.highestDay.amount / dailyAverage : 0
  const weekend = report.items.filter((item) => [0, 6].includes(new Date(`${item.expenseDate}T12:00:00`).getDay())).reduce((sum, item) => sum + item.amount, 0)
  const weekdays = report.items.filter((item) => ![0, 6].includes(new Date(`${item.expenseDate}T12:00:00`).getDay())).reduce((sum, item) => sum + item.amount, 0)
  const weekendDays = new Set(report.items.filter((item) => [0, 6].includes(new Date(`${item.expenseDate}T12:00:00`).getDay())).map((item) => item.expenseDate)).size
  const weekdayDays = new Set(report.items.filter((item) => ![0, 6].includes(new Date(`${item.expenseDate}T12:00:00`).getDay())).map((item) => item.expenseDate)).size
  const smallAccumulation = repeated.find((group) => group.items.length >= 5 && report.total > 0 && group.total >= report.total * 0.05)
  return { categoryChanges, repeated, opportunities: opportunities.sort((a, b) => b.saving - a.saving).slice(0, 3), highDayRatio, weekendAverage: weekendDays ? weekend / weekendDays : 0, weekdayAverage: weekdayDays ? weekdays / weekdayDays : 0, smallAccumulation }
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const today = new Date()
  const currentMonthKey = monthKey(today)
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey)

  const todayKey = dateKey(today)
  const todayStart = startOfDay(today)
  const tomorrowStart = addDays(todayStart, 1)
  const yesterdayStart = addDays(todayStart, -1)
  const currentWeekStart = startOfWeek(today)
  const currentWeekEnd = addDays(currentWeekStart, 7)
  const previousWeekStart = addDays(currentWeekStart, -7)
  const todayPeriod = calculatePeriod(expenses, todayStart, tomorrowStart)
  const yesterdayPeriod = calculatePeriod(expenses, yesterdayStart, todayStart)
  const currentWeek = calculatePeriod(expenses, currentWeekStart, currentWeekEnd)
  const previousWeek = calculatePeriod(expenses, previousWeekStart, currentWeekStart)
  const elapsedDays = Math.floor((todayStart.getTime() - currentWeekStart.getTime()) / 86400000) + 1
  const dailyAverage = currentWeek.total / elapsedDays
  const weekComparison = compareWeeks(currentWeek.total, previousWeek.total)
  const weekDayTotals = getWeekDayTotals(expenses, currentWeekStart)
  const spendingDays = weekDayTotals.filter((day) => day.total > 0)
  const highestDay = spendingDays.length ? spendingDays.reduce((highest, day) => day.total > highest.total ? day : highest) : null
  const lowestDay = spendingDays.length ? spendingDays.reduce((lowest, day) => day.total < lowest.total ? day : lowest) : null
  const todayExpenses = todayPeriod.items
  const todayTotal = todayPeriod.total

  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, Expense[]>()
    expenses.forEach((expense) => groups.set(expense.expenseDate, [...(groups.get(expense.expenseDate) ?? []), expense]))
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [expenses])

  function saveExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    const description = String(form.get('description') ?? '').trim()
    const category = String(form.get('category') ?? '')
    if (!amount || amount <= 0 || !description) return

    const expense: Expense = {
      id: editing?.id ?? Date.now(),
      amount,
      description,
      category: category || undefined,
      expenseDate: editing?.expenseDate ?? todayKey,
    }
    setExpenses((current) => editing ? current.map((item) => item.id === editing.id ? expense : item) : [expense, ...current])
    setEditing(null)
    setShowForm(false)
    setActiveTab('today')
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    setShowForm(true)
  }

  function deleteExpense(id: number) {
    setExpenses((current) => current.filter((expense) => expense.id !== id))
    setSelectedDate(null)
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="brand-mark"><WalletCards aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">PERSONAL EXPENSES</p>
            <h1>Spendly</h1>
          </div>
          <button className="icon-button" aria-label="More options"><MoreHorizontal aria-hidden="true" /></button>
        </header>

        <section className="content" aria-live="polite">
          {activeTab === 'today' && (
            <>
              <div className="welcome-row">
                <div>
                  <p className="eyebrow">TODAY</p>
                  <h2>{readableDate(today)}</h2>
                </div>
                <div className="date-chip"><CalendarDays aria-hidden="true" /></div>
              </div>
              <section className="total-card">
                <div>
                  <p className="card-label">Today&apos;s spending</p>
                  <p className="total-amount">{currency(todayTotal)}</p>
                </div>
                <div className="total-icon"><Receipt aria-hidden="true" /></div>
              </section>
              <section className="metric-grid" aria-label="Spending summary">
                <div className="metric-card"><span>This week</span><strong>{currency(currentWeek.total)}</strong></div>
                <div className="metric-card"><span>Daily average</span><strong>{currency(dailyAverage)}</strong></div>
              </section>
              {weekComparison && <p className={`comparison ${weekComparison.difference >= 0 ? 'up' : 'down'}`}>{weekComparison.difference >= 0 ? '↑' : '↓'} {Math.abs(weekComparison.percentage).toFixed(0)}% from last week</p>}
              <div className="section-heading"><h3>Today&apos;s expenses</h3><span>{todayExpenses.length} {todayExpenses.length === 1 ? 'entry' : 'entries'}</span></div>
              {todayExpenses.length === 0 ? <EmptyState onAdd={() => setShowForm(true)} /> : <ExpenseList expenses={todayExpenses} onEdit={openEdit} onDelete={deleteExpense} />}
            </>
          )}

          {activeTab === 'history' && (
            <>
              <div className="page-heading"><p className="eyebrow">YOUR RECORDS</p><h2>History</h2><p className="subheading">Every expense, organized by day.</p></div>
              {groupedExpenses.length === 0 ? <EmptyState onAdd={() => setShowForm(true)} /> : groupedExpenses.map(([date, items]) => <DateGroup key={date} date={date} expenses={items} onOpen={() => setSelectedDate(date)} />)}
            </>
          )}

          {activeTab === 'reports' && <MonthlyReport expenses={expenses} selectedMonthKey={selectedMonthKey} currentMonthKey={currentMonthKey} today={today} onMonthChange={setSelectedMonthKey} onAdd={() => setShowForm(true)} />}

          {activeTab === 'settings' && <SettingsView />}
        </section>

        <button className="add-button" onClick={() => { setEditing(null); setShowForm(true) }}><Plus aria-hidden="true" /> Add expense</button>
        <nav className="bottom-nav" aria-label="Main navigation">
          {([['today', Home, 'Today'], ['history', FileText, 'History'], ['reports', PieChart, 'Reports'], ['settings', Settings, 'Settings']] as const).map(([tab, Icon, label]) => <button key={tab} className={activeTab === tab ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(tab)}><Icon aria-hidden="true" /><span>{label}</span></button>)}
        </nav>
      </div>

      {showForm && <ExpenseForm editing={editing} onClose={() => { setShowForm(false); setEditing(null) }} onSave={saveExpense} />}
      {selectedDate && <DateDetails date={selectedDate} expenses={expenses.filter((expense) => expense.expenseDate === selectedDate)} onClose={() => setSelectedDate(null)} onEdit={openEdit} onDelete={deleteExpense} />}
    </main>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Receipt aria-hidden="true" /></div><h3>Nothing recorded yet</h3><p>Keep your first entry simple. Add an expense as you go.</p><button className="text-button" onClick={onAdd}>Add your first expense <ChevronRight aria-hidden="true" /></button></div>
}

function ExpenseList({ expenses, onEdit, onDelete }: { expenses: Expense[]; onEdit: (expense: Expense) => void; onDelete: (id: number) => void }) {
  return <div className="expense-list">{expenses.map((expense) => <article className="expense-row" key={expense.id}><div className="expense-symbol"><Receipt aria-hidden="true" /></div><div className="expense-copy"><strong>{expense.description}</strong>{expense.category && <span>{expense.category}</span>}</div><div className="expense-actions"><strong>{currency(expense.amount)}</strong><button aria-label={`Edit ${expense.description}`} onClick={() => onEdit(expense)}><Edit3 aria-hidden="true" /></button><button aria-label={`Delete ${expense.description}`} onClick={() => onDelete(expense.id)}><Trash2 aria-hidden="true" /></button></div></article>)}</div>
}

function DateGroup({ date, expenses, onOpen }: { date: string; expenses: Expense[]; onOpen: () => void }) {
  return <button className="date-group" onClick={onOpen}><div className="date-group-heading"><div><p>{new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00`))}</p><span>{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}</span></div><strong>{currency(expenses.reduce((sum, item) => sum + item.amount, 0))}</strong><ChevronRight aria-hidden="true" /></div>{expenses.slice(0, 3).map((expense) => <div className="mini-expense" key={expense.id}><span>{expense.description}</span><strong>{currency(expense.amount)}</strong></div>)}</button>
}

function ExpenseForm({ editing, onClose, onSave }: { editing: Expense | null; onClose: () => void; onSave: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="expense-title"><div className="modal-heading"><div><p className="eyebrow">{editing ? 'UPDATE ENTRY' : 'NEW ENTRY'}</p><h2 id="expense-title">{editing ? 'Edit expense' : 'Add expense'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button></div><form onSubmit={onSave}><label>Amount<div className="amount-input"><span>₹</span><input name="amount" type="number" min="1" step="0.01" defaultValue={editing?.amount} placeholder="0" required autoFocus /></div></label><label>What did you spend it on?<input name="description" defaultValue={editing?.description} placeholder="e.g. Lunch, cab, groceries" required /></label><label>Category <span className="optional">Optional</span><select name="category" defaultValue={editing?.category ?? ''}><option value="">Choose a category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><p className="date-note"><CalendarDays aria-hidden="true" /> {editing ? 'Recorded on ' : 'Automatically recorded for '}{new Intl.DateTimeFormat('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${editing?.expenseDate ?? dateKey(new Date())}T12:00:00`))}</p><button className="save-button" type="submit"><Check aria-hidden="true" /> {editing ? 'Save changes' : 'Save expense'}</button></form></section></div>
}

function DateDetails({ date, expenses, onClose, onEdit, onDelete }: { date: string; expenses: Expense[]; onClose: () => void; onEdit: (expense: Expense) => void; onDelete: (id: number) => void }) {
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="date-title"><div className="modal-heading"><div><p className="eyebrow">EXPENSES</p><h2 id="date-title">{new Intl.DateTimeFormat('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button></div><ExpenseList expenses={expenses} onEdit={(expense) => { onClose(); onEdit(expense) }} onDelete={onDelete} /></section></div>
}

function MonthlyReport({ expenses, selectedMonthKey, currentMonthKey, today, onMonthChange, onAdd }: { expenses: Expense[]; selectedMonthKey: string; currentMonthKey: string; today: Date; onMonthChange: (key: string) => void; onAdd: () => void }) {
  const report = calculateMonthlyReport(expenses, selectedMonthKey, today)
  const previous = calculateMonthlyReport(expenses, report.previousKey, today)
  const comparison = monthComparison(report.total, previous.total)
  const insights = calculateInsights(report, previous)
  const isEmpty = report.items.length === 0
  const formatDay = (date: Date) => new Intl.DateTimeFormat('en-IN', { month: 'long', day: 'numeric' }).format(date)
  const changeMonth = (offset: number) => onMonthChange(monthKey(new Date(monthStart(selectedMonthKey).getFullYear(), monthStart(selectedMonthKey).getMonth() + offset, 1)))
  return <div className="report-view">
    <div className="page-heading"><p className="eyebrow">REPORTS</p><h2>{monthLabel(selectedMonthKey)}</h2><p className="subheading">A clear view of where your money went.</p></div>
    <div className="month-nav" aria-label="Month navigation"><button className="month-nav-button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ArrowLeft aria-hidden="true" /></button><button className="month-current" onClick={() => onMonthChange(currentMonthKey)}>{selectedMonthKey === currentMonthKey ? 'Current month' : 'Jump to current month'}</button><button className="month-nav-button" onClick={() => changeMonth(1)} disabled={selectedMonthKey >= currentMonthKey} aria-label="Next month"><ChevronRight aria-hidden="true" /></button></div>
    <div className="report-total"><span>Total spending</span><strong>{currency(report.total)}</strong><small>{report.items.length} {report.items.length === 1 ? 'expense' : 'expenses'}</small></div>
    {isEmpty ? <div className="report-empty compact"><h3>No expenses recorded</h3><p>There&apos;s no spending data for this month yet.</p><button className="outline-button" onClick={onAdd}><Plus aria-hidden="true" /> Add expense</button></div> : <>
      <div className="report-metrics"><div><span>Daily average</span><strong>{currency(report.averageDaily)}</strong></div><div><span>Top category</span><strong>{report.highestCategory?.name ?? 'Other'}</strong></div><div><span>Projected spending</span><strong>{report.projected === null ? '—' : currency(report.projected)}</strong></div></div>
      <div className="day-highlights"><div><span>Highest spending day</span><strong>{report.highestDay ? `${formatDay(report.highestDay.date)} · ${currency(report.highestDay.amount)}` : 'No spending yet'}</strong></div><div><span>Lowest spending day</span><strong>{report.lowestDay ? `${formatDay(report.lowestDay.date)} · ${currency(report.lowestDay.amount)}` : 'No spending yet'}</strong></div></div>
      <section className="category-section"><div className="section-heading"><h3>Where your money went</h3><span>{report.categories.length} categories</span></div>{report.categories.map((category) => <div className="category-row" key={category.name}><div className="category-line"><strong>{category.name}</strong><span>{currency(category.amount)} · {category.percentage.toFixed(1)}%</span></div><div className="category-track"><div className="category-fill" style={{ width: `${category.percentage}%` }} /></div></div>)}</section>
      <section className="comparison-section"><div className="section-heading"><h3>Compared with last month</h3></div><div className="comparison-card"><strong>{currency(previous.total)} last month</strong>{comparison ? <span>{currency(Math.abs(comparison.difference))} {comparison.difference >= 0 ? 'more' : 'less'} · {comparison.percentage.toFixed(1)}% {comparison.difference >= 0 ? 'increase' : 'decrease'}</span> : <span>No previous spending data</span>}</div></section>
      <section className="insights-section"><div className="section-heading"><h3>Where You Could Save</h3><span>Scenario estimates</span></div><p className="insight-note">These are mathematical projections based on your recorded spending, not guaranteed savings.</p>{insights.opportunities.map((opportunity, index) => <article className="opportunity-card" key={`${opportunity.name}-${opportunity.reduction}`}><div className="opportunity-rank">{index + 1}</div><div className="opportunity-copy"><strong>{opportunity.name}</strong><span>{opportunity.reason} · {currency(opportunity.amount)}</span><div className="opportunity-grid"><div><small>Reduction assumption</small><b>{opportunity.reduction}%</b></div><div><small>Potential / month</small><b>{currency(opportunity.saving)}</b></div><div><small>Potential / year</small><b>{currency(opportunity.saving * 12)}</b></div></div></div></article>)}{insights.opportunities[0] && <p className="insight-callout">At a {insights.opportunities[0].reduction}% reduction, {insights.opportunities[0].name} could save approximately {currency(insights.opportunities[0].saving)} this month.</p>}</section>
      <section className="observations-section"><div className="section-heading"><h3>Spending observations</h3></div>{report.highestCategory && <p><strong>{report.highestCategory.name}</strong> was your highest spending category at {currency(report.highestCategory.amount)} ({report.highestCategory.percentage.toFixed(1)}%).</p>}{report.categories[1] && <p>Your second-largest spending category was <strong>{report.categories[1].name}</strong> at {currency(report.categories[1].amount)}.</p>}{insights.categoryChanges.map((change) => <p key={`${change.type}-${change.name}`}>{change.name} spending {change.type === 'increase' ? 'increased' : 'decreased'} by {change.percentage.toFixed(0)}% compared with last month ({currency(change.amount)} {change.type === 'increase' ? 'more' : 'less'}).</p>)}{insights.repeated.map((group) => <p key={`repeat-${group.name}`}>{group.name} was recorded {group.items.length} times this month, totaling {currency(group.total)}. Average: {currency(group.average)}.</p>)}{report.highestDay && insights.highDayRatio >= 2 && <p>{formatDay(report.highestDay.date)} was your highest spending day: {currency(report.highestDay.amount)}, approximately {insights.highDayRatio.toFixed(1)}× your monthly daily average.</p>}{insights.weekendAverage > insights.weekdayAverage && insights.weekdayAverage > 0 && <p>Your average weekend spending was higher than your weekday spending. Weekend: {currency(insights.weekendAverage)}/day · Weekday: {currency(insights.weekdayAverage)}/day.</p>}{insights.smallAccumulation && <p>Small {insights.smallAccumulation.name} purchases added up to {currency(insights.smallAccumulation.total)} this month.</p>}</section>
    </>}
  </div>
}

function WeeklyReport({ currentWeek, previousWeek, dailyAverage, comparison, highestDay, lowestDay, onAdd }: { currentWeek: ReturnType<typeof calculatePeriod>; previousWeek: ReturnType<typeof calculatePeriod>; dailyAverage: number; comparison: ReturnType<typeof compareWeeks>; highestDay: { date: Date; total: number } | null; lowestDay: { date: Date; total: number } | null; onAdd: () => void }) {
  const formatDay = (date: Date) => new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(date)
  return <div className="report-view">
    <div className="page-heading"><p className="eyebrow">REPORTS</p><h2>This week</h2><p className="subheading">Monday through Sunday, calculated from your expenses.</p></div>
    <div className="report-total"><span>Weekly spending</span><strong>{currency(currentWeek.total)}</strong><small>{currentWeek.count} {currentWeek.count === 1 ? 'expense' : 'expenses'}</small></div>
    <div className="report-metrics"><div><span>Daily average</span><strong>{currency(dailyAverage)}</strong></div><div><span>Previous week</span><strong>{currency(previousWeek.total)}</strong></div><div><span>Average expense</span><strong>{currency(currentWeek.averageExpense)}</strong></div></div>
    {comparison ? <div className="comparison-card"><strong>{comparison.difference >= 0 ? '↑' : '↓'} {currency(Math.abs(comparison.difference))}</strong><span>{Math.abs(comparison.percentage).toFixed(0)}% {comparison.difference >= 0 ? 'more' : 'less'} than last week</span></div> : <div className="comparison-card"><strong>No previous spending data</strong><span>Add expenses next week to compare.</span></div>}
    <div className="day-highlights"><div><span>Highest spending day</span><strong>{highestDay ? `${formatDay(highestDay.date)} · ${currency(highestDay.total)}` : 'No spending yet'}</strong></div><div><span>Lowest spending day</span><strong>{lowestDay ? `${formatDay(lowestDay.date)} · ${currency(lowestDay.total)}` : 'No spending yet'}</strong></div></div>
    {currentWeek.count === 0 && <button className="outline-button" onClick={onAdd}><Plus aria-hidden="true" /> Record an expense</button>}
  </div>
}
function SettingsView() { return <div className="settings-view"><div className="page-heading"><p className="eyebrow">PREFERENCES</p><h2>Settings</h2><p className="subheading">Keep Spendly working your way.</p></div><div className="settings-card"><div><span>Currency</span><small>Used for all amounts</small></div><strong>INR (₹)</strong></div><div className="settings-card"><div><span>Notifications</span><small>Daily reminders</small></div><span className="coming-soon">Coming soon</span></div><div className="settings-card"><div><span>First day of week</span><small>Used for future reports</small></div><strong>Monday</strong></div><div className="about-card"><CircleHelp aria-hidden="true" /><div><strong>About Spendly</strong><p>A quiet, simple place to keep track of what you spend.</p><small>Version 1.0</small></div></div></div> }
