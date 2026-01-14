import { useState, useEffect } from 'react'
import TradeForm from './components/TradeForm'
import Calendar from './components/Calendar'
import TradesModal from './components/TradesModal'
import Stats from './components/Stats'
import { apiClient } from './api/client'

interface Trade {
  id: number
  ticker: string
  option_type: 'call' | 'put'
  strike_price: number
  entry_price: number
  exit_price?: number
  entry_time: string
  exit_time?: string
  contracts: number
  fees: number
  pnl?: number
  is_open: boolean
  post_trade_notes?: string
  created_at: string
}

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showTradeForm, setShowTradeForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [editingTrade, setEditingTrade] = useState<Trade | undefined>(undefined)
  const [showTradesModal, setShowTradesModal] = useState(false)
  const [selectedTradesDate, setSelectedTradesDate] = useState<string>('')
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrades = async () => {
    try {
      setLoading(true)
      setError(null)
      const tradesData = await apiClient.getTrades()
      setTrades(tradesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trades')
      console.error('Failed to fetch trades:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades()
  }, [])

  const handleTradeCreated = () => {
    setShowTradeForm(false)
    setSelectedDate(undefined)
    setEditingTrade(undefined)
    fetchTrades() // Refresh trades list
    setRefreshTrigger(prev => prev + 1) // Trigger calendar refresh
  }

  // Calendar double-click handler
  const handleDateDoubleClick = (date: string) => {
    setSelectedTradesDate(date)
    setShowTradesModal(true)
  }

  // Handlers for TradesModal
  const handleAddTradeFromModal = (date: string) => {
    setSelectedDate(date)
    setEditingTrade(undefined)
    setShowTradesModal(false)
    setShowTradeForm(true)
  }

  const handleEditTradeFromModal = (trade: Trade) => {
    setEditingTrade(trade)
    setSelectedDate(undefined)
    setShowTradesModal(false)
    setShowTradeForm(true)
  }

  const handleDeleteTradeFromModal = async (tradeId: number) => {
    try {
      await apiClient.deleteTrade(tradeId)
      fetchTrades() // Refresh trades list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trade')
      console.error('Failed to delete trade:', err)
    }
  }

  const handleTradesUpdated = () => {
    setRefreshTrigger(prev => prev + 1) // Trigger calendar refresh when trades are updated
  }

  const handleEditTradeFromDashboard = (tradeId: number) => {
    const trade = trades.find(t => t.id === tradeId)
    if (trade) {
      setEditingTrade(trade)
      setSelectedDate(undefined)
      setShowTradeForm(true)
    }
  }

  const handleDeleteTradeFromDashboard = async (tradeId: number) => {
    try {
      await apiClient.deleteTrade(tradeId)
      fetchTrades() // Refresh trades list
      setRefreshTrigger(prev => prev + 1) // Trigger calendar refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trade')
      console.error('Failed to delete trade:', err)
    }
  }

  // Calculate stats from real data
  const stats = {
    totalPnL: trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0),
    totalTrades: trades.filter(trade => !trade.is_open).length,
    winningTrades: trades.filter(trade => trade.pnl && trade.pnl > 0).length,
    winRate: trades.length > 0 ? 
      (trades.filter(trade => trade.pnl && trade.pnl > 0).length / trades.filter(trade => !trade.is_open).length * 100) || 0 : 0,
    avgReturn: trades.filter(trade => !trade.is_open).length > 0 ?
      trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / trades.filter(trade => !trade.is_open).length : 0
  }

  // Format trade data for display
  const formatTradeForTable = (trade: Trade) => {
    const entryDate = new Date(trade.entry_time)
    const exitDate = trade.exit_time ? new Date(trade.exit_time) : null
    const duration = exitDate ? Math.abs(exitDate.getTime() - entryDate.getTime()) : null
    
    return {
      id: trade.id,
      date: entryDate.toLocaleDateString(),
      symbol: trade.ticker,
      status: trade.is_open ? 'OPEN' : (trade.pnl && trade.pnl > 0 ? 'WIN' : 'LOSS'),
      side: trade.option_type === 'call' ? 'Call' : 'Put',
      qty: trade.contracts,
      entry: `$${trade.entry_price.toFixed(2)}`,
      exit: trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-',
      pnl: trade.pnl ? (trade.pnl > 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`) : '-',
      return: trade.pnl && trade.entry_price ? 
        (trade.pnl / (trade.entry_price * trade.contracts * 100) * 100).toFixed(2) + '%' : '-',
      time: duration ? Math.round(duration / (1000 * 60)) + ' min' : '-'
    }
  }

  const displayTrades = trades.map(formatTradeForTable).slice(0, 10) // Show last 10 trades

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            📊 0DTE Journal
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <a 
            href="#" 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <span className="nav-icon">📈</span>
            Dashboard
          </a>
          <a 
            href="#" 
            className={`nav-item ${currentView === 'trades' ? 'active' : ''}`}
            onClick={() => setCurrentView('trades')}
          >
            <span className="nav-icon">📋</span>
            Trades
          </a>
          <a 
            href="#" 
            className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`}
            onClick={() => setCurrentView('calendar')}
          >
            <span className="nav-icon">📅</span>
            Calendar
          </a>
          <a 
            href="#" 
            className={`nav-item ${currentView === 'stats' ? 'active' : ''}`}
            onClick={() => setCurrentView('stats')}
          >
            <span className="nav-icon">📊</span>
            Stats
          </a>
        </nav>
        
        <div style={{ marginTop: 'auto', padding: '0 24px' }}>
          <button 
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => setShowTradeForm(true)}
          >
            + New Trade
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <div className="content-header">
          <div style={{ padding: '16px 0' }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#f0f6fc', marginBottom: '4px' }}>
                  {currentView === 'dashboard' && 'Dashboard'}
                  {currentView === 'trades' && 'All Trades'}
                  {currentView === 'calendar' && 'Trading Calendar'}
                  {currentView === 'stats' && 'Stats'}
                </h1>
                <p style={{ color: '#8b949e', fontSize: '14px' }}>
                  {currentView === 'dashboard' && 'Track your 0DTE options trading performance'}
                  {currentView === 'trades' && 'Complete history of your trades'}
                  {currentView === 'calendar' && 'Monthly view of your trading activity'}
                  {currentView === 'stats' && 'Comprehensive trading analytics and performance metrics'}
                </p>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => setShowTradeForm(true)}
              >
                + New Trade
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="content-body">
          {currentView === 'dashboard' && (
            <>
              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total P&L</div>
                  <div className={`stat-value ${stats.totalPnL >= 0 ? 'stat-positive' : 'stat-negative'}`}>
                    {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                  </div>
                  <div className="stat-change">All time</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Win Rate</div>
                  <div className="stat-value">{stats.winRate.toFixed(1)}%</div>
                  <div className="stat-change">{stats.winningTrades} of {stats.totalTrades} trades</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Trades</div>
                  <div className="stat-value">{trades.length}</div>
                  <div className="stat-change">{stats.totalTrades} closed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg P&L</div>
                  <div className={`stat-value ${stats.avgReturn >= 0 ? 'stat-positive' : 'stat-negative'}`}>
                    {stats.avgReturn >= 0 ? '+' : ''}${stats.avgReturn.toFixed(2)}
                  </div>
                  <div className="stat-change">per trade</div>
                </div>
              </div>

              {/* Recent Trades */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Recent Trades</div>
                  <a href="#" className="btn btn-secondary btn-sm" onClick={() => setCurrentView('trades')}>
                    View All
                  </a>
                </div>
                
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
                    Loading trades...
                  </div>
                ) : trades.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
                    <p>No trades yet. Click "New Trade" to get started!</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Symbol</th>
                          <th>Status</th>
                          <th>Side</th>
                          <th>Qty</th>
                          <th>Entry</th>
                          <th>Exit</th>
                          <th>P&L</th>
                          <th>Return</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayTrades.map(trade => (
                          <tr key={trade.id} className="trade-row">
                            <td>{trade.date}</td>
                            <td className="symbol-col">{trade.symbol}</td>
                            <td>
                              <span className={`status-badge ${
                                trade.status === 'WIN' ? 'status-win' : 
                                trade.status === 'LOSS' ? 'status-loss' : 'status-open'
                              }`}>
                                {trade.status}
                              </span>
                            </td>
                            <td>{trade.side}</td>
                            <td>{trade.qty}</td>
                            <td>{trade.entry}</td>
                            <td>{trade.exit}</td>
                            <td className={
                              trade.pnl.includes('+') ? 'pnl-positive' : 
                              trade.pnl.includes('-') ? 'pnl-negative' : 'pnl-neutral'
                            }>
                              {trade.pnl}
                            </td>
                            <td className={
                              trade.return.includes('+') ? 'return-positive' : 
                              trade.return.includes('-') ? 'return-negative' : 'return-neutral'
                            }>
                              {trade.return}
                            </td>
                            <td style={{ position: 'relative' }}>
                              {trade.time}
                              <div className="trade-actions">
                                <button
                                  className="trade-action-btn edit"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditTradeFromDashboard(trade.id)
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="trade-action-btn delete"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (window.confirm('Are you sure you want to delete this trade?')) {
                                      handleDeleteTradeFromDashboard(trade.id)
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'trades' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">All Trades</div>
              </div>
              
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
                  Loading trades...
                </div>
              ) : error ? (
                <div className="error">
                  {error}
                </div>
              ) : trades.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
                  <p>No trades yet. Click "New Trade" to get started!</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Symbol</th>
                        <th>Status</th>
                        <th>Side</th>
                        <th>Qty</th>
                        <th>Entry</th>
                        <th>Exit</th>
                        <th>P&L</th>
                        <th>Return</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map(formatTradeForTable).map(trade => (
                        <tr key={trade.id} className="trade-row">
                          <td>{trade.date}</td>
                          <td className="symbol-col">{trade.symbol}</td>
                          <td>
                            <span className={`status-badge ${
                              trade.status === 'WIN' ? 'status-win' : 
                              trade.status === 'LOSS' ? 'status-loss' : 'status-open'
                            }`}>
                              {trade.status}
                            </span>
                          </td>
                          <td>{trade.side}</td>
                          <td>{trade.qty}</td>
                          <td>{trade.entry}</td>
                          <td>{trade.exit}</td>
                          <td className={
                            trade.pnl.includes('+') ? 'pnl-positive' : 
                            trade.pnl.includes('-') ? 'pnl-negative' : 'pnl-neutral'
                          }>
                            {trade.pnl}
                          </td>
                          <td className={
                            trade.return.includes('+') ? 'return-positive' : 
                            trade.return.includes('-') ? 'return-negative' : 'return-neutral'
                          }>
                            {trade.return}
                          </td>
                          <td style={{ position: 'relative' }}>
                            {trade.time}
                            <div className="trade-actions">
                              <button
                                className="trade-action-btn edit"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditTradeFromDashboard(trade.id)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="trade-action-btn delete"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm('Are you sure you want to delete this trade?')) {
                                    handleDeleteTradeFromDashboard(trade.id)
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {currentView === 'calendar' && (
            <Calendar 
              key={refreshTrigger}
              onDateClick={handleDateDoubleClick}
            />
          )}

          {currentView === 'stats' && <Stats />}
        </div>
      </main>

      {/* Trade Form Modal */}
      {showTradeForm && (
        <div className="modal-overlay">
          <TradeForm
            onTradeCreated={handleTradeCreated}
            onClose={() => {
              setShowTradeForm(false)
              setSelectedDate(undefined)
              setEditingTrade(undefined)
            }}
            selectedDate={selectedDate}
            editingTrade={editingTrade}
          />
        </div>
      )}

      {/* Trades Modal */}
      {showTradesModal && (
        <TradesModal
          date={selectedTradesDate}
          onClose={() => setShowTradesModal(false)}
          onAddTrade={handleAddTradeFromModal}
          onEditTrade={handleEditTradeFromModal}
          onDeleteTrade={handleDeleteTradeFromModal}
          onTradesUpdated={handleTradesUpdated}
        />
      )}
    </div>
  )
}

export default App
