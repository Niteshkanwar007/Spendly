import { useMemo, useState } from 'react'
import { Alert, TouchableOpacity, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'

type Tab = 'today' | 'history' | 'reports' | 'settings'
type Expense = { id: number; amount: number; description: string; category: string; date: string }

const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Travel', 'Other']
const initialExpenses: Expense[] = []
const currency = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const dateKey = (date: Date) => date.toISOString().slice(0, 10)
const readableDate = (date: Date) => date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

export default function App() {
  const today = new Date()
  const todayKey = dateKey(today)
  const [tab, setTab] = useState<Tab>('today')
  const [expenses, setExpenses] = useState(initialExpenses)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [quickEntry, setQuickEntry] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [reminders, setReminders] = useState(true)

  const todayExpenses = expenses.filter((expense) => expense.date === todayKey)
  const total = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const allTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categoryTotals = useMemo(() => categories.map((name) => ({ name, amount: expenses.filter((expense) => expense.category === name).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount), [expenses])

  function addExpense() {
    const numericAmount = Number(amount)
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Check your entry', 'Add a description and an amount greater than ₹0.')
      return
    }
    setExpenses((current) => [{ id: Date.now(), description: description.trim(), amount: numericAmount, category, date: todayKey }, ...current])
    setDescription('')
    setAmount('')
  }

  function addQuickExpenses() {
    const entries = quickText.split(/[\n,]+/).map((entry) => entry.trim()).filter(Boolean)
    const parsed = entries.map((entry) => {
      const match = entry.match(/^(.*?)[\s-–—:]*(\d+(?:\.\d{1,2})?)$/)
      return match ? { description: match[1].trim(), amount: Number(match[2]) } : null
    })
    if (!parsed.length || parsed.some((entry) => !entry?.description || !entry.amount)) {
      Alert.alert('Could not read entries', 'Use a format like Lunch 250, one expense per line.')
      return
    }
    setExpenses((current) => [...parsed.map((entry, index) => ({ id: Date.now() + index, description: entry!.description, amount: entry!.amount, category: 'Other', date: todayKey })), ...current])
    setQuickText('')
    setQuickEntry(false)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}>
          <View style={styles.brandIcon}><Text style={styles.brandIconText}>₹</Text></View>
          <View style={styles.brandCopy}><Text style={styles.eyebrow}>PERSONAL EXPENSES</Text><Text style={styles.brand}>Spendly</Text></View>
          <TouchableOpacity accessibilityLabel="More options" style={styles.more}><Text style={styles.moreText}>•••</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'today' && <>
            <View style={styles.welcomeRow}><View><Text style={styles.eyebrow}>TODAY</Text><Text style={styles.title}>{readableDate(today)}</Text></View><TouchableOpacity style={styles.quickButton} onPress={() => setQuickEntry(true)}><Text style={styles.quickButtonText}>Quick entry</Text></TouchableOpacity></View>
            <View style={styles.totalCard}><Text style={styles.cardLabel}>TODAY&apos;S SPENDING</Text><Text style={styles.total}>{currency(total)}</Text><Text style={styles.muted}>{todayExpenses.length ? `${todayExpenses.length} expense${todayExpenses.length === 1 ? '' : 's'} recorded` : 'No expenses recorded yet'}</Text></View>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Today&apos;s expenses</Text><Text style={styles.muted}>{todayExpenses.length} items</Text></View>
            {todayExpenses.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Nothing logged today</Text><Text style={styles.muted}>Capture your first expense below.</Text></View> : todayExpenses.map((expense) => <View style={styles.expenseRow} key={expense.id}><View style={styles.expenseIcon}><Text>₹</Text></View><View style={styles.expenseCopy}><Text style={styles.expenseName}>{expense.description}</Text><Text style={styles.muted}>{expense.category}</Text></View><Text style={styles.expenseAmount}>{currency(expense.amount)}</Text></View>)}
            <View style={styles.formCard}><Text style={styles.sectionTitle}>Add expense</Text><TextInput placeholder="What did you spend on?" placeholderTextColor="#9d9a92" value={description} onChangeText={setDescription} style={styles.input} /><TextInput placeholder="Amount in rupees" placeholderTextColor="#9d9a92" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.input} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.map((item) => <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.chip, item === category && styles.chipActive]}><Text style={[styles.chipText, item === category && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}</ScrollView><TouchableOpacity style={styles.primaryButton} onPress={addExpense}><Text style={styles.primaryButtonText}>Add expense</Text></TouchableOpacity></View>
          </>}

          {tab === 'history' && <><Text style={styles.eyebrow}>YOUR ACTIVITY</Text><Text style={styles.title}>Expense history</Text><View style={styles.totalCard}><Text style={styles.cardLabel}>ALL TIME</Text><Text style={styles.total}>{currency(allTotal)}</Text><Text style={styles.muted}>{expenses.length} total entries</Text></View>{expenses.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Your history is empty</Text><Text style={styles.muted}>Expenses you add will appear here.</Text></View> : expenses.map((expense) => <View style={styles.expenseRow} key={expense.id}><View style={styles.expenseIcon}><Text>₹</Text></View><View style={styles.expenseCopy}><Text style={styles.expenseName}>{expense.description}</Text><Text style={styles.muted}>{expense.category} · {expense.date}</Text></View><Text style={styles.expenseAmount}>{currency(expense.amount)}</Text></View>)}</>}

          {tab === 'reports' && <><Text style={styles.eyebrow}>INSIGHTS</Text><Text style={styles.title}>Spending report</Text><View style={styles.totalCard}><Text style={styles.cardLabel}>TOTAL SPENDING</Text><Text style={styles.total}>{currency(allTotal)}</Text><Text style={styles.muted}>Across {expenses.length} expenses</Text></View><View style={styles.formCard}><Text style={styles.sectionTitle}>By category</Text>{categoryTotals.length === 0 ? <Text style={styles.muted}>Add expenses to see your breakdown.</Text> : categoryTotals.map((item) => <View key={item.name} style={styles.reportRow}><View style={styles.reportLabel}><Text style={styles.expenseName}>{item.name}</Text><Text style={styles.muted}>{currency(item.amount)}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${allTotal ? item.amount / allTotal * 100 : 0}%` }]} /></View></View>)}</View></>}

          {tab === 'settings' && <><Text style={styles.eyebrow}>PREFERENCES</Text><Text style={styles.title}>Settings</Text><View style={styles.formCard}><View style={styles.settingRow}><View><Text style={styles.expenseName}>Daily reminder</Text><Text style={styles.muted}>Prompt me to log expenses each evening</Text></View><TouchableOpacity onPress={() => setReminders(!reminders)} style={[styles.toggle, reminders && styles.toggleOn]}><View style={[styles.toggleKnob, reminders && styles.toggleKnobOn]} /></TouchableOpacity></View><View style={styles.divider} /><Text style={styles.sectionTitle}>About Spendly</Text><Text style={styles.muted}>A calm, simple way to stay aware of everyday spending.</Text></View></>}
        </ScrollView>

        <View style={styles.nav}>{([['today', 'Today'], ['history', 'History'], ['reports', 'Reports'], ['settings', 'Settings']] as const).map(([key, label]) => <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.navItem}><Text style={[styles.navIcon, tab === key && styles.navActive]}>{key === 'today' ? '⌂' : key === 'history' ? '▤' : key === 'reports' ? '◒' : '⚙'}</Text><Text style={[styles.navLabel, tab === key && styles.navActive]}>{label}</Text></TouchableOpacity>)}</View>

        {quickEntry && <View style={styles.modalBackdrop}><View style={styles.modal}><Text style={styles.title}>Quick entry</Text><Text style={styles.muted}>Add one expense per line, like Coffee 120.</Text><TextInput autoFocus multiline value={quickText} onChangeText={setQuickText} placeholder="Lunch 250\nMetro 80" placeholderTextColor="#9d9a92" style={[styles.input, styles.quickInput]} /><View style={styles.modalActions}><TouchableOpacity onPress={() => setQuickEntry(false)} style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={addQuickExpenses} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Add all</Text></TouchableOpacity></View></View></View>}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f7f6f2' }, app: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12, backgroundColor: '#f7f6f2' }, brandIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#255f52', alignItems: 'center', justifyContent: 'center' }, brandIconText: { color: '#f7f6f2', fontSize: 21, fontWeight: '800' }, brandCopy: { marginLeft: 11, flex: 1 }, eyebrow: { color: '#85847e', fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }, brand: { color: '#202420', fontSize: 21, fontWeight: '800', marginTop: 2 }, more: { padding: 8 }, moreText: { color: '#85847e', fontSize: 18, letterSpacing: 2 }, content: { padding: 22, paddingBottom: 32, gap: 18 }, welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: '#202420', fontSize: 27, fontWeight: '800', marginTop: 5 }, quickButton: { borderWidth: 1, borderColor: '#d9d8d1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }, quickButtonText: { color: '#255f52', fontWeight: '700', fontSize: 12 }, totalCard: { backgroundColor: '#255f52', borderRadius: 20, padding: 22, marginTop: 2 }, cardLabel: { color: '#bed8ce', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }, total: { color: '#fffdf8', fontSize: 38, fontWeight: '800', marginVertical: 7 }, muted: { color: '#85847e', fontSize: 13, lineHeight: 20 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }, sectionTitle: { color: '#202420', fontSize: 17, fontWeight: '800' }, empty: { alignItems: 'center', paddingVertical: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e2e0d8', borderStyle: 'dashed' }, emptyTitle: { color: '#202420', fontWeight: '700', marginBottom: 4 }, expenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }, expenseIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#e9eee9', alignItems: 'center', justifyContent: 'center' }, expenseIconText: { color: '#255f52' }, expenseCopy: { flex: 1, marginLeft: 12 }, expenseName: { color: '#202420', fontWeight: '700', fontSize: 14 }, expenseAmount: { color: '#202420', fontWeight: '800', fontSize: 14 }, formCard: { backgroundColor: '#fffdf8', borderRadius: 18, padding: 17, gap: 13, borderWidth: 1, borderColor: '#e7e5dc' }, input: { borderWidth: 1, borderColor: '#dedcd3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: '#202420', fontSize: 14, backgroundColor: '#fffdf8' }, chips: { gap: 7 }, chip: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f1f0eb' }, chipActive: { backgroundColor: '#d8e9e1' }, chipText: { color: '#666760', fontSize: 12 }, chipTextActive: { color: '#255f52', fontWeight: '700' }, primaryButton: { backgroundColor: '#255f52', borderRadius: 12, paddingVertical: 14, alignItems: 'center', flex: 1 }, primaryButtonText: { color: '#fffdf8', fontWeight: '800' }, nav: { flexDirection: 'row', backgroundColor: '#fffdf8', borderTopWidth: 1, borderTopColor: '#e7e5dc', paddingTop: 9, paddingBottom: 7 }, navItem: { flex: 1, alignItems: 'center', gap: 3 }, navIcon: { color: '#9d9a92', fontSize: 18 }, navLabel: { color: '#9d9a92', fontSize: 10, fontWeight: '700' }, navActive: { color: '#255f52' }, reportRow: { gap: 8 }, reportLabel: { flexDirection: 'row', justifyContent: 'space-between' }, track: { height: 8, backgroundColor: '#eeece4', borderRadius: 5, overflow: 'hidden' }, fill: { height: 8, backgroundColor: '#255f52', borderRadius: 5 }, settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, toggle: { width: 48, height: 28, borderRadius: 16, backgroundColor: '#d6d4cc', padding: 3, justifyContent: 'center' }, toggleOn: { backgroundColor: '#255f52' }, toggleKnob: { width: 22, height: 22, backgroundColor: '#fffdf8', borderRadius: 11 }, toggleKnobOn: { alignSelf: 'flex-end' }, divider: { height: 1, backgroundColor: '#e7e5dc' }, modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 29, 25, 0.38)', justifyContent: 'flex-end' }, modal: { backgroundColor: '#fffdf8', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 13 }, quickInput: { minHeight: 120, textAlignVertical: 'top' }, modalActions: { flexDirection: 'row', gap: 10 }, secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#dedcd3', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }, secondaryText: { color: '#255f52', fontWeight: '800' } })
