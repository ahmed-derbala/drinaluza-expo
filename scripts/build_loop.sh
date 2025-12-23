#!/bin/zsh

# Navigate to the project directory
TARGET_DIR="$HOME/work/drinaluza/drinaluza-expo"

while true; do
    echo "--- Starting build at $(date) ---"

    # Check if directory exists before entering
    if cd "$TARGET_DIR"; then
        npm run build
    else
        echo "Error: Directory $TARGET_DIR not found."
        exit 1
    fi

    echo "Build complete. Waiting 3 hours..."

    # 10800 seconds = 3 hours
    sleep 10800
done