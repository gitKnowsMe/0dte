"""
CSV Import Routes
Handles uploading, parsing, and importing trades from Robinhood CSV files
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Trade as TradeModel
from app.schemas import Trade
from app.services.csv_parser import RobinhoodCSVParser, ParsedTrade, CSVParseResult

router = APIRouter()


@router.post("/upload", response_model=CSVParseResult)
async def upload_csv(
    file: UploadFile = File(...),
):
    """
    Upload and parse a Robinhood CSV file

    Returns a preview of parsed trades for user validation before importing
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a CSV file."
        )

    try:
        # Read file content
        content = await file.read()

        # Parse CSV
        parser = RobinhoodCSVParser()
        result = parser.parse_csv_file(content)

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse CSV: {str(e)}"
        )


@router.post("/import", response_model=dict)
async def import_trades(
    trades: List[ParsedTrade],
    db: Session = Depends(get_db)
):
    """
    Import validated trades into the database

    Accepts a list of ParsedTrade objects from the preview
    Creates Trade records in the database
    """
    try:
        imported_count = 0
        failed_count = 0
        errors = []

        for parsed_trade in trades:
            # Skip invalid trades
            if not parsed_trade.is_valid:
                failed_count += 1
                continue

            try:
                # Create trade record
                trade = TradeModel(
                    ticker=parsed_trade.ticker,
                    option_type=parsed_trade.option_type,
                    strike_price=parsed_trade.strike_price,
                    entry_price=parsed_trade.entry_price,
                    exit_price=parsed_trade.exit_price,
                    entry_time=parsed_trade.entry_time,
                    exit_time=parsed_trade.exit_time,
                    contracts=parsed_trade.contracts,
                    fees=parsed_trade.fees,
                    is_open=parsed_trade.exit_price is None,
                    pnl=calculate_pnl(parsed_trade) if parsed_trade.exit_price else None
                )

                db.add(trade)
                imported_count += 1

            except Exception as e:
                failed_count += 1
                errors.append({
                    "row": parsed_trade.row_number,
                    "ticker": parsed_trade.ticker,
                    "error": str(e)
                })

        # Commit all trades
        db.commit()

        return {
            "success": True,
            "imported": imported_count,
            "failed": failed_count,
            "errors": errors
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import trades: {str(e)}"
        )


def calculate_pnl(trade: ParsedTrade) -> float:
    """
    Calculate P&L for a trade

    Formula: (exit_price - entry_price) * contracts * 100
    For puts, profit when exit < entry
    """
    if not trade.exit_price:
        return 0.0

    price_diff = trade.exit_price - trade.entry_price
    pnl = price_diff * trade.contracts * 100  # Options contracts are 100 shares

    # Account for fees
    pnl -= trade.fees

    return round(pnl, 2)


@router.get("/sample")
async def get_sample_csv():
    """
    Returns a sample CSV format for reference

    Useful for users to understand the expected format
    """
    sample_csv = """Activity Date,Process Date,Settle Date,Instrument,Description,Trans Code,Quantity,Price,Amount
12/29/2023,12/29/2023,12/29/2023,SPX,.SPX 12/29/23 Call $4545,BUY,1,5.50,$550.00
12/29/2023,12/29/2023,12/29/2023,SPX,.SPX 12/29/23 Call $4545,SELL,1,8.75,$875.00
12/29/2023,12/29/2023,12/29/2023,SPY,SPY 12/29/23 Put $455,BUY,2,3.25,$650.00
12/29/2023,12/29/2023,12/29/2023,SPY,SPY 12/29/23 Put $455,SELL,2,1.50,$300.00"""

    return {
        "sample_csv": sample_csv,
        "format_notes": {
            "Activity Date": "Date of the trade (MM/DD/YYYY)",
            "Instrument": "Ticker symbol (SPX, SPY, QQQ, etc.)",
            "Description": "Option details (Strike Call/Put ExpDate)",
            "Trans Code": "BUY or SELL",
            "Quantity": "Number of contracts",
            "Price": "Price per contract",
            "Amount": "Total transaction amount"
        }
    }
