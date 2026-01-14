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

interface TradesModalProps {
  date: string
  onClose: () => void
  onAddTrade?: (date: string) => void
  onEditTrade?: (trade: Trade) => void
  onDeleteTrade?: (tradeId: number) => void
  onTradesUpdated?: () => void
}

const TradesModal: React.FC<TradesModalProps> = ({ date, onClose, onAddTrade, onEditTrade, onDeleteTrade, onTradesUpdated }) => {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTradesForDate()
  }, [date])

  const fetchTradesForDate = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch trades and filter by date
      const allTrades = await apiClient.getTrades()
      const dateStr = date.split('T')[0] // Get just the date part
      
      const tradesForDate = allTrades.filter(trade => {
        const tradeDate = new Date(trade.entry_time).toISOString().split('T')[0]
        return tradeDate === dateStr
      })
      
      setTrades(tradesForDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trades')
      console.error('Failed to fetch trades for date:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTrade = async (tradeId: number) => {
    try {
      await onDeleteTrade?.(tradeId)
      // Refresh the trades for this modal after deletion
      fetchTradesForDate()
      // Notify parent component to refresh calendar
      onTradesUpdated?.()
    } catch (err) {
      console.error('Failed to delete trade:', err)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getTotalPnL = () => {
    return trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  }

  const getTradeCount = () => {
    return trades.length
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            Trades for {formatDate(date)}
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className="btn btn-primary"
              onClick={() => onAddTrade?.(date)}
            >
              + Add Trade
            </button>
            <button onClick={onClose} className="close-btn">
              ×
            </button>
          </div>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
            Loading trades...
          </div>
        ) : trades.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
            <p>No trades found for this date.</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#21262d',
              borderRadius: '6px'
            }}>
              <div>
                <span style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
                  Total Trades
                </span>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#f0f6fc' }}>
                  {getTradeCount()}
                </div>
              </div>
              <div>
                <span style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
                  Total P&L
                </span>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '600',
                  color: getTotalPnL() >= 0 ? '#3fb950' : '#f85149'
                }}>
                  {getTotalPnL() >= 0 ? '+' : ''}${getTotalPnL().toFixed(2)}
                </div>
              </div>
            </div>

            {/* Trades Table */}
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Strike</th>
                    <th>Qty</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>P&L</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(trade => (
                    <tr 
                      key={trade.id}
                      className="trade-row"
                    >
                      <td>{formatTime(trade.entry_time)}</td>
                      <td className="symbol-col">{trade.ticker}</td>
                      <td style={{ textTransform: 'uppercase' }}>
                        {trade.option_type}
                      </td>
                      <td>${trade.strike_price}</td>
                      <td>{trade.contracts}</td>
                      <td>${trade.entry_price.toFixed(2)}</td>
                      <td>
                        {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
                      </td>
                      <td className={
                        trade.pnl && trade.pnl > 0 ? 'pnl-positive' : 
                        trade.pnl && trade.pnl < 0 ? 'pnl-negative' : 'pnl-neutral'
                      }>
                        {trade.pnl ? 
                          (trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`) 
                          : '-'
                        }
                      </td>
                      <td style={{ position: 'relative' }}>
                        <span className={`status-badge ${
                          trade.is_open ? 'status-open' :
                          (trade.pnl && trade.pnl > 0) ? 'status-win' : 'status-loss'
                        }`}>
                          {trade.is_open ? 'OPEN' : 
                           (trade.pnl && trade.pnl > 0) ? 'WIN' : 'LOSS'}
                        </span>
                        <div className="trade-actions">
                          <button
                            className="trade-action-btn edit"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditTrade?.(trade)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="trade-action-btn delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm('Are you sure you want to delete this trade?')) {
                                handleDeleteTrade(trade.id)
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
          </>
        )}
      </div>
    </div>
  )
}

export default TradesModal