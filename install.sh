#!/bin/bash

# Usage: ./install.sh [install_method] [version]
# install_method: "wget" (direct download) or "npm" (clone + npm pack)
# version: optional tag version for npm mode (e.g., "0.0.1", "v1.0.0") - defaults to "main"

INSTALL_METHOD=${1:-}
VERSION=${2:-}

echo "Installing greply..."

if [ "$INSTALL_METHOD" = "npm" ]; then
    
    echo "Installing via npm pack (clone + build)"
    
    # Create temp directory for build
    rm -rf /tmp/greply-install && mkdir -p /tmp/greply-install && cd /tmp/greply-install
    
    # Clone and checkout version if specified
    git clone -q git@github.com:AnthonyRuffino/greply.git
    cd greply/
    
    if [ -n "$VERSION" ]; then
        echo "Checking out version: $VERSION"
        if ! git checkout -q "$VERSION"; then
            echo "Error: Failed to checkout version $VERSION"
            exit 1
        fi
    fi
    
    if [ -n "$VERSION" ]; then
        # Use provided version parameter
        PACKAGE_VERSION="$VERSION"
    else
        # Extract version from package.json using greply.sh
        VERSION_LINE=$(grep --color=never '"version": "' package.json)
        PACKAGE_VERSION=$(echo "$VERSION_LINE" | sed 's/.*"version": "\([^"]*\)".*/\1/')
        echo "Checking out version from main package.json: ${PACKAGE_VERSION}"
        git checkout -q "${PACKAGE_VERSION}"
    fi

    # Build and install
    npm pack --silent
    cd ..
    cp "greply/greply-${PACKAGE_VERSION}.tgz" .
    echo "Installing greply npm package: greply-${PACKAGE_VERSION}.tgz"
    npm i --silent "greply-${PACKAGE_VERSION}.tgz"

    
    echo "Installing greply via npm install()"

    node -e '
    (async () => {
        try {
        const m = await import("greply");
        await m.install();
        console.log("✅ NPM Installation was successful.");
        } catch (error) {
        console.error("NPM Installation failed:", error);
        }
    })()
    '
    # Cleanup
    #rm -rf /tmp/greply-install
    echo "clean up done"  
else
    echo "Installing via wget/curl from GitHub"
    
    # Create target directory
    mkdir -p ~/.local/bin
    
    # Check if target file exists and prompt user
    if [ -f ~/.local/bin/greply ]; then
        read -p "File ~/.local/bin/greply already exists. Overwrite? [y/N]: "
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Installation cancelled."
            exit 0
        fi
    fi
    
    # Try wget first, fallback to curl if wget not available
    if command -v wget >/dev/null 2>&1; then
        echo "Using wget to download..."
        # Download based on version parameter
        if [ -n "$VERSION" ]; then
            echo "Downloading version: $VERSION"
            wget -O greply "https://raw.githubusercontent.com/AnthonyRuffino/greply/refs/tags/$VERSION/greply.sh"
        else
            wget -O greply "https://raw.githubusercontent.com/AnthonyRuffino/greply/refs/heads/main/greply.sh"
        fi
    elif command -v curl >/dev/null 2>&1; then
        echo "Using curl to download..."
        # Download based on version parameter
        if [ -n "$VERSION" ]; then
            echo "Downloading version: $VERSION"
            curl -sSL -o greply "https://raw.githubusercontent.com/AnthonyRuffino/greply/refs/tags/$VERSION/greply.sh"
        else
            curl -sSL -o greply "https://raw.githubusercontent.com/AnthonyRuffino/greply/refs/heads/main/greply.sh"
        fi
    else
        echo "Error: Neither wget nor curl is available. Please install one of them and try again."
        exit 1
    fi
    
    chmod +x greply
    mv greply ~/.local/bin/greply
    echo "✅ greply installed to ~/.local/bin/greply"
fi
