from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract, func
from typing import List, Optional
from datetime import date, timedelta

from app.database import get_db
from app.models import DailySummary
from app.schemas import DailySummary as DailySummarySchema, DailySummaryCreate

router = APIRouter()

@router.get("/", response_model=List[DailySummarySchema])
def get_daily_summaries(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get daily summaries with optional date filtering"""
    query = db.query(DailySummary)
    
    if start_date:
        query = query.filter(DailySummary.date >= start_date)
    if end_date:
        query = query.filter(DailySummary.date <= end_date)
    
    return query.order_by(DailySummary.date.desc()).offset(skip).limit(limit).all()

@router.get("/{summary_date}", response_model=DailySummarySchema)
def get_daily_summary(summary_date: date, db: Session = Depends(get_db)):
    """Get daily summary for a specific date"""
    summary = db.query(DailySummary).filter(DailySummary.date == summary_date).first()
    if summary is None:
        raise HTTPException(status_code=404, detail="Daily summary not found")
    return summary

@router.post("/", response_model=DailySummarySchema)
def create_daily_summary(summary: DailySummaryCreate, db: Session = Depends(get_db)):
    """Create a daily summary (usually auto-generated)"""
    # Check if summary already exists
    existing = db.query(DailySummary).filter(DailySummary.date == summary.date).first()
    if existing:
        raise HTTPException(status_code=400, detail="Daily summary already exists for this date")
    
    db_summary = DailySummary(**summary.dict())
    db.add(db_summary)
    db.commit()
    db.refresh(db_summary)
    return db_summary

@router.get("/stats/monthly/{year}/{month}")
def get_monthly_stats(year: int, month: int, db: Session = Depends(get_db)):
    """Get aggregated statistics for a month"""
    summaries = db.query(DailySummary).filter(
        and_(
            extract('year', DailySummary.date) == year,
            extract('month', DailySummary.date) == month
        )
    ).all()
    
    if not summaries:
        return {
            "month": month,
            "year": year,
            "total_pnl": 0,
            "total_trades": 0,
            "trading_days": 0,
            "win_rate": 0,
            "avg_daily_pnl": 0,
            "best_day": None,
            "worst_day": None,
            "total_volume": 0
        }
    
    total_pnl = sum(s.total_pnl for s in summaries)
    total_trades = sum(s.trade_count for s in summaries)
    trading_days = len([s for s in summaries if s.trade_count > 0])
    total_winning = sum(s.winning_trades for s in summaries)
    win_rate = (total_winning / total_trades * 100) if total_trades > 0 else 0
    avg_daily_pnl = total_pnl / trading_days if trading_days > 0 else 0
    total_volume = sum(s.total_volume for s in summaries)
    
    # Best and worst trading days
    trading_summaries = [s for s in summaries if s.trade_count > 0]
    best_day = max(trading_summaries, key=lambda s: s.total_pnl) if trading_summaries else None
    worst_day = min(trading_summaries, key=lambda s: s.total_pnl) if trading_summaries else None
    
    return {
        "month": month,
        "year": year,
        "total_pnl": round(total_pnl, 2),
        "total_trades": total_trades,
        "trading_days": trading_days,
        "win_rate": round(win_rate, 1),
        "avg_daily_pnl": round(avg_daily_pnl, 2),
        "best_day": {
            "date": best_day.date.isoformat(),
            "pnl": best_day.total_pnl
        } if best_day else None,
        "worst_day": {
            "date": worst_day.date.isoformat(), 
            "pnl": worst_day.total_pnl
        } if worst_day else None,
        "total_volume": total_volume
    }

@router.get("/stats/weekly")
def get_weekly_stats(weeks: int = 4, db: Session = Depends(get_db)):
    """Get weekly performance for the last N weeks"""
    end_date = date.today()
    start_date = end_date - timedelta(weeks=weeks)
    
    summaries = db.query(DailySummary).filter(
        and_(
            DailySummary.date >= start_date,
            DailySummary.date <= end_date
        )
    ).order_by(DailySummary.date).all()
    
    # Group by week
    weekly_stats = {}
    for summary in summaries:
        # Get Monday of the week
        monday = summary.date - timedelta(days=summary.date.weekday())
        week_key = monday.isoformat()
        
        if week_key not in weekly_stats:
            weekly_stats[week_key] = {
                "week_start": week_key,
                "total_pnl": 0,
                "trade_count": 0,
                "trading_days": 0,
                "win_rate": 0,
                "winning_trades": 0
            }
        
        week_stats = weekly_stats[week_key]
        week_stats["total_pnl"] += summary.total_pnl
        week_stats["trade_count"] += summary.trade_count
        week_stats["winning_trades"] += summary.winning_trades
        if summary.trade_count > 0:
            week_stats["trading_days"] += 1
    
    # Calculate win rates
    for week_stats in weekly_stats.values():
        if week_stats["trade_count"] > 0:
            week_stats["win_rate"] = round(
                week_stats["winning_trades"] / week_stats["trade_count"] * 100, 1
            )
        week_stats["total_pnl"] = round(week_stats["total_pnl"], 2)
    
    return {"weeks": list(weekly_stats.values())}