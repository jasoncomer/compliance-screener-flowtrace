# Compliance Screener Project

This repository contains the Compliance Screener application with both the API backend and FlowTrace frontend components.

## Project Structure

- `api/` - Backend API server (Node.js/Express)
- `flowtrace/` - Frontend application (Next.js/React)
- `start-integration.sh` - Script to start both API and frontend services

## Quick Start

1. **Start the integration services:**
   ```bash
   ./start-integration.sh
   ```

2. **Access the applications:**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Recent Fixes

### Edge Duplication Issue
- Fixed duplicate edges when expanding nodes multiple times
- Added transaction hash-based duplicate detection
- Enhanced connection filtering logic

### Available Transactions Count
- Fixed incorrect "0 available transactions" display
- Implemented dynamic transaction count updates
- Synchronized transaction counts across all components

## Development

### API Development
```bash
cd api
npm install
npm run dev
```

### Frontend Development
```bash
cd flowtrace
npm install
npm run dev
```

## Features

- Blockchain transaction flow analysis
- Node expansion with transaction details
- Risk assessment and scoring
- Entity relationship mapping
- Real-time transaction data fetching
- Interactive network graph visualization

## Technologies

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Next.js, React, TypeScript
- **Database**: PostgreSQL (via API)
- **Visualization**: Custom Canvas-based network graph 