#!/bin/bash
set -euo pipefail

# This bootstrap uses its own EXIT trap to clean up the temp dir, so it does not
# add a pause here; the bundled installer it hands off to holds the window open.

# Remote bootstrap. Fetches the latest obfuscated UnlockMetal from
# mahfujmustafa.dev, unpacks it to a temp folder and runs the bundled installer.
#
#    curl -fsSL https://mahfujmustafa.dev/unlockmetal/install.sh | bash

BASE="https://mahfujmustafa.dev/unlockmetal"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

use_rich=1
[[ -t 1 ]] || use_rich=0
[[ -n "${NO_COLOR:-}" ]] && use_rich=0
[[ "${TERM:-}" == "dumb" || -z "${TERM:-}" ]] && use_rich=0
[[ "${UM_PLAIN:-}" == "1" ]] && use_rich=0

if [[ "$use_rich" == "1" ]]; then
   FAINT=$'\033[38;5;240m'
   TEXT=$'\033[38;5;253m'
   ACCENT=$'\033[38;5;39m'
   BAD=$'\033[38;5;203m'
   BOLD=$'\033[1m'
   RESET=$'\033[0m'
   GLYPH_DOT="$(printf '\302\267')"
   GLYPH_CROSS="$(printf '\342\234\227')"
   GLYPH_DASH="$(printf '\342\224\200')"
else
   FAINT="" TEXT="" ACCENT="" BAD="" BOLD="" RESET=""
   GLYPH_DOT="-" GLYPH_CROSS="x" GLYPH_DASH="-"
fi

RULE=""
for _ in $(seq 1 36); do RULE="$RULE$GLYPH_DASH"; done

printf '\n'
printf '   %s%sUNLOCK%sMETAL%s\n' "$BOLD" "$TEXT" "$ACCENT" "$RESET"
printf '   %sframe limiter bypass  %s  remote install%s\n' "$FAINT" "$GLYPH_DOT" "$RESET"
printf '   %s%s%s\n\n' "$FAINT" "$RULE" "$RESET"

step() {
   printf '   %s%s%s %s%s%s\n' "$ACCENT" "$GLYPH_DOT" "$RESET" "$TEXT" "$1" "$RESET"
}

die() {
   printf '   %s%s%s %s%s%s\n\n' "$BAD" "$GLYPH_CROSS" "$RESET" "$TEXT" "$1" "$RESET" >&2
   exit 1
}

if [[ "$(arch)" != "arm64" ]]; then
   die "Apple silicon (arm64) required"
fi

step "Downloading latest build"
curl -fsSL "$BASE/UnlockMetal.zip" -o "$WORK/UnlockMetal.zip" || die "download failed"

step "Unpacking"
unzip -oq "$WORK/UnlockMetal.zip" -d "$WORK" || die "archive could not be unpacked"

INNER="$WORK/UnlockMetal/install.sh"

if [[ ! -f "$INNER" ]]; then
   die "bundled installer missing from the archive"
fi

# Run the bundled installer with stdin detached from the curl pipe (this script
# is itself being read from that pipe under `curl | bash`), and without exec so
# the pipe is not handed to a replacement process.
chmod +x "$INNER"
bash "$INNER" </dev/null
exit $?
