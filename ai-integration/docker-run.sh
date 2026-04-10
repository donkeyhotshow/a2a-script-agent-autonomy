#!/bin/bash
# Docker run script for ai-integration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Build the images
build() {
    log_info "Building Docker images..."
    docker-compose build
    log_info "Build completed successfully"
}

# Start services
start() {
    log_info "Starting ai-integration services..."
    docker-compose up -d
    log_info "Services started. Waiting for health checks..."

    # Wait for services to be healthy
    log_info "Waiting for Local LLM upstream to be ready..."
    docker-compose exec -T compat_llm sh -c 'until curl -f http://localhost:11435/api/tags > /dev/null 2>&1; do sleep 2; done'

    log_info "Waiting for ai-integration proxy to be ready..."
    docker-compose exec -T ai-integration sh -c 'until curl -f http://localhost:11434/health > /dev/null 2>&1; do sleep 2; done'

    log_info "All services are ready!"
    log_info "  - Local LLM upstream: http://localhost:11435"
    log_info "  - AI Integration Proxy: http://localhost:11434"
}

# Stop services
stop() {
    log_info "Stopping ai-integration services..."
    docker-compose down
    log_info "Services stopped"
}

# Show logs
logs() {
    docker-compose logs -f
}

# Show status
status() {
    log_info "Service status:"
    docker-compose ps

    log_info "Health checks:"
    echo "Local LLM upstream health:"
    curl -s http://localhost:11435/api/tags | head -5 || echo "  Not available"

    echo "AI Integration health:"
    curl -s http://localhost:11434/health | jq .status 2>/dev/null || echo "  Not available"
}

# Test the services
test() {
    log_info "Running integration tests..."

    # Basic health checks
    if ! curl -f http://localhost:11434/health > /dev/null 2>&1; then
        log_error "AI Integration proxy is not healthy"
        exit 1
    fi

    if ! curl -f http://localhost:11435/api/tags > /dev/null 2>&1; then
        log_error "Local LLM upstream is not healthy"
        exit 1
    fi

    # Run the test script
    if [ -f "scripts/test_ai_integration.py" ]; then
        python scripts/test_ai_integration.py
    else
        log_warn "Test script not found, skipping integration tests"
    fi

    log_info "Tests completed successfully"
}

# Clean up
clean() {
    log_info "Cleaning up Docker resources..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    log_info "Cleanup completed"
}

# Development mode
dev() {
    log_info "Starting in development mode..."
    docker-compose --profile dev up --build
}

# Show usage
usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build     Build Docker images"
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  logs      Show service logs"
    echo "  status    Show service status"
    echo "  test      Run integration tests"
    echo "  clean     Clean up Docker resources"
    echo "  dev       Start in development mode"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Start the services"
    echo "  $0 test     # Run tests against running services"
    echo "  $0 logs     # View logs"
}

# Main logic
check_docker

case "${1:-help}" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        start
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    test)
        test
        ;;
    clean)
        clean
        ;;
    dev)
        dev
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        usage
        exit 1
        ;;
esac