from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from typing import List, Optional
from datetime import date, datetime

from app.database import get_db
from app.models import Trade, DailySummary
from app.schemas import Trade as TradeSchema, TradeCreate, TradeUpdate, CalendarData, MonthlyPnL

router = APIRouter()

def calculate_pnl(trade: Trade) -> Optional[float]:
    """Calculate P&L for a trade"""
    if trade.exit_price is None:
        return None
    
    pnl_per_contract = (trade.exit_price - trade.entry_price) * 100  # Options are per 100 shares
    if trade.option_type == "put":
        pnl_per_contract = -pnl_per_contract  # Inverse for puts
    
    total_pnl = pnl_per_contract * trade.contracts - trade.fees
    return round(total_pnl, 2)

@router.post("/", response_model=TradeSchema)
def create_trade(trade: TradeCreate, db: Session = Depends(get_db)):
    """Create a new trade"""
    db_trade = Trade(**trade.dict())
    
    # Calculate P&L if trade is closed
    if db_trade.exit_price is not None:
        db_trade.pnl = calculate_pnl(db_trade)
        db_trade.is_open = False
    
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)
    
    # Update daily summary
    update_daily_summary(db, db_trade.entry_time.date())
    
    return db_trade

@router.get("/", response_model=List[TradeSchema])
def get_trades(
    skip: int = 0, 
    limit: int = 100, 
    ticker: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get trades with optional filters"""
    query = db.query(Trade)
    
    if ticker:
        query = query.filter(Trade.ticker == ticker)
    if start_date:
        query = query.filter(Trade.entry_time >= start_date)
    if end_date:
        query = query.filter(Trade.entry_time <= end_date)
    
    return query.offset(skip).limit(limit).all()

@router.get("/{trade_id}", response_model=TradeSchema)
def get_trade(trade_id: int, db: Session = Depends(get_db)):
    """Get a specific trade"""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if trade is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade

@router.put("/{trade_id}", response_model=TradeSchema)
def update_trade(trade_id: int, trade_update: TradeUpdate, db: Session = Depends(get_db)):
    """Update a trade (typically to close it)"""
    db_trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if db_trade is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    update_data = trade_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_trade, field, value)
    
    # Recalculate P&L if exit price is updated
    if "exit_price" in update_data and db_trade.exit_price is not None:
        db_trade.pnl = calculate_pnl(db_trade)
        db_trade.is_open = False
    
    db.commit()
    db.refresh(db_trade)
    
    # Update daily summary
    update_daily_summary(db, db_trade.entry_time.date())
    
    return db_trade

@router.delete("/{trade_id}")
def delete_trade(trade_id: int, db: Session = Depends(get_db)):
    """Delete a trade"""
    db_trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if db_trade is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    trade_date = db_trade.entry_time.date()
    db.delete(db_trade)
    db.commit()
    
    # Update daily summary
    update_daily_summary(db, trade_date)
    
    return {"message": "Trade deleted"}

@router.get("/calendar/{year}/{month}", response_model=CalendarData)
def get_calendar_data(year: int, month: int, db: Session = Depends(get_db)):
    """Get P&L data for calendar view"""
    # Get daily summaries for the month
    daily_summaries = db.query(DailySummary).filter(
        and_(
            extract('year', DailySummary.date) == year,
            extract('month', DailySummary.date) == month
        )
    ).all()
    
    # Convert to calendar format
    daily_pnl = []
    for summary in daily_summaries:
        daily_pnl.append(MonthlyPnL(
            date=summary.date.isoformat(),
            pnl=summary.total_pnl if summary.total_pnl != 0 else None
        ))
    
    return CalendarData(month=month, year=year, daily_pnl=daily_pnl)

def update_daily_summary(db: Session, trade_date: date):
    """Update or create daily summary for a given date"""
    # Get all trades for this date
    trades = db.query(Trade).filter(
        func.date(Trade.entry_time) == trade_date
    ).all()
    
    # Calculate daily metrics
    total_pnl = sum(trade.pnl or 0 for trade in trades if trade.pnl is not None)
    trade_count = len([t for t in trades if not t.is_open])
    winning_trades = len([t for t in trades if t.pnl and t.pnl > 0])
    losing_trades = len([t for t in trades if t.pnl and t.pnl < 0])
    win_rate = (winning_trades / trade_count * 100) if trade_count > 0 else 0
    total_volume = sum(trade.contracts for trade in trades)
    
    # Get or create daily summary
    daily_summary = db.query(DailySummary).filter(
        DailySummary.date == trade_date
    ).first()
    
    if daily_summary is None:
        daily_summary = DailySummary(
            date=trade_date,
            total_pnl=total_pnl,
            trade_count=trade_count,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            total_volume=total_volume
        )
        db.add(daily_summary)
    else:
        daily_summary.total_pnl = total_pnl
        daily_summary.trade_count = trade_count
        daily_summary.winning_trades = winning_trades
        daily_summary.losing_trades = losing_trades
        daily_summary.win_rate = win_rate
        daily_summary.total_volume = total_volume
        daily_summary.updated_at = datetime.now()
    
    db.commit()