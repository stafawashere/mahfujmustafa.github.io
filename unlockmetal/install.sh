#!/bin/bash
set -euo pipefail

# Remote bootstrap. Fetches the latest obfuscated UnlockMetal from
# mahfujmustafa.dev, unpacks it to a temp folder and runs the bundled installer.
#
#    curl -fsSL https://mahfujmustafa.dev/unlockmetal/install.sh | bash

BASE="https://mahfujmustafa.dev/unlockmetal"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "UnlockMetal remote installer"

if [[ "$(arch)" != "arm64" ]]; then
   echo "error: this build is Apple silicon (arm64) only" >&2
   exit 1
fi

echo "==> Downloading UnlockMetal.zip"
curl -fsSL "$BASE/UnlockMetal.zip" -o "$WORK/UnlockMetal.zip"

echo "==> Unpacking"
unzip -oq "$WORK/UnlockMetal.zip" -d "$WORK"

INNER="$WORK/UnlockMetal/install.sh"

if [[ ! -f "$INNER" ]]; then
   echo "error: bundled installer missing from the archive" >&2
   exit 1
fi

chmod +x "$INNER"
echo "==> Running installer"
"$INNER"
