#!/bin/bash
# Install Java JDK on Render's Linux environment
echo "Installing Java JDK..."
apt-get update -qq && apt-get install -y -qq default-jdk 2>/dev/null || echo "Java install skipped (no apt access)"

# Install Node dependencies
echo "Installing Node.js dependencies..."
npm install

echo "Build complete!"
