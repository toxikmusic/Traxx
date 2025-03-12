#!/bin/bash

# BeatStream Health Check Script
# This script tests the various health endpoints of the BeatStream application

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

# Base URL - update this for production environments
BASE_URL="http://localhost:5000"

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}🩺 BeatStream Health Check Script${NC}"
echo -e "${BLUE}==============================================${NC}"

# Function to check basic health endpoint
check_basic_health() {
  echo -e "\n${YELLOW}Testing basic health endpoint...${NC}"
  response=$(curl -s "${BASE_URL}/health")
  
  if [[ $response == *"status"* ]]; then
    echo -e "${GREEN}✅ Basic health endpoint is working${NC}"
    echo -e "Response: $response"
  else
    echo -e "${RED}❌ Basic health endpoint failed${NC}"
    echo -e "Response: $response"
  fi
}

# Function to check detailed health endpoint
check_detailed_health() {
  echo -e "\n${YELLOW}Testing detailed health endpoint...${NC}"
  response=$(curl -s "${BASE_URL}/api/health/detailed")
  
  if [[ $response == *"status"* && $response == *"services"* ]]; then
    echo -e "${GREEN}✅ Detailed health endpoint is working${NC}"
    
    # Format the JSON response for better readability
    echo -e "Status: $(echo $response | grep -o '"status":"[^"]*"' | cut -d '"' -f4)"
    echo -e "Storage Service: $(echo $response | grep -o '"storage":{"status":"[^"]*"' | cut -d '"' -f6)"
    echo -e "Cloudflare Service: $(echo $response | grep -o '"cloudflare":{"status":"[^"]*"' | cut -d '"' -f6)"
    
    # Memory usage info
    echo -e "\nMemory Usage:"
    echo -e "  RSS: $(echo $response | grep -o '"rss":"[^"]*"' | cut -d '"' -f4)"
    echo -e "  Heap Total: $(echo $response | grep -o '"heapTotal":"[^"]*"' | cut -d '"' -f4)"
    echo -e "  Heap Used: $(echo $response | grep -o '"heapUsed":"[^"]*"' | cut -d '"' -f4)"
  else
    echo -e "${RED}❌ Detailed health endpoint failed${NC}"
    echo -e "Response: $response"
  fi
}

# Function to check version endpoint
check_version() {
  echo -e "\n${YELLOW}Testing version endpoint...${NC}"
  response=$(curl -s "${BASE_URL}/api/version")
  
  if [[ $response == *"version"* ]]; then
    echo -e "${GREEN}✅ Version endpoint is working${NC}"
    echo -e "Version: $(echo $response | grep -o '"version":"[^"]*"' | cut -d '"' -f4)"
    echo -e "Environment: $(echo $response | grep -o '"environment":"[^"]*"' | cut -d '"' -f4)"
  else
    echo -e "${RED}❌ Version endpoint failed${NC}"
    echo -e "Response: $response"
  fi
}

# Run the checks
check_basic_health
check_detailed_health
check_version

echo -e "\n${BLUE}==============================================${NC}"
echo -e "${BLUE}🩺 Health Check Complete${NC}"
echo -e "${BLUE}==============================================${NC}"