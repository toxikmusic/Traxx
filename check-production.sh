#!/bin/bash

# BeatStream Production Readiness Check Script

echo "🚀 Running BeatStream Production Readiness Check..."
echo ""

# Run the production check tool
tsx server/production-check.ts

# Get the exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Production readiness check completed successfully."
  echo "If there were any warnings, consider addressing them before deploying."
  echo ""
  echo "To deploy in production:"
  echo "1. npm run build"
  echo "2. NODE_ENV=production node dist/index.js"
  echo ""
  echo "See PRODUCTION_DEPLOYMENT.md for complete deployment instructions."
else
  echo ""
  echo "❌ Production readiness check failed with errors."
  echo "Please address the issues listed above before deploying to production."
  echo "Refer to PRODUCTION_DEPLOYMENT.md for guidance."
fi

exit $EXIT_CODE