from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, Date
from sqlalchemy.sql import func
from app.database import Base

class Trade(Base):
    __tablename__ = "trades"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Core trade fields
    ticker = Column(String, nullable=False, index=True)  # SPX, SPY, QQQ, etc.
    option_type = Column(String, nullable=False)  # "call" or "put"
    strike_price = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)  # Null if position still open
    entry_time = Column(DateTime, nullable=False)
    exit_time = Column(DateTime, nullable=True)
    contracts = Column(Integer, nullable=False)
    fees = Column(Float, default=0.0)
    
    # Calculated fields
    pnl = Column(Float, nullable=True)  # Calculated profit/loss
    is_open = Column(Boolean, default=True)  # Whether position is still open
    
    # Psychology and journal fields
    pre_trade_emotion = Column(String, nullable=True)  # How trader felt before trade
    post_trade_notes = Column(Text, nullable=True)     # What happened, lessons learned
    setup_type = Column(String, nullable=True)         # breakout, reversal, etc.
    what_went_right = Column(Text, nullable=True)
    what_went_wrong = Column(Text, nullable=True)
    screenshot_url = Column(String, nullable=True)     # Optional chart screenshot
    confidence_level = Column(Integer, nullable=True)  # 1-5 scale
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class DailySummary(Base):
    __tablename__ = "daily_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    
    # Daily metrics
    total_pnl = Column(Float, default=0.0)
    trade_count = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    win_rate = Column(Float, default=0.0)  # Percentage
    
    # Risk metrics
    max_risk = Column(Float, default=0.0)
    total_volume = Column(Integer, default=0)  # Total contracts traded
    
    # Daily notes
    daily_notes = Column(Text, nullable=True)
    market_conditions = Column(String, nullable=True)  # trending, choppy, etc.
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())