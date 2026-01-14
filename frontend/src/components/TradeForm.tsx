import React, { useState } from 'react'
import { apiClient } from '../api/client'

interface TradeFormProps {
  onTradeCreated?: () => void
  onClose?: () => void
  selectedDate?: string // YYYY-MM-DD format
  editingTrade?: {
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
    post_trade_notes?: string
  }
}

interface FormData {
  ticker: string
  option_type: 'call' | 'put'
  strike_price: number
  contracts: number
  entry_price: number
  exit_price: number | null
  entry_time: string
  fees: number
  post_trade_notes: string
}

const TradeForm: React.FC<TradeFormProps> = ({ onTradeCreated, onClose, selectedDate, editingTrade }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Create initial entry time based on selected date or current time
  const getInitialEntryTime = () => {
    if (editingTrade) {
      return new Date(editingTrade.entry_time).toISOString().slice(0, 16)
    }
    if (selectedDate) {
      // Use the selected date at 9:30 AM (market open)
      const date = new Date(selectedDate)
      date.setHours(9, 30, 0, 0)
      return date.toISOString().slice(0, 16)
    }
    return new Date().toISOString().slice(0, 16)
  }
  
  const [formData, setFormData] = useState<FormData>({
    ticker: editingTrade?.ticker || '',
    option_type: editingTrade?.option_type || 'call',
    strike_price: editingTrade?.strike_price || 5900,
    contracts: editingTrade?.contracts || 1,
    entry_price: editingTrade?.entry_price || 2.50,
    exit_price: editingTrade?.exit_price || null,
    entry_time: getInitialEntryTime(),
    fees: editingTrade?.fees || 0,
    post_trade_notes: editingTrade?.post_trade_notes || ''
  })
  
  const [isLong, setIsLong] = useState(editingTrade ? editingTrade.option_type === 'call' : true) // true = LONG/call, false = SHORT/put

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
    }))
  }

  const toggleSide = () => {
    const newIsLong = !isLong
    setIsLong(newIsLong)
    setFormData(prev => ({
      ...prev,
      option_type: newIsLong ? 'call' : 'put'
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare the trade data for the API
      const tradeData = {
        ticker: formData.ticker,
        option_type: formData.option_type,
        strike_price: formData.strike_price,
        entry_price: formData.entry_price,
        exit_price: formData.exit_price || undefined,
        entry_time: new Date(formData.entry_time).toISOString(),
        exit_time: formData.exit_price ? new Date().toISOString() : undefined,
        contracts: formData.contracts,
        fees: formData.fees,
        post_trade_notes: formData.post_trade_notes || undefined,
        pre_trade_emotion: undefined,
        setup_type: undefined,
        what_went_right: undefined,
        what_went_wrong: undefined,
        confidence_level: 3
      }

      if (editingTrade) {
        await apiClient.updateTrade(editingTrade.id, tradeData)
        alert('Trade updated successfully!')
      } else {
        await apiClient.createTrade(tradeData)
        alert('Trade created successfully!')
      }
      
      // Reset form
      setFormData({
        ticker: '',
        option_type: 'call',
        strike_price: 5900,
        contracts: 1,
        entry_price: 2.50,
        exit_price: null,
        entry_time: getInitialEntryTime(),
        fees: 0,
        post_trade_notes: ''
      })
      setIsLong(true)
      
      onTradeCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trade')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal">
      <div className="modal-header">
        <h2 className="modal-title">
          {editingTrade ? 'Edit Trade' : 'Add New Trade'}
          {selectedDate && !editingTrade ? ` - ${new Date(selectedDate).toLocaleDateString()}` : ''}
        </h2>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">Symbol</label>
            <input 
              type="text"
              name="ticker" 
              value={formData.ticker} 
              onChange={handleInputChange}
              className="form-input symbol-input" 
              placeholder="SPX"
              required
              maxLength={10}
            />
          </div>
          
          <div>
            <label className="form-label">Side</label>
            <button
              type="button"
              onClick={toggleSide}
              className={`side-toggle ${isLong ? 'long' : 'short'}`}
            >
              {isLong ? 'LONG' : 'SHORT'}
            </button>
          </div>
          
          <div>
            <label className="form-label">Strike</label>
            <input 
              type="number" 
              name="strike_price"
              value={formData.strike_price}
              onChange={handleInputChange}
              className="form-input" 
              placeholder="5900" 
              required 
            />
          </div>
          
          <div>
            <label className="form-label">Quantity</label>
            <input 
              type="number" 
              name="contracts"
              value={formData.contracts}
              onChange={handleInputChange}
              className="form-input" 
              placeholder="1" 
              min="1" 
              required 
            />
          </div>
          
          <div>
            <label className="form-label">Entry Price</label>
            <input 
              type="number" 
              step="0.01" 
              name="entry_price"
              value={formData.entry_price}
              onChange={handleInputChange}
              className="form-input" 
              placeholder="2.50" 
              required 
            />
          </div>
          
          <div>
            <label className="form-label">Exit Price (Optional)</label>
            <input 
              type="number" 
              step="0.01" 
              name="exit_price"
              value={formData.exit_price || ''}
              onChange={handleInputChange}
              className="form-input" 
              placeholder="3.25" 
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="form-label">Entry Time</label>
          <input 
            type="datetime-local" 
            name="entry_time"
            value={formData.entry_time}
            onChange={handleInputChange}
            className="form-input" 
            required 
          />
        </div>

        <div className="mb-6">
          <label className="form-label">Notes</label>
          <textarea 
            name="post_trade_notes"
            value={formData.post_trade_notes}
            onChange={handleInputChange}
            className="form-input" 
            rows={3} 
            placeholder="Trade setup, emotions, what happened..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            {isSubmitting ? 
              (editingTrade ? 'Updating Trade...' : 'Creating Trade...') : 
              (editingTrade ? 'Update Trade' : 'Create Trade')
            }
          </button>
          
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default TradeForm