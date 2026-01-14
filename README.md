# 0DTE Trading Journal

A modern, professional web application for tracking zero-days-to-expiration (0DTE) options trades with comprehensive analytics and intuitive calendar management.

## ✨ Features

### 📅 **Interactive Trading Calendar**
- **Large monthly view** with visual daily P&L indicators
- **Color-coded performance**: Green for profits, red for losses, blue for today
- **Hover actions**: Add/edit/delete trades directly from calendar days
- **Real-time data**: Connected to live trading data from your database
- **Trade count indicators**: See number of trades per day at a glance

### 📊 **Professional Trade Management**
- **Comprehensive trade logging** with all essential 0DTE data fields
- **Real-time P&L calculations** with automatic profit/loss tracking
- **Professional dashboard** with key performance metrics
- **Clean data tables** with advanced filtering and sorting
- **Trade status tracking** (Open, Win, Loss) with visual badges

### 🎨 **Modern UI/UX**
- **GitHub-inspired dark theme** with professional styling
- **Responsive design** optimized for desktop trading workflows
- **Intuitive navigation** with sidebar and clear section organization
- **Loading states** and error handling throughout the application
- **Hover interactions** and smooth animations for better user experience

### 🔧 **Developer-Friendly Architecture**
- **TypeScript throughout** for type safety and better DX
- **Component-based design** with reusable UI elements
- **RESTful API** with automatic documentation via FastAPI
- **Real-time updates** between frontend and backend
- **Comprehensive error handling** and validation

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Custom CSS
- **Backend**: Python + FastAPI + SQLAlchemy + Pydantic
- **Database**: SQLite (dev) → PostgreSQL (production)
- **API**: RESTful with automatic OpenAPI documentation
- **Development**: Hot reload, TypeScript checking, modern tooling

## Project Structure

```
0dte-journal/
├── frontend/          # React application
├── backend/           # FastAPI application
├── README.md
└── docs/             # Documentation (future)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd 0dte-journal
```

### 2. Backend Setup (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend will be available at: `http://localhost:8000`
API documentation at: `http://localhost:8000/docs`

### 3. Frontend Setup (React)
```bash
cd frontend
npm install
npm run dev
```
Frontend will be available at: `http://localhost:5173`

### 4. Start Trading! 🎯
1. Navigate to the **Calendar** tab
2. **Hover over any day** to see action buttons
3. **Click the + button** to add a trade for that specific date
4. **View your dashboard** for performance metrics
5. **Check the Trades tab** for detailed trade history

## 📱 Application Views

### Dashboard
- **Performance overview** with key metrics (Total P&L, Win Rate, Trade Count)
- **Recent trades table** showing your last 10 trades
- **Real-time statistics** calculated from your actual trade data

### Calendar View
- **Monthly calendar** with large, interactive day cells
- **Visual P&L indicators**: Green backgrounds for profit days, red for losses
- **Hover interactions**: 
  - Empty days show **"+ Add Trade"** button
  - Days with trades show **"✏ Edit"** and **"× Delete"** buttons
- **Trade count display** showing number of trades per day
- **Today highlighting** with blue accent border

### Trades Management
- **Complete trade history** in professional data table format
- **Status badges** for easy identification (WIN/LOSS/OPEN)
- **Real-time data** connected to your backend database
- **Comprehensive trade details** including P&L, returns, and duration

## 🏗️ Development Status

### ✅ Completed Features
- [x] **Full-stack architecture** (React + FastAPI)
- [x] **Database integration** with SQLAlchemy models
- [x] **Professional UI design** with modern dark theme
- [x] **Interactive calendar** with hover actions and real-time data
- [x] **Trade management** system with comprehensive logging
- [x] **Dashboard analytics** with live performance metrics
- [x] **Form validation** and error handling
- [x] **API integration** with complete CRUD operations
- [x] **TypeScript implementation** for type safety
- [x] **Responsive design** optimized for desktop trading

### 🔄 In Development
- [ ] **Trade editing interface** (placeholder handlers ready)
- [ ] **Advanced filtering** and search capabilities
- [ ] **Export functionality** for trade data

### 🔮 Future Enhancements
- [ ] **AI-powered insights** and pattern recognition
- [ ] **Performance analytics** with advanced charts
- [ ] **Risk management** tools and position sizing
- [ ] **Multi-timeframe analysis** beyond 0DTE
- [ ] **Import/export** from popular trading platforms

## 📊 Trade Data Schema

### Core Trading Fields
- **Ticker**: SPX, SPY, QQQ, IWM, TSLA (dropdown selection)
- **Option Type**: Call or Put (dropdown selection)
- **Strike Price**: Strike price of the option
- **Entry/Exit Price**: Buy and sell prices with automatic P&L calculation
- **Entry/Exit Time**: Precise timestamps for trade timing
- **Contracts**: Number of contracts traded
- **Fees**: Commissions and fees for accurate P&L

### Automatic Calculations
- **P&L**: Real-time profit/loss calculation based on entry/exit prices
- **Return %**: Percentage return on investment
- **Duration**: Time held (minutes/hours for 0DTE)
- **Status**: Open/Win/Loss based on trade state and P&L

### Psychology & Analysis (Ready for Extension)
- **Pre-trade emotion**: Market sentiment and emotional state
- **Post-trade notes**: What happened during the trade
- **Setup type**: Breakout, reversal, momentum, scalp, swing, other
- **What went right/wrong**: Learning and improvement notes
- **Confidence level**: 1-5 scale for setup confidence
- **Screenshot URL**: Optional trade chart screenshots

## 🔧 API Endpoints

The FastAPI backend provides complete REST API functionality:

### Trades Management
- `GET /api/trades/` - List all trades with optional filtering
- `POST /api/trades/` - Create new trade with validation
- `GET /api/trades/{id}` - Get specific trade details
- `PUT /api/trades/{id}` - Update existing trade
- `DELETE /api/trades/{id}` - Delete trade

### Calendar Data
- `GET /api/trades/calendar/{year}/{month}` - Monthly P&L summary
- Real-time daily aggregation for calendar visualization

### Health & Monitoring
- `GET /api/health` - Application health check
- `GET /docs` - Interactive API documentation (Swagger UI)

## 🎨 Design Philosophy

### Professional Trading Interface
- **Dark theme optimized** for long trading sessions
- **Minimal cognitive load** with clear visual hierarchy
- **Quick access patterns** for rapid trade entry
- **Data-dense displays** showing maximum information efficiently

### User Experience Priorities
1. **Speed**: Rapid trade entry and data access
2. **Accuracy**: Validation and error prevention
3. **Insights**: Clear performance visualization
4. **Professional**: Clean, modern interface design

## 🛠️ Technical Architecture

### Frontend (React + TypeScript)
```
src/
├── components/           # Reusable UI components
│   ├── Calendar.tsx      # Interactive calendar with hover actions
│   └── TradeForm.tsx     # Trade entry/editing form
├── api/                  # API client and types
│   └── client.ts         # TypeScript API client
├── App.tsx               # Main application with routing
└── index.css             # Custom CSS with professional styling
```

### Backend (FastAPI + SQLAlchemy)
```
app/
├── models.py             # SQLAlchemy database models
├── schemas.py            # Pydantic data validation schemas
├── routes/              # API route handlers
│   └── trades.py        # Trade CRUD operations
├── database.py          # Database connection and setup
└── main.py              # FastAPI application entry point
```

## 🚀 Deployment Ready

### Development
- **Hot reload** enabled for both frontend and backend
- **TypeScript checking** for compile-time error detection
- **API auto-documentation** via FastAPI Swagger UI
- **Database migrations** handled via SQLAlchemy

### Production Preparation
- **Environment-based configuration** for database URLs
- **SQLite to PostgreSQL** migration path ready
- **Frontend build optimization** via Vite
- **API cors configuration** for cross-origin requests