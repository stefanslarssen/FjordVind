#!/bin/bash

# Load Testing Script for Lusevokteren API
# Requires: npm install -g artillery (or npx artillery)

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
REPORT_DIR="./reports/load-tests"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure report directory exists
mkdir -p "$REPORT_DIR"

# Function to print colored messages
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check if API is running
check_api() {
    log_info "Checking if API is accessible at $API_URL..."
    if curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" | grep -q "200"; then
        log_info "API is running and healthy"
        return 0
    else
        log_error "API is not accessible at $API_URL"
        return 1
    fi
}

# Function to run smoke test
run_smoke() {
    log_info "Running smoke test..."
    npx artillery run \
        --target "$API_URL" \
        --output "$REPORT_DIR/smoke_${TIMESTAMP}.json" \
        tests/load/smoke.yml

    # Generate HTML report
    npx artillery report \
        "$REPORT_DIR/smoke_${TIMESTAMP}.json" \
        --output "$REPORT_DIR/smoke_${TIMESTAMP}.html"

    log_info "Smoke test complete. Report: $REPORT_DIR/smoke_${TIMESTAMP}.html"
}

# Function to run load test
run_load() {
    log_info "Running load test..."
    npx artillery run \
        --target "$API_URL" \
        --output "$REPORT_DIR/load_${TIMESTAMP}.json" \
        tests/load/artillery.yml

    # Generate HTML report
    npx artillery report \
        "$REPORT_DIR/load_${TIMESTAMP}.json" \
        --output "$REPORT_DIR/load_${TIMESTAMP}.html"

    log_info "Load test complete. Report: $REPORT_DIR/load_${TIMESTAMP}.html"
}

# Function to run stress test
run_stress() {
    log_warn "Running stress test - this will push the system to its limits!"
    npx artillery run \
        --target "$API_URL" \
        --output "$REPORT_DIR/stress_${TIMESTAMP}.json" \
        tests/load/stress.yml

    # Generate HTML report
    npx artillery report \
        "$REPORT_DIR/stress_${TIMESTAMP}.json" \
        --output "$REPORT_DIR/stress_${TIMESTAMP}.html"

    log_info "Stress test complete. Report: $REPORT_DIR/stress_${TIMESTAMP}.html"
}

# Function to run quick benchmark
run_quick() {
    log_info "Running quick benchmark (30 seconds)..."
    npx artillery quick \
        --count 100 \
        --num 10 \
        "$API_URL/api/dashboard/overview"
}

# Show usage
show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  smoke     Run smoke test (validates all endpoints)"
    echo "  load      Run standard load test (5 minutes)"
    echo "  stress    Run stress test (finds breaking points)"
    echo "  quick     Run quick benchmark (30 seconds)"
    echo "  all       Run all tests sequentially"
    echo ""
    echo "Environment variables:"
    echo "  API_URL   Target API URL (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0 smoke"
    echo "  API_URL=https://api.example.com $0 load"
}

# Main script
case "${1:-}" in
    smoke)
        check_api && run_smoke
        ;;
    load)
        check_api && run_load
        ;;
    stress)
        check_api && run_stress
        ;;
    quick)
        check_api && run_quick
        ;;
    all)
        check_api
        run_smoke
        run_load
        log_warn "Skipping stress test in 'all' mode. Run separately with: $0 stress"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

log_info "All tests completed. Reports saved to: $REPORT_DIR"
