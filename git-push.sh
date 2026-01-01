#!/bin/bash

# Auto-commit and push script for CloudSpace PersonalCloud
# Usage: ./git-push.sh "commit message"

set -e

REPO_DIR="/workspaces/Personalcloud/personalcloud"
cd "$REPO_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 CloudSpace Git Auto-Push Script${NC}\n"

# Configure git if not already configured
if [ -z "$(git config user.email)" ]; then
    echo "Setting up git configuration..."
    git config user.email "copilot@github.com"
    git config user.name "GitHub Copilot"
fi

# Get git status
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    exit 0
fi

# Stage all changes
echo -e "${BLUE}📝 Staging changes...${NC}"
git add -A

# Create commit message
if [ -z "$1" ]; then
    COMMIT_MESSAGE="chore: Update CloudSpace features and improvements"
else
    COMMIT_MESSAGE="$1"
fi

# Commit changes
echo -e "${BLUE}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MESSAGE"

# Push to GitHub
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
git push origin main

echo -e "\n${GREEN}✅ All changes pushed successfully!${NC}\n"

# Show latest commit
echo -e "${BLUE}📊 Latest Commit:${NC}"
git log --oneline -1
echo ""

# Show stats
echo -e "${BLUE}📈 Commit Stats:${NC}"
git log --stat -1 HEAD | tail -n +5
