from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum

class OptionType(str, Enum):
    CALL = "call"
    PUT = "put"

class SetupType(str, Enum):
    BREAKOUT = "breakout"
    REVERSAL = "reversal"
    MOMENTUM = "momentum"
    SCALP = "scalp"
    SWING = "swing"
    OTHER = "other"

class TradeBase(BaseModel):
    ticker: str = Field(..., description="Stock ticker (SPX, SPY, QQQ, etc.)")
    option_type: OptionType
    strike_price: float = Field(..., gt=0)
    entry_price: float = Field(..., gt=0)
    exit_price: Optional[float] = Field(None, gt=0)
    entry_time: datetime
    exit_time: Optional[datetime] = None
    contracts: int = Field(..., gt=0)
    fees: float = Field(0.0, ge=0)
    
    # Psychology fields
    pre_trade_emotion: Optional[str] = None
    post_trade_notes: Optional[str] = None
    setup_type: Optional[SetupType] = None
    what_went_right: Optional[str] = None
    what_went_wrong: Optional[str] = None
    screenshot_url: Optional[str] = None
    confidence_level: Optional[int] = Field(None, ge=1, le=5)

class TradeCreate(TradeBase):
    pass

class TradeUpdate(BaseModel):
    exit_price: Optional[float] = None
    exit_time: Optional[datetime] = None
    post_trade_notes: Optional[str] = None
    what_went_right: Optional[str] = None
    what_went_wrong: Optional[str] = None
    confidence_level: Optional[int] = Field(None, ge=1, le=5)

class Trade(TradeBase):
    id: int
    pnl: Optional[float] = None
    is_open: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DailySummaryBase(BaseModel):
    date: date
    total_pnl: float = 0.0
    trade_count: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    max_risk: float = 0.0
    total_volume: int = 0
    daily_notes: Optional[str] = None
    market_conditions: Optional[str] = None

class DailySummaryCreate(DailySummaryBase):
    pass

class DailySummary(DailySummaryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MonthlyPnL(BaseModel):
    date: str  # YYYY-MM-DD format
    pnl: Optional[float] = None

class CalendarData(BaseModel):
    month: int
    year: int
    daily_pnl: list[MonthlyPnL]