#!/bin/bash

# FlowTrace + Blockscout API Integration Startup Script

echo "🚀 Starting FlowTrace + Blockscout API Integration"
echo "=================================================="

# Check if we're in the right directory
if [ ! -d "api" ] || [ ! -d "app" ] || [ ! -d "flowtrace" ]; then
    echo "❌ Error: Please run this script from the compliance_screener_0731 directory"
    echo "   Expected structure:"
    echo "   ├── api/ (Blockscout API)"
    echo "   ├── app/ (Blockscout App)"
    echo "   └── flowtrace/ (FlowTrace App)"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    echo "Checking port $1..."
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ Port $1 is in use"
        lsof -i :$1 | grep LISTEN
        return 1
    else
        echo "❌ Port $1 is available"
        return 0
    fi
}

# Check required ports
echo "🔍 Checking ports..."
check_port 8004 || { echo "   Port 8004 is in use, trying 8005..."; check_port 8005 || { echo "   Port 8005 is also in use. Please stop any service using ports 8004 or 8005"; exit 1; }; API_PORT=8005; } || API_PORT=8004
check_port 3000 || { echo "   Please stop any service using port 3000"; exit 1; }

# Check if MongoDB is running
echo "🔍 Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB with Docker..."
    if command -v docker &> /dev/null; then
        docker run -d --name mongodb -p 27017:27017 mongo:latest
        echo "✅ MongoDB started in Docker"
        sleep 3
    else
        echo "❌ Docker not found. Please install Docker or start MongoDB manually"
        exit 1
    fi
else
    echo "✅ MongoDB is running"
fi

# Create .env.local for flowtrace if it doesn't exist
if [ ! -f "flowtrace/.env.local" ]; then
    echo "📝 Creating .env.local for flowtrace..."
    cat > flowtrace/.env.local << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8004/api/v1

# Application Configuration
NEXT_PUBLIC_APP_NAME=FlowTrace
NEXT_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
NEXT_PUBLIC_ENABLE_AUTHENTICATION=true
NEXT_PUBLIC_ENABLE_BLOCKCHAIN_DATA=true
NEXT_PUBLIC_ENABLE_REPORTS=true
EOF
    echo "✅ Created flowtrace/.env.local"
fi

echo ""
echo "🎯 Starting services..."
echo "======================"

# Start API server in background
echo "🔧 Starting Blockscout API (port ${API_PORT:-8004})..."
cd api
npm run dev -- --port=${API_PORT:-8004} &
API_PID=$!
cd ..

# Wait a moment for API to start
sleep 5

# Start FlowTrace app in background
echo "🌐 Starting FlowTrace App (port 3000)..."
cd flowtrace
npm run dev &
FLOWTRACE_PID=$!
cd ..

echo ""
echo "✅ Services started successfully!"
echo "================================"
echo "📊 API Server: http://localhost:${API_PORT:-8004}"
echo "🌐 FlowTrace App: http://localhost:3000"
echo "📚 API Documentation: http://localhost:8004/docs"
echo ""
echo "🔐 Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Click 'Connect API' in the header"
echo "3. Register or login to access blockchain data"
echo ""
echo "🛑 To stop all services, press Ctrl+C"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $API_PID 2>/dev/null
    kill $FLOWTRACE_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait 