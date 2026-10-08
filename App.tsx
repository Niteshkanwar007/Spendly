import { useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Alert,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'

type Tab = 'today' | 'history' | 'reports' | 'settings'
type Expense = { id: number; amount: number; description: string; category: string; date: string }

const EXPENSES_STORAGE_KEY = '@spendly/expenses'
const REMINDERS_STORAGE_KEY = '@spendly/reminders'
const WELCOME_STORAGE_KEY = '@spendly/welcome-seen'

const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Travel', 'Other']
const initialExpenses: Expense[] = []

const currency = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const dateKey = (date: Date) => date.toISOString().slice(0, 10)
const readableDate = (date: Date) =>
  date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

export default function App() {
  const today = new Date()
  const todayKey = dateKey(today)

  const [tab, setTab] = useState<Tab>('today')
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [quickEntry, setQuickEntry] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [reminders, setReminders] = useState(true)
  const [storageReady, setStorageReady] = useState(false)
  const [welcomeVisible, setWelcomeVisible] = useState(false)

  const screenAnim = useRef(new Animated.Value(1)).current
  const welcomeOpacity = useRef(new Animated.Value(0)).current
  const welcomeY = useRef(new Animated.Value(28)).current
  const orbScale = useRef(new Animated.Value(0.88)).current
  const orbOpacity = useRef(new Animated.Value(0.35)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    let mounted = true

    const loadStoredData = async () => {
      try {
        const [storedExpenses, storedReminders, welcomeSeen] = await Promise.all([
          AsyncStorage.getItem(EXPENSES_STORAGE_KEY),
          AsyncStorage.getItem(REMINDERS_STORAGE_KEY),
          AsyncStorage.getItem(WELCOME_STORAGE_KEY),
        ])

        if (!mounted) return

        if (storedExpenses) {
          const parsedExpenses = JSON.parse(storedExpenses)
          if (Array.isArray(parsedExpenses)) {
            setExpenses(parsedExpenses)
          }
        }

        if (storedReminders !== null) {
          setReminders(storedReminders === 'true')
        }

        setWelcomeVisible(welcomeSeen !== 'true')
      } catch {
        Alert.alert(
          'Storage error',
          'Saved expenses could not be loaded. Your existing entries have not been changed.',
        )
        setWelcomeVisible(true)
      } finally {
        if (mounted) setStorageReady(true)
      }
    }

    loadStoredData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!storageReady) return

    AsyncStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses)).catch(() => {
      Alert.alert('Storage error', 'Your latest expense could not be saved locally.')
    })
  }, [expenses, storageReady])

  useEffect(() => {
    if (!storageReady) return

    AsyncStorage.setItem(REMINDERS_STORAGE_KEY, String(reminders)).catch(() => {
      Alert.alert('Storage error', 'Your reminder setting could not be saved locally.')
    })
  }, [reminders, storageReady])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [tab, screenAnim])

  useEffect(() => {
    if (!welcomeVisible) return

    Animated.parallel([
      Animated.timing(welcomeOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(welcomeY, {
        toValue: 0,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start()

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1.06,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.62,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 0.88,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.35,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    )

    pulse.start()

    return () => pulse.stop()
  }, [welcomeVisible, welcomeOpacity, welcomeY, orbScale, orbOpacity])

  const enterApp = async () => {
    Animated.parallel([
      Animated.timing(welcomeOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(welcomeY, {
        toValue: -18,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(async () => {
      setWelcomeVisible(false)
      await AsyncStorage.setItem(WELCOME_STORAGE_KEY, 'true')
    })
  }

  const pressIn = () =>
    Animated.spring(buttonScale, {
      toValue: 0.97,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start()

  const pressOut = () =>
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 7,
      tension: 110,
      useNativeDriver: true,
    }).start()

  const todayExpenses = expenses.filter((expense) => expense.date === todayKey)
  const total = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const allTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const categoryTotals = useMemo(
    () =>
      categories
        .map((name) => ({
          name,
          amount: expenses
            .filter((expense) => expense.category === name)
            .reduce((sum, expense) => sum + expense.amount, 0),
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [expenses],
  )

  function addExpense() {
    const numericAmount = Number(amount)

    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Check your entry', 'Add a description and an amount greater than ₹0.')
      return
    }

    setExpenses((current) => [
      {
        id: Date.now(),
        description: description.trim(),
        amount: numericAmount,
        category,
        date: todayKey,
      },
      ...current,
    ])

    setDescription('')
    setAmount('')
  }

  function addQuickExpenses() {
    const entries = quickText
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)

    const parsed = entries.map((entry) => {
      const match = entry.match(/^(.*?)[\s-–—:]*(\d+(?:\.\d{1,2})?)$/)
      return match ? { description: match[1].trim(), amount: Number(match[2]) } : null
    })

    if (!parsed.length || parsed.some((entry) => !entry?.description || !entry.amount)) {
      Alert.alert('Could not read entries', 'Use a format like Lunch 250, one expense per line.')
      return
    }

    setExpenses((current) => [
      ...parsed.map((entry, index) => ({
        id: Date.now() + index,
        description: entry!.description,
        amount: entry!.amount,
        category: 'Other',
        date: todayKey,
      })),
      ...current,
    ])

    setQuickText('')
    setQuickEntry(false)
  }

  if (!storageReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.boot}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>₹</Text>
          </View>
          <Text style={styles.bootTitle}>Spendly</Text>
          <Text style={styles.bootText}>Getting your money space ready.</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (welcomeVisible) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.welcomeScreen}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.orb,
              {
                opacity: orbOpacity,
                transform: [{ scale: orbScale }],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.orbSmall,
              {
                opacity: Animated.multiply(orbOpacity, 0.7),
                transform: [{ scale: orbScale }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.welcomeContent,
              {
                opacity: welcomeOpacity,
                transform: [{ translateY: welcomeY }],
              },
            ]}
          >
            <View style={styles.welcomeLogo}>
              <Text style={styles.welcomeLogoText}>₹</Text>
            </View>

            <Text style={styles.welcomeKicker}>A QUIET PLACE FOR YOUR MONEY</Text>
            <Text style={styles.welcomeTitle}>Hi 9ickie.</Text>
            <Text style={styles.welcomeHeadline}>Welcome to Spendly.</Text>
            <Text style={styles.welcomeCopy}>
              Capture the small spends, see the bigger picture, and stay in control without turning money into a chore.
            </Text>

            <View style={styles.welcomePills}>
              <View style={styles.welcomePill}><Text style={styles.welcomePillText}>LOCAL</Text></View>
              <View style={styles.welcomePill}><Text style={styles.welcomePillText}>PRIVATE</Text></View>
              <View style={styles.welcomePill}><Text style={styles.welcomePillText}>SIMPLE</Text></View>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={pressIn}
                onPressOut={pressOut}
                onPress={enterApp}
                style={styles.welcomeButton}
              >
                <Text style={styles.welcomeButtonText}>Enter Spendly</Text>
                <Text style={styles.welcomeArrow}>→</Text>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.welcomeFoot}>Your expenses stay on this device.</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.app}>
        <View style={styles.header}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>₹</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.eyebrow}>PERSONAL EXPENSES</Text>
            <Text style={styles.brand}>Spendly</Text>
          </View>
          <View style={styles.liveDot} />
        </View>

        <Animated.View
          style={[
            styles.screen,
            {
              opacity: screenAnim,
              transform: [
                {
                  translateY: screenAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {tab === 'today' && (
              <>
                <View style={styles.welcomeRow}>
                  <View style={styles.flex}>
                    <Text style={styles.eyebrow}>TODAY</Text>
                    <Text style={styles.title}>{readableDate(today)}</Text>
                  </View>
                  <TouchableOpacity style={styles.quickButton} onPress={() => setQuickEntry(true)}>
                    <Text style={styles.quickButtonText}>Quick entry</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.heroCard}>
                  <View style={styles.heroGlow} />
                  <Text style={styles.cardLabel}>TODAY&apos;S SPENDING</Text>
                  <Text style={styles.total}>{currency(total)}</Text>
                  <Text style={styles.heroMuted}>
                    {todayExpenses.length
                      ? `${todayExpenses.length} expense${todayExpenses.length === 1 ? '' : 's'} recorded`
                      : 'A clean slate. Start logging.'}
                  </Text>
                  <View style={styles.heroLine} />
                  <Text style={styles.heroHint}>Small entries. Clearer decisions.</Text>
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Today&apos;s expenses</Text>
                  <Text style={styles.muted}>{todayExpenses.length} items</Text>
                </View>

                {todayExpenses.length === 0 ? (
                  <View style={styles.empty}>
                    <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>+</Text></View>
                    <Text style={styles.emptyTitle}>Nothing logged today</Text>
                    <Text style={styles.muted}>Capture your first expense below.</Text>
                  </View>
                ) : (
                  todayExpenses.map((expense) => (
                    <View style={styles.expenseRow} key={expense.id}>
                      <View style={styles.expenseIcon}><Text style={styles.expenseIconText}>₹</Text></View>
                      <View style={styles.expenseCopy}>
                        <Text style={styles.expenseName}>{expense.description}</Text>
                        <Text style={styles.muted}>{expense.category}</Text>
                      </View>
                      <Text style={styles.expenseAmount}>{currency(expense.amount)}</Text>
                    </View>
                  ))
                )}

                <View style={styles.formCard}>
                  <View>
                    <Text style={styles.sectionTitle}>Add expense</Text>
                    <Text style={styles.formHint}>Make the entry. Spendly handles the math.</Text>
                  </View>
                  <TextInput
                    placeholder="What did you spend on?"
                    placeholderTextColor="#646A78"
                    value={description}
                    onChangeText={setDescription}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Amount in rupees"
                    placeholderTextColor="#646A78"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {categories.map((item) => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => setCategory(item)}
                        style={[styles.chip, item === category && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, item === category && styles.chipTextActive]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.primaryButton} onPress={addExpense}>
                    <Text style={styles.primaryButtonText}>Add expense</Text>
                    <Text style={styles.primaryArrow}>↗</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {tab === 'history' && (
              <>
                <Text style={styles.eyebrow}>YOUR ACTIVITY</Text>
                <Text style={styles.title}>Expense history</Text>
                <View style={styles.miniHero}>
                  <View>
                    <Text style={styles.cardLabel}>ALL TIME</Text>
                    <Text style={styles.miniTotal}>{currency(allTotal)}</Text>
                  </View>
                  <View style={styles.miniBadge}>
                    <Text style={styles.miniBadgeText}>{expenses.length}</Text>
                    <Text style={styles.miniBadgeLabel}>entries</Text>
                  </View>
                </View>
                {expenses.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>Your history is empty</Text>
                    <Text style={styles.muted}>Expenses you add will appear here.</Text>
                  </View>
                ) : (
                  expenses.map((expense) => (
                    <View style={styles.expenseRow} key={expense.id}>
                      <View style={styles.expenseIcon}><Text style={styles.expenseIconText}>₹</Text></View>
                      <View style={styles.expenseCopy}>
                        <Text style={styles.expenseName}>{expense.description}</Text>
                        <Text style={styles.muted}>{expense.category} · {expense.date}</Text>
                      </View>
                      <Text style={styles.expenseAmount}>{currency(expense.amount)}</Text>
                    </View>
                  ))
                )}
              </>
            )}

            {tab === 'reports' && (
              <>
                <Text style={styles.eyebrow}>INSIGHTS</Text>
                <Text style={styles.title}>Spending report</Text>
                <View style={styles.miniHero}>
                  <View>
                    <Text style={styles.cardLabel}>TOTAL SPENDING</Text>
                    <Text style={styles.miniTotal}>{currency(allTotal)}</Text>
                  </View>
                  <Text style={styles.miniContext}>{expenses.length} expenses</Text>
                </View>
                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Where it went</Text>
                  {categoryTotals.length === 0 ? (
                    <Text style={styles.muted}>Add expenses to see your breakdown.</Text>
                  ) : (
                    categoryTotals.map((item) => (
                      <View key={item.name} style={styles.reportRow}>
                        <View style={styles.reportLabel}>
                          <Text style={styles.expenseName}>{item.name}</Text>
                          <Text style={styles.muted}>{currency(item.amount)}</Text>
                        </View>
                        <View style={styles.track}>
                          <View style={[styles.fill, { width: `${allTotal ? (item.amount / allTotal) * 100 : 0}%` }]} />
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}

            {tab === 'settings' && (
              <>
                <Text style={styles.eyebrow}>PREFERENCES</Text>
                <Text style={styles.title}>Settings</Text>
                <View style={styles.formCard}>
                  <View style={styles.settingRow}>
                    <View style={styles.flex}>
                      <Text style={styles.expenseName}>Daily reminder</Text>
                      <Text style={styles.muted}>Prompt me to log expenses each evening</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setReminders(!reminders)}
                      style={[styles.toggle, reminders && styles.toggleOn]}
                    >
                      <View style={[styles.toggleKnob, reminders && styles.toggleKnobOn]} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.sectionTitle}>About Spendly</Text>
                  <Text style={styles.muted}>
                    A private, calm way to stay aware of everyday spending. No accounts. No bank connections.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>

        <View style={styles.nav}>
          {([
            ['today', 'Today'],
            ['history', 'History'],
            ['reports', 'Reports'],
            ['settings', 'Settings'],
          ] as const).map(([key, label]) => (
            <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.navItem}>
              <Text style={[styles.navIcon, tab === key && styles.navActive]}>
                {key === 'today' ? '⌂' : key === 'history' ? '▤' : key === 'reports' ? '◒' : '⚙'}
              </Text>
              <Text style={[styles.navLabel, tab === key && styles.navActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {quickEntry && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />
              <Text style={styles.title}>Quick entry</Text>
              <Text style={styles.muted}>Add one expense per line, like Coffee 120.</Text>
              <TextInput
                autoFocus
                multiline
                value={quickText}
                onChangeText={setQuickText}
                placeholder={'Lunch 250\nMetro 80'}
                placeholderTextColor="#646A78"
                style={[styles.input, styles.quickInput]}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setQuickEntry(false)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addQuickExpenses} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Add all</Text>
                  <Text style={styles.primaryArrow}>↗</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const colors = {
  bg: '#07090D',
  surface: '#0E1118',
  surface2: '#121621',
  border: '#1C2230',
  text: '#F5F7FB',
  muted: '#8C93A3',
  dim: '#646A78',
  purple: '#9B7CFF',
  purpleSoft: '#1D1830',
  mint: '#4CE1B6',
  white: '#FFFFFF',
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  app: { flex: 1, backgroundColor: colors.bg },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  bootTitle: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 14 },
  bootText: { color: colors.muted, fontSize: 13, marginTop: 6 },
  logoMark: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  logoMarkText: { color: colors.white, fontSize: 28, fontWeight: '900' },

  welcomeScreen: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden', justifyContent: 'center', padding: 26 },
  orb: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: colors.purple,
    top: -130,
    right: -130,
  },
  orbSmall: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.mint,
    bottom: -90,
    left: -100,
  },
  welcomeContent: { width: '100%' },
  welcomeLogo: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: '#302750',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: colors.purple,
    shadowOpacity: 0.3,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  welcomeLogoText: { color: colors.purple, fontSize: 34, fontWeight: '900' },
  welcomeKicker: { color: colors.mint, fontSize: 10, letterSpacing: 2, fontWeight: '800', marginBottom: 14 },
  welcomeTitle: { color: colors.text, fontSize: 48, lineHeight: 53, fontWeight: '900', letterSpacing: -1.8 },
  welcomeHeadline: { color: '#C6B8FF', fontSize: 28, lineHeight: 34, fontWeight: '800', marginTop: 2 },
  welcomeCopy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 18, maxWidth: 390 },
  welcomePills: { flexDirection: 'row', gap: 8, marginTop: 22, marginBottom: 30 },
  welcomePill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  welcomePillText: { color: '#AAB0BF', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  welcomeButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: colors.purple,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 9,
  },
  welcomeButtonText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  welcomeArrow: { color: colors.white, fontSize: 22, fontWeight: '800' },
  welcomeFoot: { color: '#555B69', fontSize: 11, textAlign: 'center', marginTop: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.purpleSoft,
    borderWidth: 1,
    borderColor: '#302750',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: { color: colors.purple, fontSize: 21, fontWeight: '900' },
  brandCopy: { marginLeft: 11, flex: 1 },
  eyebrow: { color: '#737A8B', fontSize: 10, letterSpacing: 1.6, fontWeight: '800' },
  brand: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 2, letterSpacing: -0.4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.mint, shadowColor: colors.mint, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 34, gap: 18 },
  flex: { flex: 1 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 5, letterSpacing: -0.8 },
  quickButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface },
  quickButtonText: { color: '#B9A9FF', fontWeight: '800', fontSize: 12 },
  heroCard: {
    backgroundColor: colors.surface2,
    borderRadius: 24,
    padding: 22,
    marginTop: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.purple, opacity: 0.08, right: -65, top: -70 },
  cardLabel: { color: '#858C9C', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  total: { color: colors.text, fontSize: 42, fontWeight: '900', marginVertical: 7, letterSpacing: -1.4 },
  heroMuted: { color: '#9DA4B4', fontSize: 13, lineHeight: 20 },
  heroLine: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  heroHint: { color: '#737A8B', fontSize: 11, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  formHint: { color: colors.dim, fontSize: 11, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 28, borderRadius: 18, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: '#090C12' },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyIconText: { color: colors.purple, fontSize: 22, fontWeight: '500' },
  emptyTitle: { color: colors.text, fontWeight: '800', marginBottom: 4 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  expenseIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  expenseIconText: { color: colors.mint, fontWeight: '900' },
  expenseCopy: { flex: 1, marginLeft: 12 },
  expenseName: { color: colors.text, fontWeight: '800', fontSize: 14 },
  expenseAmount: { color: colors.text, fontWeight: '900', fontSize: 14 },
  formCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 17, gap: 13, borderWidth: 1, borderColor: colors.border },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontSize: 14, backgroundColor: '#0A0D13' },
  chips: { gap: 7 },
  chip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#151923', borderWidth: 1, borderColor: '#202635' },
  chipActive: { backgroundColor: colors.purpleSoft, borderColor: '#4B3C7E' },
  chipText: { color: '#7D8493', fontSize: 12 },
  chipTextActive: { color: '#C6B8FF', fontWeight: '800' },
  primaryButton: { backgroundColor: colors.purple, borderRadius: 13, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 9, flex: 1 },
  primaryButtonText: { color: colors.white, fontWeight: '900' },
  primaryArrow: { color: colors.white, fontSize: 17, fontWeight: '800' },
  nav: { flexDirection: 'row', backgroundColor: '#090C12', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 9, paddingBottom: 7 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { color: '#5F6675', fontSize: 18 },
  navLabel: { color: '#5F6675', fontSize: 10, fontWeight: '800' },
  navActive: { color: colors.purple },
  reportRow: { gap: 8 },
  reportLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, backgroundColor: '#1A1F2B', borderRadius: 5, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.purple, borderRadius: 5 },
  miniHero: { backgroundColor: colors.surface2, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniTotal: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 5 },
  miniContext: { color: colors.muted, fontSize: 12 },
  miniBadge: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.purpleSoft, borderWidth: 1, borderColor: '#3C3264', alignItems: 'center', justifyContent: 'center' },
  miniBadgeText: { color: colors.purple, fontSize: 18, fontWeight: '900' },
  miniBadgeLabel: { color: colors.muted, fontSize: 9, marginTop: 1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { width: 48, height: 28, borderRadius: 16, backgroundColor: '#242A36', padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.purple },
  toggleKnob: { width: 22, height: 22, backgroundColor: '#E8EAF0', borderRadius: 11 },
  toggleKnobOn: { alignSelf: 'flex-end' },
  divider: { height: 1, backgroundColor: colors.border },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 3, 7, 0.78)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#0C1017', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, gap: 13, borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#343A48', alignSelf: 'center', marginBottom: 2 },
  quickInput: { minHeight: 120, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.surface2 },
  secondaryText: { color: '#B9A9FF', fontWeight: '900' },
})
