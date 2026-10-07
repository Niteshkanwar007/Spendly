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

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = new Date()
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

          {activeTab === 'reports' && <WeeklyReport currentWeek={currentWeek} previousWeek={previousWeek} dailyAverage={dailyAverage} comparison={weekComparison} highestDay={highestDay} lowestDay={lowestDay} onAdd={() => setShowForm(true)} />}

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
