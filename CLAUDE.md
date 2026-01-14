# Claude Context - 0DTE Trading Journal

## Project Overview
A web application for traders to record and analyze their zero-days-to-expiration (0DTE) options trades. Features a calendar view showing daily P&L with future AI-powered insights.

## Current Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Python + FastAPI (to be implemented)
- **Database**: SQLite → PostgreSQL (migration path)
- **Deployment**: Vercel (frontend) + Railway/Render (backend)

## Key Features
1. **Calendar View**: Monthly view with color-coded daily P&L (green=profit, red=loss, gray=no trading)
2. **Trade Entry**: Comprehensive form capturing trade details and psychology
3. **0DTE Focus**: Optimized for same-day expiration options trading
4. **Future AI**: Pattern recognition and personalized trading advice

## Development Commands

### Frontend (React)
```bash
cd frontend
npm install          # Install dependencies
npm run dev         # Start development server (port 5173)
npm run build       # Build for production
npm run preview     # Preview production build
```

### Backend (FastAPI) - Coming Soon
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Project Structure
```
0dte-journal/
├── frontend/              # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main app pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   └── public/
├── backend/               # FastAPI + SQLite
│   ├── app/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API endpoints
│   │   └── services/      # Business logic
│   └── requirements.txt
└── docs/                  # Documentation
```

## Trade Data Schema
### Core Fields
- ticker: string (SPX, SPY, QQQ, etc.)
- option_type: "call" | "put"
- strike_price: decimal
- entry_price: decimal
- exit_price: decimal
- entry_time: datetime
- exit_time: datetime
- contracts: integer
- fees: decimal

### Psychology/Journal Fields
- pre_trade_emotion: string
- post_trade_notes: text
- setup_type: string (breakout, reversal, etc.)
- what_went_right: text
- what_went_wrong: text
- screenshot_url: string (optional)
- confidence_level: integer (1-5)

## Development Guidelines
- Use TypeScript for type safety
- Follow component-based architecture
- Implement responsive design (mobile-first)
- Use semantic HTML and accessibility best practices
- Write clean, self-documenting code
- Add proper error handling and validation

## API Design (Future)
- RESTful endpoints
- JWT authentication (future multi-user)
- Rate limiting and input validation
- Proper error responses
- OpenAPI/Swagger documentation

## Future Features (Roadmap)
1. **Phase 2**: Enhanced reporting, data import/export
2. **Phase 3**: AI pattern recognition
3. **Phase 4**: Strategy optimization advice
4. **Phase 5**: Multi-user support, sharing features