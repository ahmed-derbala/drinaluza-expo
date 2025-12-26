#!/bin/zsh

# Navigate to the project directory
TARGET_DIR="$HOME/work/drinaluza/drinaluza-expo"

while true; do
    echo "--- Starting build at $(date) ---"

    # Check if directory exists before entering
    if cd "$TARGET_DIR"; then
        npm run build:apk
    else
        echo "Error: Directory $TARGET_DIR not found."
        exit 1
    fi

    echo "Build complete. Waiting 1 hour..."

    # 3600 seconds = 1 hour
    sleep 3600
done