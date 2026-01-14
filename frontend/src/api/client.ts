const API_BASE_URL = 'http://localhost:8000/api'

export interface Trade {
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
  pre_trade_emotion?: string
  post_trade_notes?: string
  setup_type?: string
  what_went_right?: string
  what_went_wrong?: string
  screenshot_url?: string
  confidence_level?: number
  created_at: string
  updated_at: string
}

export interface TradeCreate {
  ticker: string
  option_type: 'call' | 'put'
  strike_price: number
  entry_price: number
  exit_price?: number
  entry_time: string
  exit_time?: string
  contracts: number
  fees: number
  pre_trade_emotion?: string
  post_trade_notes?: string
  setup_type?: string
  what_went_right?: string
  what_went_wrong?: string
  screenshot_url?: string
  confidence_level?: number
}

export interface DailySummary {
  id: number
  date: string
  total_pnl: number
  trade_count: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  max_risk: number
  total_volume: number
  daily_notes?: string
  market_conditions?: string
  created_at: string
  updated_at: string
}

export interface CalendarData {
  month: number
  year: number
  daily_pnl: Array<{
    date: string
    pnl?: number
  }>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Trades API
  async getTrades(params?: {
    skip?: number
    limit?: number
    ticker?: string
    start_date?: string
    end_date?: string
  }): Promise<Trade[]> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const endpoint = `/trades?${queryParams.toString()}`
    return this.request<Trade[]>(endpoint)
  }

  async getTrade(tradeId: number): Promise<Trade> {
    return this.request<Trade>(`/trades/${tradeId}`)
  }

  async createTrade(trade: TradeCreate): Promise<Trade> {
    return this.request<Trade>('/trades', {
      method: 'POST',
      body: JSON.stringify(trade),
    })
  }

  async updateTrade(tradeId: number, updates: Partial<TradeCreate>): Promise<Trade> {
    return this.request<Trade>(`/trades/${tradeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteTrade(tradeId: number): Promise<{ message: string }> {
    return this.request(`/trades/${tradeId}`, {
      method: 'DELETE',
    })
  }

  // Calendar API
  async getCalendarData(year: number, month: number): Promise<CalendarData> {
    return this.request<CalendarData>(`/trades/calendar/${year}/${month}`)
  }

  // Daily Summaries API
  async getDailySummaries(params?: {
    skip?: number
    limit?: number
    start_date?: string
    end_date?: string
  }): Promise<DailySummary[]> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const endpoint = `/summaries?${queryParams.toString()}`
    return this.request<DailySummary[]>(endpoint)
  }

  async getDailySummary(date: string): Promise<DailySummary> {
    return this.request<DailySummary>(`/summaries/${date}`)
  }

  async getMonthlyStats(year: number, month: number) {
    return this.request(`/summaries/stats/monthly/${year}/${month}`)
  }

  async getWeeklyStats(weeks: number = 4) {
    return this.request(`/summaries/stats/weekly?weeks=${weeks}`)
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health')
  }
}

export const apiClient = new ApiClient()