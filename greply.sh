#!/bin/bash
# Avoid env/alias side effects
unset GREP_OPTIONS 2>/dev/null || true
shopt -u expand_aliases 2>/dev/null || true

# Defaults
AFTER=0
BEFORE=0
CASE_FLAG="-i"
WORD_FLAG=""
RECURSIVE=0
COLOR_OPT="--color=always"   # default: colored output
PATH_ARG=""
PATTERN=""
MATCHER="-E"   # default: extended regex; switch to -F when requested

usage() {
  echo "Usage: $0 [options] <search_string> <file_or_directory>"
  echo "Options:"
  echo "  -c, --match-case     Enable case-sensitive match"
  echo "  -w, --whole-word     Match the whole word"
  echo "  -R, --recursive      Search directories recursively"
  echo "  -F, --fixed-strings  String literal matching (no regex)"
  echo "  -A <num>             Number of lines after match (default: 0)"
  echo "  -B <num>             Number of lines before match (default: 0)"
  echo "  -nc, --no-color          Disable colored output"
  exit 1
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--match-case) CASE_FLAG=""; shift ;;
    -w|--whole-word) WORD_FLAG="-w"; shift ;;
    -R|--recursive) RECURSIVE=1; shift ;;
    -F|--fixed-strings) MATCHER="-F"; shift ;; # <- select -F, don't add alongside -E
    -A) AFTER="$2"; shift 2 ;;
    -B) BEFORE="$2"; shift 2 ;;
    -nc|--no-color)  COLOR_OPT="--color=never"; shift ;;
    -*) echo "Unknown option: $1"; usage ;;
    *)
      if [[ -z "$PATTERN" ]]; then
        PATTERN="$1"
      elif [[ -z "$PATH_ARG" ]]; then
        PATH_ARG="$1"
      else
        echo "Unexpected argument: $1"; usage
      fi
      shift
      ;;
  esac
done

[[ -z "$PATTERN" || -z "$PATH_ARG" ]] && usage

# Build grep options
GREP_OPTS=("$MATCHER" -n "$COLOR_OPT" -A "$AFTER" -B "$BEFORE")
[[ -n "$CASE_FLAG" ]] && GREP_OPTS+=("$CASE_FLAG")
[[ -n "$WORD_FLAG" ]] && GREP_OPTS+=("$WORD_FLAG")

# Run
if [[ -f "$PATH_ARG" ]]; then
  command grep -H "${GREP_OPTS[@]}" -e "$PATTERN" -- "$PATH_ARG"

elif [[ -d "$PATH_ARG" ]]; then
  if (( RECURSIVE )); then
    command grep -H -R --binary-files=without-match "${GREP_OPTS[@]}" -e "$PATTERN" -- "$PATH_ARG"
  else
    mapfile -t FILES < <(find "$PATH_ARG" -maxdepth 1 -type f -print)
    (( ${#FILES[@]} == 0 )) && { echo "No files in directory: $PATH_ARG"; exit 1; }
    command grep -H "${GREP_OPTS[@]}" -e "$PATTERN" -- "${FILES[@]}"
  fi
else
  echo "Error: $PATH_ARG is not a valid file or directory."
  exit 1
fi
