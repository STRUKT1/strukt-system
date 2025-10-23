#!/bin/bash

# STRUKT AI Coach - Deployment Verification Script
# This script verifies that the AI Coach system is properly deployed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL=""
JWT_TOKEN=""
PROJECT_REF=""

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Usage information
show_usage() {
    cat << EOF
Usage: ./verify-deployment.sh [OPTIONS]

Options:
    -u, --url URL            API URL (e.g., https://api.strukt.fit)
    -t, --token TOKEN        JWT token for authentication
    -p, --project-ref REF    Supabase project reference
    -h, --help               Show this help message

Examples:
    # Verify complete deployment
    ./verify-deployment.sh --url https://api.strukt.fit --token eyJ... --project-ref abc123

    # Verify backend only
    ./verify-deployment.sh --url https://api.strukt.fit --token eyJ...

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            API_URL="$2"
            shift 2
            ;;
        -t|--token)
            JWT_TOKEN="$2"
            shift 2
            ;;
        -p|--project-ref)
            PROJECT_REF="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Header
echo ""
echo "======================================"
echo "  STRUKT AI Coach Deployment Verification"
echo "======================================"
echo ""

# Validate inputs
if [ -z "$API_URL" ]; then
    print_error "API URL is required"
    show_usage
    exit 1
fi

# Test 1: Health Check
print_info "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/" 2>/dev/null || echo "000")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_CODE" = "200" ]; then
    print_success "Health check passed (HTTP 200)"
else
    print_error "Health check failed (HTTP $HEALTH_CODE)"
fi

# Test 2: CORS Preflight
print_info "Testing CORS configuration..."
CORS_RESPONSE=$(curl -s -I -H "Origin: https://app.strukt.fit" \
    -H "Access-Control-Request-Method: POST" \
    -X OPTIONS "$API_URL/ask" 2>/dev/null || echo "")

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    print_success "CORS headers present"
else
    print_error "CORS headers missing"
fi

# Test 3: /ask Endpoint (requires token)
if [ -n "$JWT_TOKEN" ]; then
    print_info "Testing /ask endpoint..."
    ASK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/ask" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d '{"messages":[{"role":"user","content":"test"}]}' 2>/dev/null || echo "000")
    
    ASK_CODE=$(echo "$ASK_RESPONSE" | tail -n1)
    ASK_BODY=$(echo "$ASK_RESPONSE" | sed '$d')
    
    if [ "$ASK_CODE" = "200" ]; then
        print_success "/ask endpoint responding (HTTP 200)"
        
        # Check if response has expected structure
        if echo "$ASK_BODY" | grep -q '"success"'; then
            print_success "/ask response has correct structure"
        else
            print_error "/ask response missing 'success' field"
        fi
    else
        print_error "/ask endpoint failed (HTTP $ASK_CODE)"
    fi
else
    print_warning "Skipping /ask endpoint test (no JWT token provided)"
fi

# Test 4: Edge Functions (requires project ref)
if [ -n "$PROJECT_REF" ]; then
    if command -v supabase >/dev/null 2>&1; then
        print_info "Testing Edge Functions deployment..."
        
        # Test generateWeeklyDigest
        print_info "Testing generateWeeklyDigest..."
        if supabase functions invoke generateWeeklyDigest --project-ref "$PROJECT_REF" >/dev/null 2>&1; then
            print_success "generateWeeklyDigest is deployed and responding"
        else
            print_error "generateWeeklyDigest failed or not deployed"
        fi
        
        # Test checkUserStatus
        print_info "Testing checkUserStatus..."
        if supabase functions invoke checkUserStatus --project-ref "$PROJECT_REF" >/dev/null 2>&1; then
            print_success "checkUserStatus is deployed and responding"
        else
            print_error "checkUserStatus failed or not deployed"
        fi
    else
        print_warning "Supabase CLI not installed, skipping Edge Function tests"
    fi
else
    print_warning "Skipping Edge Function tests (no project ref provided)"
fi

# Test 5: Database Tables (if we have project ref and can connect)
if [ -n "$PROJECT_REF" ] && command -v supabase >/dev/null 2>&1; then
    print_info "Checking database tables..."
    
    # This would require SQL execution which needs more setup
    print_warning "Database table check requires manual verification"
    echo "    Run in Supabase SQL Editor:"
    echo "    SELECT schemaname, tablename, rowsecurity FROM pg_tables"
    echo "    WHERE tablename IN ('ai_coach_logs', 'ai_coach_notes', 'coach_notifications');"
fi

# Summary
echo ""
echo "======================================"
echo "  Verification Summary"
echo "======================================"
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Verify logs are being written to ai_coach_logs"
    echo "  2. Check CRON jobs are scheduled"
    echo "  3. Monitor Edge Function logs"
    echo "  4. Verify RLS policies in database"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Review the errors above and:"
    echo "  1. Check environment variables"
    echo "  2. Verify API is accessible"
    echo "  3. Ensure authentication is working"
    echo "  4. Check Edge Functions are deployed"
    echo ""
    echo "See docs/DEPLOY_AI_COACH.md for troubleshooting"
    echo ""
    exit 1
fi
