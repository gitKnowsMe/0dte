"""
CSV Parser Service for Robinhood Trade Import
Handles parsing and validation of Robinhood CSV exports
"""
import csv
import io
import re
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel, Field


class RobinhoodCSVRow(BaseModel):
    """Model for a raw Robinhood CSV row"""
    activity_date: str
    process_date: str
    settle_date: str
    instrument: str
    description: str
    trans_code: str
    quantity: str
    price: str
    amount: str


class ParsedTrade(BaseModel):
    """Model for a parsed trade ready for import"""
    ticker: str
    option_type: str  # "call" or "put"
    strike_price: float
    entry_price: float
    exit_price: Optional[float] = None
    entry_time: datetime
    exit_time: Optional[datetime] = None
    contracts: int
    fees: float = 0.0
    expiration_date: Optional[str] = None
    trans_code: str  # Buy or Sell
    amount: float
    row_number: int

    # Validation status
    is_valid: bool = True
    error_message: Optional[str] = None


class CSVParseResult(BaseModel):
    """Result of CSV parsing operation"""
    success: bool
    total_rows: int
    valid_trades: int
    invalid_trades: int
    trades: List[ParsedTrade]
    errors: List[Dict[str, str]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class RobinhoodCSVParser:
    """
    Parser for Robinhood CSV exports

    Expected CSV columns:
    - Activity Date
    - Process Date
    - Settle Date
    - Instrument
    - Description (e.g., "100 Call 12/29/23" or ".SPX 12/29/23 Put $4545")
    - Trans Code (Buy/Sell)
    - Quantity
    - Price
    - Amount
    """

    # Regex patterns for parsing option descriptions
    # Robinhood format: "SPY Call $685 12/05/25"
    ROBINHOOD_PATTERN = re.compile(
        r'(Call|Put)\s+\$(\d+(?:\.\d+)?)\s+(\d{1,2}/\d{1,2}/\d{2,4})',
        re.IGNORECASE
    )

    OPTION_PATTERN_1 = re.compile(
        r'(\d+(?:\.\d+)?)\s+(Call|Put)\s+(\d{1,2}/\d{1,2}/\d{2,4})',
        re.IGNORECASE
    )

    OPTION_PATTERN_2 = re.compile(
        r'(\d{1,2}/\d{1,2}/\d{2,4})\s+(Call|Put)\s+\$?(\d+(?:\.\d+)?)',
        re.IGNORECASE
    )

    OPTION_PATTERN_3 = re.compile(
        r'\$?(\d+(?:\.\d+)?)\s+(C|P)\s+(\d{1,2}/\d{1,2}/\d{2,4})',
        re.IGNORECASE
    )

    def parse_csv_file(self, file_content: bytes) -> CSVParseResult:
        """
        Parse a Robinhood CSV file

        Args:
            file_content: Raw bytes from uploaded CSV file

        Returns:
            CSVParseResult with parsed trades and any errors
        """
        try:
            # Decode the file content
            text_content = file_content.decode('utf-8')

            # Parse CSV
            csv_reader = csv.DictReader(io.StringIO(text_content))

            trades = []
            errors = []
            warnings = []
            row_number = 1

            for row in csv_reader:
                row_number += 1

                # Skip non-option trades
                if not self._is_option_trade(row):
                    warnings.append(f"Row {row_number}: Skipping non-option trade for {row.get('Instrument', 'Unknown')}")
                    continue

                # Parse the trade
                parsed_trade = self._parse_trade_row(row, row_number)
                trades.append(parsed_trade)

                if not parsed_trade.is_valid:
                    errors.append({
                        "row": row_number,
                        "ticker": parsed_trade.ticker,
                        "error": parsed_trade.error_message
                    })

            # Group trades (match buys with sells)
            grouped_trades = self._group_trades(trades)

            valid_count = sum(1 for t in grouped_trades if t.is_valid)
            invalid_count = len(grouped_trades) - valid_count

            return CSVParseResult(
                success=True,
                total_rows=row_number - 1,
                valid_trades=valid_count,
                invalid_trades=invalid_count,
                trades=grouped_trades,
                errors=errors,
                warnings=warnings
            )

        except Exception as e:
            return CSVParseResult(
                success=False,
                total_rows=0,
                valid_trades=0,
                invalid_trades=0,
                trades=[],
                errors=[{"row": 0, "error": f"Failed to parse CSV: {str(e)}"}]
            )

    def _is_option_trade(self, row: Dict) -> bool:
        """Check if the row represents an option trade"""
        description = row.get('Description', '').lower()
        instrument = row.get('Instrument', '').lower()

        # Look for option keywords
        return any(keyword in description for keyword in ['call', 'put', 'option']) or \
               any(keyword in instrument for keyword in ['call', 'put', 'option'])

    def _parse_trade_row(self, row: Dict, row_number: int) -> ParsedTrade:
        """Parse a single CSV row into a ParsedTrade"""
        try:
            ticker = self._extract_ticker(row.get('Instrument', ''))
            description = row.get('Description', '')

            # Parse option details from description
            strike, option_type, exp_date = self._parse_option_description(description)

            # Parse price and quantity
            price = self._parse_decimal(row.get('Price', '0'))
            quantity = abs(int(float(row.get('Quantity', '0'))))
            amount = self._parse_decimal(row.get('Amount', '0'))

            # Parse date
            activity_date = self._parse_date(row.get('Activity Date', ''))
            trans_code = row.get('Trans Code', '').strip().upper()

            # Determine if this is entry or exit
            is_entry = trans_code in ['BUY', 'BTO', 'BOUGHT']

            # For Robinhood: price is per contract, amount is total
            # Calculate actual price per contract from amount if needed
            actual_price = price
            if actual_price == 0 and amount != 0 and quantity != 0:
                actual_price = abs(amount) / (quantity * 100)

            return ParsedTrade(
                ticker=ticker,
                option_type=option_type.lower(),
                strike_price=strike,
                entry_price=actual_price if is_entry else 0,
                exit_price=actual_price if not is_entry else None,
                entry_time=activity_date,
                exit_time=None,  # Will be set when we match BTO/STC pairs
                contracts=quantity,
                fees=0.0,  # Robinhood typically doesn't charge per-contract fees
                expiration_date=exp_date,
                trans_code=trans_code,
                amount=abs(amount),
                row_number=row_number,
                is_valid=True
            )

        except Exception as e:
            return ParsedTrade(
                ticker=row.get('Instrument', 'UNKNOWN'),
                option_type='call',
                strike_price=0,
                entry_price=0,
                entry_time=datetime.now(),
                contracts=0,
                trans_code=row.get('Trans Code', ''),
                amount=0,
                row_number=row_number,
                is_valid=False,
                error_message=f"Parse error: {str(e)}"
            )

    def _parse_option_description(self, description: str) -> Tuple[float, str, str]:
        """
        Parse option details from description field

        Examples:
        - "SPY Call $685 12/05/25" -> (685, "Call", "12/05/25") [Robinhood format]
        - "100 Call 12/29/23" -> (100, "Call", "12/29/23")
        - ".SPX 12/29/23 Put $4545" -> (4545, "Put", "12/29/23")
        - "$100 C 12/29/23" -> (100, "Call", "12/29/23")
        """
        # Try Robinhood pattern first: "SPY Call $685 12/05/25"
        match = self.ROBINHOOD_PATTERN.search(description)
        if match:
            option_type = match.group(1).capitalize()
            strike = float(match.group(2))
            exp_date = match.group(3)
            return strike, option_type, exp_date

        # Try pattern 1: "100 Call 12/29/23"
        match = self.OPTION_PATTERN_1.search(description)
        if match:
            strike = float(match.group(1))
            option_type = match.group(2).capitalize()
            exp_date = match.group(3)
            return strike, option_type, exp_date

        # Try pattern 2: "12/29/23 Put $4545"
        match = self.OPTION_PATTERN_2.search(description)
        if match:
            exp_date = match.group(1)
            option_type = match.group(2).capitalize()
            strike = float(match.group(3))
            return strike, option_type, exp_date

        # Try pattern 3: "$100 C 12/29/23"
        match = self.OPTION_PATTERN_3.search(description)
        if match:
            strike = float(match.group(1))
            option_type = 'Call' if match.group(2).upper() == 'C' else 'Put'
            exp_date = match.group(3)
            return strike, option_type, exp_date

        raise ValueError(f"Could not parse option description: {description}")

    def _extract_ticker(self, instrument: str) -> str:
        """Extract ticker symbol from instrument field"""
        # Remove common prefixes and clean up
        ticker = instrument.strip()
        ticker = ticker.replace('.', '')  # Remove dots (e.g., .SPX -> SPX)
        ticker = ticker.split()[0]  # Take first word
        return ticker.upper()

    def _parse_decimal(self, value: str) -> float:
        """Parse a string to decimal, handling currency symbols"""
        if not value:
            return 0.0

        # Remove currency symbols, commas, and spaces
        cleaned = value.replace('$', '').replace(',', '').replace(' ', '')

        # Handle parentheses for negative numbers
        if cleaned.startswith('(') and cleaned.endswith(')'):
            cleaned = '-' + cleaned[1:-1]

        return float(cleaned)

    def _parse_date(self, date_str: str) -> datetime:
        """Parse date string to datetime"""
        if not date_str:
            return datetime.now()

        # Try common date formats
        formats = [
            '%m/%d/%Y',
            '%m/%d/%y',
            '%Y-%m-%d',
            '%m-%d-%Y',
            '%m/%d/%Y %H:%M:%S',
            '%Y-%m-%d %H:%M:%S'
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue

        # If all else fails, return current time
        return datetime.now()

    def _group_trades(self, trades: List[ParsedTrade]) -> List[ParsedTrade]:
        """
        Group buy and sell transactions into complete trades

        Matches BTO (Buy to Open) with STC (Sell to Close) for the same option
        """
        grouped = []
        bto_trades = {}  # Key: (ticker, strike, option_type, exp_date) -> trade

        for trade in trades:
            key = (trade.ticker, trade.strike_price, trade.option_type, trade.expiration_date)

            if trade.trans_code in ['BTO', 'BUY', 'BOUGHT']:
                # This is an opening trade - store it
                bto_trades[key] = trade

            elif trade.trans_code in ['STC', 'SELL', 'SOLD']:
                # This is a closing trade - try to match with opening
                if key in bto_trades:
                    # Found matching BTO - create complete trade
                    opening = bto_trades[key]
                    complete_trade = ParsedTrade(
                        ticker=opening.ticker,
                        option_type=opening.option_type,
                        strike_price=opening.strike_price,
                        entry_price=opening.entry_price,
                        exit_price=trade.exit_price,
                        entry_time=opening.entry_time,
                        exit_time=trade.entry_time,  # STC date is the exit time
                        contracts=opening.contracts,
                        fees=opening.fees,
                        expiration_date=opening.expiration_date,
                        trans_code='COMPLETE',
                        amount=opening.amount + trade.amount,
                        row_number=opening.row_number,
                        is_valid=True,
                        error_message=None
                    )
                    grouped.append(complete_trade)
                    del bto_trades[key]
                else:
                    # No matching BTO - add as standalone sell
                    grouped.append(trade)
            else:
                # Unknown transaction type
                grouped.append(trade)

        # Add any unmatched BTO trades (still open positions)
        for opening_trade in bto_trades.values():
            grouped.append(opening_trade)

        return grouped
