import React, { useState, useEffect } from 'react'
import { apiClient } from '../api/client'

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

interface PerformanceByDay {
  [key: string]: {
    trades: number
    pnl: number
    winRate: number
  }
}

interface PerformanceByHour {
  [key: number]: {
    trades: number
    pnl: number
    winRate: number
  }
}

interface SymbolStats {
  symbol: string
  trades: number
  pnl: number
  pnlPercent: number
  pnlContribution: number
}

const Stats: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState('all')

  useEffect(() => {
    fetchTrades()
  }, [])

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

  // Filter trades based on time filter
  const getFilteredTrades = () => {
    const now = new Date()
    let startDate = new Date(0) // Default to all time

    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return trades.filter(trade => {
          const tradeDate = new Date(trade.entry_time)
          return tradeDate >= startDate && tradeDate < endDate
        })
      case 'thisWeek':
        const dayOfWeek = now.getDay()
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
        break
      case 'lastWeek':
        const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7)
        const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        return trades.filter(trade => {
          const tradeDate = new Date(trade.entry_time)
          return tradeDate >= lastWeekStart && tradeDate < lastWeekEnd
        })
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
        return trades.filter(trade => {
          const tradeDate = new Date(trade.entry_time)
          return tradeDate >= lastMonthStart && tradeDate < lastMonthEnd
        })
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'lastYear':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
        const lastYearEnd = new Date(now.getFullYear(), 0, 1)
        return trades.filter(trade => {
          const tradeDate = new Date(trade.entry_time)
          return tradeDate >= lastYearStart && tradeDate < lastYearEnd
        })
      case 'reset':
        return []
      default:
        return trades
    }

    return trades.filter(trade => new Date(trade.entry_time) >= startDate)
  }

  const filteredTrades = getFilteredTrades()
  const closedTrades = filteredTrades.filter(trade => !trade.is_open)
  const winningTrades = closedTrades.filter(trade => trade.pnl && trade.pnl > 0)
  const losingTrades = closedTrades.filter(trade => trade.pnl && trade.pnl < 0)

  // Core metrics
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
  const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const totalGross = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0))
  const profitFactor = totalLoss > 0 ? totalGross / totalLoss : totalGross > 0 ? 999 : 0
  const expectancy = closedTrades.length > 0 ? totalPnL / closedTrades.length : 0

  // Average hold times
  const getHoldTime = (trade: Trade) => {
    if (!trade.exit_time) return 0
    return new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()
  }

  const avgWinHold = winningTrades.length > 0 
    ? winningTrades.reduce((sum, trade) => sum + getHoldTime(trade), 0) / winningTrades.length
    : 0
  
  const avgLossHold = losingTrades.length > 0 
    ? losingTrades.reduce((sum, trade) => sum + getHoldTime(trade), 0) / losingTrades.length
    : 0

  const formatHoldTime = (ms: number) => {
    if (ms === 0) return '0.0 Sec'
    const minutes = ms / (1000 * 60)
    if (minutes < 1) return `${(ms / 1000).toFixed(1)} Sec`
    return `${minutes.toFixed(1)} Min`
  }

  // Win/Loss streaks
  const getStreaks = () => {
    let currentWinStreak = 0
    let currentLossStreak = 0
    let maxWinStreak = 0
    let maxLossStreak = 0

    closedTrades
      .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())
      .forEach(trade => {
        if (trade.pnl && trade.pnl > 0) {
          currentWinStreak++
          currentLossStreak = 0
          maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
        } else if (trade.pnl && trade.pnl < 0) {
          currentLossStreak++
          currentWinStreak = 0
          maxLossStreak = Math.max(maxLossStreak, currentLossStreak)
        }
      })

    return { winStreak: maxWinStreak, lossStreak: maxLossStreak }
  }

  const streaks = getStreaks()

  // Performance by day of week
  const getPerformanceByDay = (): PerformanceByDay => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayStats: PerformanceByDay = {}

    days.forEach(day => {
      dayStats[day] = { trades: 0, pnl: 0, winRate: 0 }
    })

    closedTrades.forEach(trade => {
      const dayName = days[new Date(trade.entry_time).getDay()]
      dayStats[dayName].trades++
      dayStats[dayName].pnl += trade.pnl || 0
    })

    Object.keys(dayStats).forEach(day => {
      const dayTrades = closedTrades.filter(
        trade => days[new Date(trade.entry_time).getDay()] === day
      )
      const dayWins = dayTrades.filter(trade => trade.pnl && trade.pnl > 0).length
      dayStats[day].winRate = dayTrades.length > 0 ? (dayWins / dayTrades.length) * 100 : 0
    })

    return dayStats
  }

  // Performance by hour
  const getPerformanceByHour = (): PerformanceByHour => {
    const hourStats: PerformanceByHour = {}

    for (let i = 0; i < 24; i++) {
      hourStats[i] = { trades: 0, pnl: 0, winRate: 0 }
    }

    closedTrades.forEach(trade => {
      const hour = new Date(trade.entry_time).getHours()
      hourStats[hour].trades++
      hourStats[hour].pnl += trade.pnl || 0
    })

    Object.keys(hourStats).forEach(hour => {
      const hourNum = parseInt(hour)
      const hourTrades = closedTrades.filter(
        trade => new Date(trade.entry_time).getHours() === hourNum
      )
      const hourWins = hourTrades.filter(trade => trade.pnl && trade.pnl > 0).length
      hourStats[hourNum].winRate = hourTrades.length > 0 ? (hourWins / hourTrades.length) * 100 : 0
    })

    return hourStats
  }

  // Symbol breakdown
  const getSymbolStats = (): SymbolStats[] => {
    const symbolMap: { [symbol: string]: { trades: number; pnl: number } } = {}

    closedTrades.forEach(trade => {
      if (!symbolMap[trade.ticker]) {
        symbolMap[trade.ticker] = { trades: 0, pnl: 0 }
      }
      symbolMap[trade.ticker].trades++
      symbolMap[trade.ticker].pnl += trade.pnl || 0
    })

    return Object.entries(symbolMap).map(([symbol, stats]) => ({
      symbol,
      trades: stats.trades,
      pnl: stats.pnl,
      pnlPercent: totalPnL !== 0 ? (stats.pnl / Math.abs(totalPnL)) * 100 : 0,
      pnlContribution: totalPnL !== 0 ? (stats.pnl / totalPnL) * 100 : 0
    })).sort((a, b) => b.pnl - a.pnl)
  }

  const dayPerformance = getPerformanceByDay()
  const hourPerformance = getPerformanceByHour()
  const symbolStats = getSymbolStats()

  // Find best performing hour
  const bestHour = Object.entries(hourPerformance)
    .filter(([_, stats]) => stats.trades > 0)
    .reduce((best, [hour, stats]) => 
      stats.pnl > best.pnl ? { hour: parseInt(hour), pnl: stats.pnl } : best,
      { hour: -1, pnl: -Infinity }
    )

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
        Loading stats...
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    )
  }

  return (
    <div className="stats-page">
      {/* Performance Summary Cards */}
      <div className="performance-summary">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Performance Overview</div>
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="time-select"
            >
              <option value="all">All Time</option>
              <option value="thisYear">This Year</option>
              <option value="thisMonth">This Month</option>
              <option value="thisWeek">This Week</option>
              <option value="today">Today</option>
            </select>
          </div>
          
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-label">Total P&L</div>
              <div className={`metric-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Win Rate</div>
              <div className="metric-value">{winRate.toFixed(1)}%</div>
              <div className="metric-detail">{winningTrades.length} / {closedTrades.length} trades</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Profit Factor</div>
              <div className="metric-value">{profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Best Trade</div>
              <div className="metric-value positive">
                ${winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)).toFixed(2) : '0'}
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Worst Trade</div>
              <div className="metric-value negative">
                -${losingTrades.length > 0 ? Math.abs(Math.min(...losingTrades.map(t => t.pnl || 0))).toFixed(2) : '0'}
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Avg Hold Time</div>
              <div className="metric-value">
                {formatHoldTime((avgWinHold + avgLossHold) / 2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Patterns */}
      <div className="trading-patterns">
        <div className="card" style={{ flex: 2 }}>
          <div className="card-header">
            <div className="card-title">Trading Activity by Day</div>
          </div>
          <div className="day-performance-grid">
            {Object.entries(dayPerformance).map(([day, stats]) => (
              <div key={day} className="day-performance-item">
                <div className="day-name">{day.slice(0, 3)}</div>
                <div className="day-trades">{stats.trades} trades</div>
                <div className={`day-pnl ${stats.pnl >= 0 ? 'positive' : 'negative'}`}>
                  {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(0)}
                </div>
                <div className="day-winrate">{stats.winRate.toFixed(0)}% win</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <div className="card-title">Quick Stats</div>
          </div>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="quick-stat-label">Current Streak</span>
              <span className="quick-stat-value">
                {streaks.winStreak > 0 ? `${streaks.winStreak} wins` : `${streaks.lossStreak} losses`}
              </span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-label">Expectancy</span>
              <span className={`quick-stat-value ${expectancy >= 0 ? 'positive' : 'negative'}`}>
                ${expectancy.toFixed(2)}
              </span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-label">Avg Win</span>
              <span className="quick-stat-value positive">
                ${winningTrades.length > 0 ? 
                  (winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / winningTrades.length).toFixed(2) 
                  : '0'
                }
              </span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-label">Avg Loss</span>
              <span className="quick-stat-value negative">
                ${losingTrades.length > 0 ? 
                  Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / losingTrades.length).toFixed(2) 
                  : '0'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Symbol Breakdown */}
      <div className="symbol-breakdown">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Performance by Symbol</div>
          </div>
          
          {symbolStats.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Trades</th>
                    <th>Win Rate</th>
                    <th>Total P&L</th>
                    <th>Avg P&L</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {symbolStats.map(symbol => {
                    const symbolTrades = closedTrades.filter(t => t.ticker === symbol.symbol)
                    const symbolWins = symbolTrades.filter(t => t.pnl && t.pnl > 0).length
                    const symbolWinRate = symbolTrades.length > 0 ? (symbolWins / symbolTrades.length) * 100 : 0
                    const avgPnL = symbol.trades > 0 ? symbol.pnl / symbol.trades : 0
                    
                    return (
                      <tr key={symbol.symbol}>
                        <td className="symbol-col">{symbol.symbol}</td>
                        <td>{symbol.trades}</td>
                        <td>{symbolWinRate.toFixed(1)}%</td>
                        <td className={symbol.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                          {symbol.pnl >= 0 ? '+' : ''}${symbol.pnl.toFixed(2)}
                        </td>
                        <td className={avgPnL >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                          {avgPnL >= 0 ? '+' : ''}${avgPnL.toFixed(2)}
                        </td>
                        <td>{Math.abs(symbol.pnlContribution).toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
              No trading data available for the selected period
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Stats