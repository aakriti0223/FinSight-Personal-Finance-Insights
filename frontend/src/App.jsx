
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: API_BASE_URL })

const PAGE_SIZE = 8

const today = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const initialForm = {
  amount: '',
  transaction_type: 'expense',
  category: '',
  description: '',
  transaction_date: today(),
}

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

const getErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(', ')
  }
  return detail || err.message || fallback
}

function App() {
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expenses: 0,
    balance: 0,
  })
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')

    try {
      const [summaryResponse, transactionsResponse] = await Promise.all([
        api.get('/api/v1/summary/'),
        api.get('/api/v1/transactions/', {
          params: { skip: 0, limit: 100 },
        }),
      ])

      const rawSummary = summaryResponse.data || {}
      const records = Array.isArray(transactionsResponse.data)
        ? transactionsResponse.data
        : []

      const income = Number(rawSummary.total_income) || 0
      const expenses = Number(rawSummary.total_expenses) || 0

      setSummary({
        total_income: income,
        total_expenses: expenses,
        // Calculate locally so the card remains correct even if the
        // API omits its balance field.
        balance: income - expenses,
      })
      setTransactions(records)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your financial data.'))
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const monthlyAnalytics = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        month: date.toLocaleDateString('en-IN', { month: 'short' }),
        income: 0,
        expenses: 0,
      }
    })
    const byMonth = new Map(months.map((item) => [item.key, item]))

    transactions.forEach((transaction) => {
      const dateText = String(transaction.transaction_date || '').slice(0, 10)
      const key = dateText.slice(0, 7)
      const month = byMonth.get(key)
      if (!month) return
      const amount = Number(transaction.amount) || 0
      if (transaction.transaction_type === 'income') month.income += amount
      else if (transaction.transaction_type === 'expense') month.expenses += amount
    })

    return months.map((item) => ({
      ...item,
      income: Number(item.income.toFixed(2)),
      expenses: Number(item.expenses.toFixed(2)),
    }))
  }, [transactions])

  const categoryAnalytics = useMemo(() => {
    const totals = new Map()
    transactions.forEach((transaction) => {
      if (transaction.transaction_type !== 'expense') return
      const category = String(transaction.category || 'Other').trim() || 'Other'
      totals.set(category, (totals.get(category) || 0) + (Number(transaction.amount) || 0))
    })
    return Array.from(totals, ([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const analyticsColors = ['#159564', '#6b7ee8', '#ed7767', '#e7b34c', '#42a5b5', '#9b70d6', '#718096']

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()

    const result = transactions.filter((transaction) => {
      const matchesType =
        typeFilter === 'all' ||
        transaction.transaction_type === typeFilter

      const searchableText = [
        transaction.category,
        transaction.description,
        transaction.transaction_type,
        transaction.transaction_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesType && (!query || searchableText.includes(query))
    })

    result.sort((a, b) => {
      if (sortBy === 'date-asc') {
        return String(a.transaction_date).localeCompare(
          String(b.transaction_date),
        )
      }
      if (sortBy === 'amount-desc') {
        return Number(b.amount) - Number(a.amount)
      }
      if (sortBy === 'amount-asc') {
        return Number(a.amount) - Number(b.amount)
      }
      return (
        String(b.transaction_date).localeCompare(
          String(a.transaction_date),
        ) || Number(b.id) - Number(a.id)
      )
    })

    return result
  }, [transactions, search, typeFilter, sortBy])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE),
  )

  const visibleTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, sortBy])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setError('')
    setNotice('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!form.amount || !Number.isFinite(Number(form.amount)) ||
        Number(form.amount) <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }

    if (!form.category.trim()) {
      setError('Please enter a transaction category.')
      return
    }

    setSaving(true)

    try {
      await api.post('/api/v1/transactions/', {
        ...form,
        amount: Number(form.amount),
        category: form.category.trim(),
        description: form.description.trim(),
      })

      setForm({ ...initialForm, transaction_date: today() })
      setSearch('')
      setTypeFilter('all')
      setSortBy('date-desc')
      setCurrentPage(1)
      setNotice('Transaction added successfully.')
      await loadDashboard(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the transaction.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (transaction) => {
    const confirmed = window.confirm(
      `Delete "${transaction.category}" (${money(transaction.amount)})? This cannot be undone.`,
    )

    if (!confirmed) return

    setDeletingId(transaction.id)
    setError('')
    setNotice('')

    try {
      await api.delete(`/api/v1/transactions/${transaction.id}`)
      setNotice('Transaction deleted successfully.')
      await loadDashboard(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the transaction.'))
    } finally {
      setDeletingId(null)
    }
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#dashboard" onClick={closeMobileMenu}>
          <span className="brand-mark">₹</span>
          <span>FinSight</span>
        </a>

        <p className="sidebar-label">WORKSPACE</p>
        <a
          className="nav-link active"
          href="#dashboard"
          onClick={closeMobileMenu}
        >
          <span>▦</span> Dashboard
        </a>
        <a
          className="nav-link"
          href="#transactions"
          onClick={closeMobileMenu}
        >
          <span>↔</span> Transactions
        </a>
        <a
          className="nav-link"
          href="#add-transaction"
          onClick={closeMobileMenu}
        >
          <span>＋</span> Add transaction
        </a>

        <div className="sidebar-bottom">
          <div className="sidebar-avatar">PF</div>
          <div>
            <strong>Personal Finance</strong>
            <small>Insights workspace</small>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={closeMobileMenu}
        />
      )}

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </button>
            <div>
              <p className="eyebrow">YOUR MONEY, CLEARER</p>
              <h1>Financial Dashboard</h1>
              <p className="page-subtitle">
                Track your money and understand your spending.
              </p>
            </div>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={() => loadDashboard()}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            <span>{loading ? 'Loading…' : 'Refresh'}</span>
          </button>
        </header>

        {error && (
          <div className="alert alert-error" role="alert">
            <strong>Something went wrong.</strong> {error}
            <p>
              Check that the backend is available at{' '}
              <code>{API_BASE_URL}</code>.
            </p>
            <button type="button" className="alert-action" onClick={() => loadDashboard()}>
              Try again
            </button>
          </div>
        )}

        {notice && (
          <div className="alert alert-success" role="status">
            <span aria-hidden="true">✓</span> {notice}
            <button
              type="button"
              className="alert-dismiss"
              onClick={() => setNotice('')}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <section className="summary-grid" aria-label="Financial summary">
          <article className="summary-card balance-card">
            <div className="card-topline">
              <span className="card-label">Current balance</span>
              <span className="metric-icon balance-icon">₹</span>
            </div>
            <h2>{loading ? 'Loading…' : money(summary.balance)}</h2>
            <p className="metric-footnote">Income minus expenses</p>
          </article>

          <article className="summary-card">
            <div className="card-topline">
              <span className="card-label">Total income</span>
              <span className="metric-icon income-icon">↗</span>
            </div>
            <h2 className="income-value">
              {loading ? 'Loading…' : money(summary.total_income)}
            </h2>
            <p className="metric-footnote">Money received</p>
          </article>

          <article className="summary-card">
            <div className="card-topline">
              <span className="card-label">Total expenses</span>
              <span className="metric-icon expense-icon">↘</span>
            </div>
            <h2 className="expense-value">
              {loading ? 'Loading…' : money(summary.total_expenses)}
            </h2>
            <p className="metric-footnote">Money spent</p>
          </article>

          <article className="summary-card">
            <div className="card-topline">
              <span className="card-label">Transactions</span>
              <span className="metric-icon count-icon">≡</span>
            </div>
            <h2>{loading ? '…' : transactions.length}</h2>
            <p className="metric-footnote">Records loaded from API</p>
          </article>
        </section>

        <section className="analytics-grid" aria-label="Financial analytics">
          <article className="panel analytics-panel">
            <div className="panel-heading">
              <div>
                <h2>Income vs. expenses</h2>
                <p>Monthly cash flow for the last six months</p>
              </div>
              <span className="analytics-badge">6 months</span>
            </div>
            <div className="chart-container">
              {loading ? (
                <div className="chart-empty">Loading analytics…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAnalytics} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eef5" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#8794a8', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: '#8794a8', fontSize: 10 }} tickFormatter={(value) => value >= 1000 ? `₹${(value / 1000).toFixed(1)}k` : `₹${value}`} />
                    <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 10, border: '1px solid #e7edf5', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="income" name="Income" fill="#159564" radius={[5, 5, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ed7767" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="panel analytics-panel">
            <div className="panel-heading">
              <div>
                <h2>Spending by category</h2>
                <p>Where your expense transactions go</p>
              </div>
              <span className="analytics-badge">{categoryAnalytics.length} categories</span>
            </div>
            {categoryAnalytics.length === 0 ? (
              <div className="chart-empty chart-empty-tall">
                <div className="empty-icon">◔</div>
                <h3>No expense data yet</h3>
                <p>Add an expense transaction to see your breakdown.</p>
              </div>
            ) : (
              <div className="category-chart-layout">
                <div className="donut-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryAnalytics} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
                        {categoryAnalytics.map((entry, index) => (
                          <Cell key={entry.name} fill={analyticsColors[index % analyticsColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 10, border: '1px solid #e7edf5', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="category-legend">
                  {categoryAnalytics.slice(0, 6).map((item, index) => (
                    <div className="category-legend-item" key={item.name}>
                      <span className="category-dot" style={{ backgroundColor: analyticsColors[index % analyticsColors.length] }} />
                      <span className="category-legend-name" title={item.name}>{item.name}</span>
                      <strong>{money(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="panel analytics-panel trend-panel">
            <div className="panel-heading">
              <div>
                <h2>Monthly financial trend</h2>
                <p>Track how income and spending change over time</p>
              </div>
            </div>
            <div className="chart-container trend-chart-container">
              {loading ? (
                <div className="chart-empty">Loading trends…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyAnalytics} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eef5" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#8794a8', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: '#8794a8', fontSize: 10 }} tickFormatter={(value) => value >= 1000 ? `₹${(value / 1000).toFixed(1)}k` : `₹${value}`} />
                    <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 10, border: '1px solid #e7edf5', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="income" name="Income" stroke="#159564" strokeWidth={3} dot={{ r: 4, fill: '#159564' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ed7767" strokeWidth={3} dot={{ r: 4, fill: '#ed7767' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel transaction-panel" id="transactions">
            <div className="panel-heading">
              <div>
                <h2>Transactions</h2>
                <p>
                  {filteredTransactions.length} matching record
                  {filteredTransactions.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => loadDashboard()}
                disabled={loading}
              >
                ↻ Refresh list
              </button>
            </div>

            <div className="transaction-toolbar">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Search category or description…"
                  aria-label="Search transactions"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                  >
                    ×
                  </button>
                )}
              </label>

              <div className="filter-controls">
                <select
                  aria-label="Filter by transaction type"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="all">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expenses</option>
                </select>

                <select
                  aria-label="Sort transactions"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Highest amount</option>
                  <option value="amount-asc">Lowest amount</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="empty-state" aria-live="polite">
                Loading transactions…
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">↔</div>
                <h3>No matching transactions</h3>
                <p>Try another search or add a new transaction.</p>
                {(search || typeFilter !== 'all') && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setTypeFilter('all')
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Transaction</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th className="amount-column">Amount</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            <div className="transaction-name">
                              <span
                                className={`transaction-icon ${
                                  transaction.transaction_type === 'income'
                                    ? 'income-icon'
                                    : 'expense-icon'
                                }`}
                              >
                                {transaction.transaction_type === 'income'
                                  ? '↗'
                                  : '↘'}
                              </span>
                              <div>
                                <strong>{transaction.category}</strong>
                                <small>
                                  {transaction.description || 'No description'}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td className="date-cell">
                            {formatDate(transaction.transaction_date)}
                          </td>
                          <td>
                            <span
                              className={`type-pill ${transaction.transaction_type}`}
                            >
                              {transaction.transaction_type}
                            </span>
                          </td>
                          <td
                            className={`amount-column amount ${
                              transaction.transaction_type === 'income'
                                ? 'income-value'
                                : 'expense-value'
                            }`}
                          >
                            {transaction.transaction_type === 'income'
                              ? '+ '
                              : '− '}
                            {money(transaction.amount)}
                          </td>
                          <td>
                            <button
                              className="delete-button"
                              type="button"
                              disabled={deletingId === transaction.id}
                              onClick={() => handleDelete(transaction)}
                              aria-label={`Delete ${transaction.category} transaction`}
                              title="Delete transaction"
                            >
                              {deletingId === transaction.id ? '…' : '×'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pagination">
                  <span>
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredTransactions.length,
                    )}{' '}
                    of {filteredTransactions.length}
                  </span>
                  <div className="pagination-actions">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => page - 1)}
                    >
                      ← Previous
                    </button>
                    <span>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((page) => page + 1)}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </article>

          <article className="panel form-panel" id="add-transaction">
            <div className="panel-heading">
              <div>
                <h2>Add transaction</h2>
                <p>Record money coming in or going out.</p>
              </div>
              <span className="form-heading-icon">＋</span>
            </div>

            <form onSubmit={handleSubmit} className="transaction-form">
              <label>Transaction type</label>
              <div className="type-selector">
                <button
                  type="button"
                  aria-pressed={form.transaction_type === 'expense'}
                  className={
                    form.transaction_type === 'expense'
                      ? 'type-option selected expense-selected'
                      : 'type-option'
                  }
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      transaction_type: 'expense',
                    }))
                  }
                >
                  ↘ Expense
                </button>
                <button
                  type="button"
                  aria-pressed={form.transaction_type === 'income'}
                  className={
                    form.transaction_type === 'income'
                      ? 'type-option selected income-selected'
                      : 'type-option'
                  }
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      transaction_type: 'income',
                    }))
                  }
                >
                  ↗ Income
                </button>
              </div>

              <label htmlFor="amount">Amount (₹)</label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 1250.00"
                value={form.amount}
                onChange={handleChange}
                required
              />

              <label htmlFor="category">Category</label>
              <input
                id="category"
                name="category"
                type="text"
                maxLength="50"
                placeholder="e.g. Food, Salary, Travel"
                value={form.category}
                onChange={handleChange}
                required
              />

              <label htmlFor="description">Description</label>
              <input
                id="description"
                name="description"
                type="text"
                maxLength="255"
                placeholder="What was this transaction for?"
                value={form.description}
                onChange={handleChange}
              />

              <label htmlFor="transaction_date">Transaction date</label>
              <input
                id="transaction_date"
                name="transaction_date"
                type="date"
                value={form.transaction_date}
                onChange={handleChange}
                required
              />

              <button className="submit-button" type="submit" disabled={saving}>
                {saving ? 'Saving transaction…' : '+ Add transaction'}
              </button>
            </form>
          </article>
        </section>

        <footer className="app-footer">
          <span>FinSight · Personal Finance Insights</span>
          <span>Powered by FastAPI and PostgreSQL</span>
        </footer>
      </main>
    </div>
  )
}

export default App
