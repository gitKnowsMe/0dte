import React, { useState, useEffect } from 'react'
import { apiClient } from '../api/client'

interface CalendarProps {
  onDateClick?: (date: string) => void
}

interface DaySummary {
  date: string
  total_pnl: number
  trade_count: number
}

interface DayData {
  date: number
  summary?: DaySummary
  isCurrentMonth: boolean
  isToday: boolean
}

const Calendar: React.FC<CalendarProps> = ({ onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendarData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getCalendarData(currentDate.getFullYear(), currentDate.getMonth() + 1)
      
      // Convert the API response to day summaries
      const summaries: DaySummary[] = data.daily_pnl.map(dayData => ({
        date: dayData.date,
        total_pnl: dayData.pnl || 0,
        trade_count: dayData.pnl !== undefined && dayData.pnl !== null ? 1 : 0 // Only count if pnl has a real value
      }))
      
      setDaySummaries(summaries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar data')
      console.error('Failed to fetch calendar data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate])

  const getDaySummary = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return daySummaries.find(summary => summary.date === dateStr)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    
    // Start from the Sunday before the first day
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days: DayData[] = []
    const today = new Date()
    
    for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
      const dayDate = new Date(startDate)
      dayDate.setDate(startDate.getDate() + i)
      
      const dayNum = dayDate.getDate()
      const isCurrentMonth = dayDate.getMonth() === month
      const isToday = dayDate.toDateString() === today.toDateString()
      const summary = isCurrentMonth ? getDaySummary(dayNum) : undefined
      
      days.push({
        date: dayNum,
        summary,
        isCurrentMonth,
        isToday
      })
    }
    
    return days
  }

  const formatPnL = (pnl: number) => {
    if (pnl === 0) return '$0'
    return pnl > 0 ? `+$${pnl.toFixed(0)}` : `-$${Math.abs(pnl).toFixed(0)}`
  }

  const getDayClassName = (day: DayData) => {
    let className = "calendar-day"
    
    if (!day.isCurrentMonth) {
      className += " other-month"
      return className
    }
    
    if (day.summary && day.summary.total_pnl !== 0) {
      if (day.summary.total_pnl > 0) {
        className += " profit"
      } else {
        className += " loss"
      }
    } else {
      className += " neutral"
    }
    
    if (day.isToday) {
      className += " today"
    }
    
    return className
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = getDaysInMonth(currentDate)

  if (loading) {
    return (
      <div className="calendar-container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
          Loading calendar...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="calendar-container">
        <div className="error">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-container">
      {/* Header */}
      <div className="calendar-header">
        <button 
          onClick={() => navigateMonth('prev')}
          className="calendar-nav"
        >
          ‹
        </button>
        <div className="calendar-title">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button 
          onClick={() => navigateMonth('next')}
          className="calendar-nav"
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid">
        {/* Week days header */}
        {weekDays.map(day => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
          
          return (
            <div
              key={index}
              className={getDayClassName(day)}
              onDoubleClick={() => {
                if (day.isCurrentMonth && onDateClick) {
                  onDateClick(dateStr)
                }
              }}
              style={{ cursor: day.isCurrentMonth ? 'pointer' : 'default' }}
            >
              <div className="calendar-day-number">{day.date}</div>
              
              {day.summary && day.summary.trade_count > 0 && (
                <div className="calendar-trade-count">
                  {day.summary.trade_count} trade{day.summary.trade_count !== 1 ? 's' : ''}
                </div>
              )}
              
              {day.summary && day.summary.total_pnl !== 0 && (
                <div className="calendar-pnl">
                  {formatPnL(day.summary.total_pnl)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Calendar