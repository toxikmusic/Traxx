#!/bin/bash

# Traxx Production Readiness Check Script

echo -e "\033[0;34m🚀 Running Traxx Production Readiness Check...\033[0m"
echo ""

# Run the production check tool
tsx server/production-check.ts

# Get the exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo -e "\033[0;32m✅ Production readiness check completed successfully.\033[0m"
  echo "If there were any warnings, consider addressing them before deploying."
  echo ""
  echo "To deploy in production:"
  echo "1. npm run build"
  echo "2. NODE_ENV=production node dist/index.js"
  echo ""
  echo "See PRODUCTION_DEPLOYMENT.md for complete deployment instructions."
else
  echo ""
  echo -e "\033[0;31m❌ Production readiness check failed with errors.\033[0m"
  echo "Please address the issues listed above before deploying to production."
  echo "Refer to PRODUCTION_DEPLOYMENT.md for guidance."
fi

exit $EXIT_CODE