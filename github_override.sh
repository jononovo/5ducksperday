#!/bin/bash

# This script will clone a GitHub repository and override all files in the current directory

# Usage instructions
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <github_repo_url> <branch_name>"
  echo "Example: $0 https://github.com/username/repo.git main"
  exit 1
fi

REPO_URL=$1
BRANCH_NAME=$2

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temp directory: $TEMP_DIR"

# Clone the repository to the temporary directory
echo "Cloning $REPO_URL branch $BRANCH_NAME to temp directory..."
git clone -b $BRANCH_NAME $REPO_URL $TEMP_DIR

# Check if clone was successful
if [ $? -ne 0 ]; then
  echo "Failed to clone repository. Please check the URL and branch name."
  rm -rf $TEMP_DIR
  exit 1
fi

# Get the current directory
CURRENT_DIR=$(pwd)

# List files that will be moved (excluding .git and temp directory)
echo "Files that will be copied from repository:"
ls -la $TEMP_DIR | grep -v "^d.*\.git$"

# Confirm with user
echo ""
echo "WARNING: This will override ALL files in the current directory with files from the GitHub repository."
echo "Are you sure you want to continue? (y/n)"
read -p "> " CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "Operation cancelled."
  rm -rf $TEMP_DIR
  exit 1
fi

# Move all files from temp directory to current directory (excluding .git)
echo "Moving files from repository to current directory..."
rsync -av --exclude='.git' $TEMP_DIR/ $CURRENT_DIR/

# Clean up
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo "Done! Your directory now contains the files from $REPO_URL ($BRANCH_NAME branch)."
