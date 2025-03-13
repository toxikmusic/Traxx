#!/bin/bash

# Define colors for better output readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting BeatStream Health Check...${NC}"

# Check if node is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is required but not found.${NC}"
    exit 1
fi

# Check if the test script exists
if [ ! -f "test-health-endpoints.js" ]; then
    echo -e "${RED}Error: test-health-endpoints.js script not found.${NC}"
    exit 1
fi

# Run the test script
echo -e "${YELLOW}Running health checks...${NC}"
node test-health-endpoints.js

# Capture the exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}All health checks passed successfully!${NC}"
elif [ $EXIT_CODE -eq 1 ]; then
    echo -e "${YELLOW}Some health checks failed. Review the output above for details.${NC}"
else
    echo -e "${RED}All health checks failed. Review the output above for details.${NC}"
fi

exit $EXIT_CODE