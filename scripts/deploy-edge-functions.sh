#!/bin/bash

# STRUKT AI Coach - Edge Functions Deployment Script
# This script deploys Supabase Edge Functions and schedules CRON jobs

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF=""
DEPLOY_FUNCTIONS=true
SCHEDULE_CRONS=true
DRY_RUN=false

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Usage information
show_usage() {
    cat << EOF
Usage: ./deploy-edge-functions.sh [OPTIONS]

Options:
    -p, --project-ref REF    Supabase project reference (required)
    -f, --functions-only     Deploy functions only (skip CRON scheduling)
    -c, --cron-only          Schedule CRONs only (skip function deployment)
    -d, --dry-run            Show what would be deployed without executing
    -h, --help               Show this help message

Examples:
    # Deploy everything
    ./deploy-edge-functions.sh --project-ref abc123xyz

    # Deploy functions only
    ./deploy-edge-functions.sh --project-ref abc123xyz --functions-only

    # Dry run
    ./deploy-edge-functions.sh --project-ref abc123xyz --dry-run

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project-ref)
            PROJECT_REF="$2"
            shift 2
            ;;
        -f|--functions-only)
            SCHEDULE_CRONS=false
            shift
            ;;
        -c|--cron-only)
            DEPLOY_FUNCTIONS=false
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
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

# Validate inputs
if [ -z "$PROJECT_REF" ]; then
    print_error "Project reference is required"
    show_usage
    exit 1
fi

# Check if Supabase CLI is installed
if ! command_exists supabase; then
    print_error "Supabase CLI is not installed"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

print_info "🚀 Starting AI Coach Edge Functions Deployment"
echo ""
print_info "Project Ref: $PROJECT_REF"
print_info "Deploy Functions: $DEPLOY_FUNCTIONS"
print_info "Schedule CRONs: $SCHEDULE_CRONS"
print_info "Dry Run: $DRY_RUN"
echo ""

# Check if user is logged in
if [ "$DRY_RUN" = false ]; then
    print_info "Checking Supabase authentication..."
    if ! supabase projects list &>/dev/null; then
        print_error "Not authenticated with Supabase CLI"
        echo ""
        echo "Please login first:"
        echo "  supabase login"
        echo ""
        exit 1
    fi
    print_success "Authenticated with Supabase CLI"
    echo ""
fi

# Deploy Edge Functions
if [ "$DEPLOY_FUNCTIONS" = true ]; then
    print_info "📦 Deploying Edge Functions..."
    echo ""
    
    # generateWeeklyDigest
    print_info "Deploying generateWeeklyDigest..."
    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY RUN] Would execute: supabase functions deploy generateWeeklyDigest --project-ref $PROJECT_REF"
    else
        if supabase functions deploy generateWeeklyDigest --project-ref "$PROJECT_REF"; then
            print_success "generateWeeklyDigest deployed successfully"
        else
            print_error "Failed to deploy generateWeeklyDigest"
            exit 1
        fi
    fi
    echo ""
    
    # checkUserStatus
    print_info "Deploying checkUserStatus..."
    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY RUN] Would execute: supabase functions deploy checkUserStatus --project-ref $PROJECT_REF"
    else
        if supabase functions deploy checkUserStatus --project-ref "$PROJECT_REF"; then
            print_success "checkUserStatus deployed successfully"
        else
            print_error "Failed to deploy checkUserStatus"
            exit 1
        fi
    fi
    echo ""
fi

# Schedule CRON Jobs
if [ "$SCHEDULE_CRONS" = true ]; then
    print_info "⏰ Scheduling CRON Jobs..."
    echo ""
    
    print_warning "Note: CRON scheduling via CLI is not directly supported in current Supabase CLI"
    print_warning "You need to schedule CRONs via the Supabase Dashboard or SQL"
    echo ""
    
    print_info "To schedule CRONs, run these SQL commands in your Supabase SQL Editor:"
    echo ""
    
    cat << 'EOF'
-- Schedule generateWeeklyDigest (Every Sunday at 8 PM UTC)
SELECT cron.schedule(
  'generate-weekly-digest',
  '0 20 * * SUN',
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/generateWeeklyDigest',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule checkUserStatus (Daily at 8 AM UTC)
SELECT cron.schedule(
  'check-user-status',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/checkUserStatus',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;
EOF
    echo ""
    print_warning "Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with your actual values"
    echo ""
fi

# Verify deployment
if [ "$DEPLOY_FUNCTIONS" = true ] && [ "$DRY_RUN" = false ]; then
    print_info "🔍 Verifying deployment..."
    echo ""
    
    print_info "Listing deployed functions:"
    if supabase functions list --project-ref "$PROJECT_REF"; then
        echo ""
        print_success "Functions listed successfully"
    else
        print_warning "Could not list functions (this might be normal)"
    fi
    echo ""
fi

# Check secrets
if [ "$DRY_RUN" = false ]; then
    print_info "🔑 Checking required secrets..."
    echo ""
    
    print_warning "Ensure the following secrets are set in Supabase Dashboard:"
    echo "  - OPENAI_API_KEY"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    
    print_info "To set secrets, use:"
    echo "  supabase secrets set OPENAI_API_KEY=sk-... --project-ref $PROJECT_REF"
    echo ""
fi

# Summary
print_success "✨ Deployment process completed!"
echo ""

if [ "$DRY_RUN" = true ]; then
    print_warning "This was a DRY RUN - no actual changes were made"
    echo ""
fi

print_info "Next steps:"
echo "  1. Verify functions are deployed in Supabase Dashboard"
echo "  2. Set required secrets (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY)"
echo "  3. Schedule CRON jobs using the SQL commands above"
echo "  4. Test functions manually:"
echo "       supabase functions invoke generateWeeklyDigest --project-ref $PROJECT_REF"
echo "       supabase functions invoke checkUserStatus --project-ref $PROJECT_REF"
echo "  5. Monitor logs:"
echo "       supabase functions logs generateWeeklyDigest --since 24h --project-ref $PROJECT_REF"
echo ""

print_success "🎉 Done!"
