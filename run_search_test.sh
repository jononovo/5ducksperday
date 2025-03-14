#!/bin/bash

# Search Test Runner Script
# This script runs a series of search tests and compares the results

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 5 Ducks Search Quality Testing ===${NC}"
echo "Starting test process..."

# Test configuration
STRATEGY_ID=17
TEST_ENDPOINT="http://localhost:5000/api/search-test-run"

# Define test cases
declare -a TEST_QUERIES=(
  "tech startups in San Francisco"
  "marketing agencies in New York"
  "healthcare providers in Chicago"
)

# Function to run a single test
run_test() {
  local query=$1
  local strategy_id=$2
  local output_file=$3
  
  echo -e "${YELLOW}Running test: '${query}'${NC}"
  
  # Generate a unique test ID
  test_id="test-$(date +%s)-$(LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c 8)"
  
  # Curl command to execute the test
  response=$(curl -s -X POST "$TEST_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$query\",\"strategyId\":$strategy_id,\"testId\":\"$test_id\"}")
  
  # Check if request was successful
  if [[ $response == *"error"* ]]; then
    echo -e "${RED}Error running test: $response${NC}"
    return 1
  fi
  
  # Save the response to a file
  echo "$response" > "$output_file"
  echo -e "${GREEN}Test completed and saved to $output_file${NC}"
  
  # Extract some basic scores from the response for display
  company_quality=$(echo "$response" | grep -o '"companyQuality":[0-9]*' | cut -d':' -f2)
  contact_quality=$(echo "$response" | grep -o '"contactQuality":[0-9]*' | cut -d':' -f2)
  email_quality=$(echo "$response" | grep -o '"emailQuality":[0-9]*' | cut -d':' -f2)
  overall_score=$(echo "$response" | grep -o '"overallScore":[0-9]*' | cut -d':' -f2)
  
  echo "Results: Company Quality: $company_quality, Contact Quality: $contact_quality, Email Quality: $email_quality, Overall: $overall_score"
  
  return 0
}

# Run the baseline tests
echo -e "\n${BLUE}=== Running Baseline Tests ===${NC}"
for i in "${!TEST_QUERIES[@]}"; do
  index=$((i+1))
  run_test "${TEST_QUERIES[$i]}" "$STRATEGY_ID" "final_test$index.json"
done

# Compare results with baseline tests
echo -e "\n${BLUE}=== Comparing Results with Baseline ===${NC}"
echo "Baseline tests are in baseline_test*.json"
echo "Current tests are in final_test*.json"

# Simple comparison of contact quality scores
for i in {1..3}; do
  baseline_contact=$(grep -o '"contactQuality":[0-9]*' "baseline_test$i.json" | head -1 | cut -d':' -f2)
  final_contact=$(grep -o '"contactQuality":[0-9]*' "final_test$i.json" | head -1 | cut -d':' -f2)
  
  if [[ -n "$baseline_contact" && -n "$final_contact" ]]; then
    diff=$((final_contact - baseline_contact))
    if (( diff > 0 )); then
      echo -e "Test $i: Contact Quality ${GREEN}improved by $diff points${NC} ($baseline_contact → $final_contact)"
    elif (( diff < 0 )); then
      echo -e "Test $i: Contact Quality ${RED}decreased by $((diff * -1)) points${NC} ($baseline_contact → $final_contact)"
    else
      echo -e "Test $i: Contact Quality ${YELLOW}unchanged${NC} ($baseline_contact)"
    fi
  else
    echo -e "${RED}Could not extract contact quality scores from test $i${NC}"
  fi
done

echo -e "\n${BLUE}=== Testing Complete ===${NC}"