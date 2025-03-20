#!/bin/bash

echo "Testing stream creation with stream key functionality"

# First, log in to get a session cookie
echo "Logging in..."
COOKIE_JAR="cookies.txt"
rm -f $COOKIE_JAR

curl -c $COOKIE_JAR -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"toxik","password":"password123"}' \
  -s > /dev/null

echo "Creating a test stream..."
STREAM_RESPONSE=$(curl -b $COOKIE_JAR -X POST http://localhost:5000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Stream","description":"Testing the stream key functionality"}')

echo "Stream creation response:"
echo $STREAM_RESPONSE | jq .

# Extract the stream ID from the response
STREAM_ID=$(echo $STREAM_RESPONSE | jq -r '.id')

if [ "$STREAM_ID" != "null" ]; then
  echo "Testing stream key regeneration for stream ID: $STREAM_ID"
  
  REGEN_RESPONSE=$(curl -b $COOKIE_JAR -X POST http://localhost:5000/api/streams/$STREAM_ID/regenerate-key \
    -H "Content-Type: application/json")
  
  echo "Stream key regeneration response:"
  echo $REGEN_RESPONSE | jq .
else
  echo "Stream creation failed, cannot test key regeneration"
fi