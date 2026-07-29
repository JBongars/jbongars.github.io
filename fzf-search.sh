#!/usr/bin/env bash

set -eo pipefail

VI=$(which nvim || which vim || which vi || which nano)

function usage() {
	echo "Usage: $0 [search_term] [folder]"
	echo "  folder: Subfolder to search in (optional)"
	echo ""
	echo "Examples:"
	echo "  $0                    # Browse all files"
	echo "  $0 \"\" methodology    # Browse files in methodology folder"
	exit 0
}

# Handle help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
	usage
fi

SCRIPT_DIR="$(dirname "$0")"
SEARCH="${1:-}"
FOLDER="${2:-}"

FOLDER_PATH=$(cd "${SCRIPT_DIR}/.." && pwd)

function search_filename() {
	local dir_path="$1"
	
	# Check if directory exists
	if [[ ! -d "$dir_path" ]]; then
		echo "Directory '$dir_path' does not exist"
		exit 1
	fi
	
	local filename="$(find "$dir_path" -type f \( -name "*.md" -o -name "*.txt" -o -name "*.org" \) \
		| fzf --multi --preview "bat --color=always {}" --preview-window=right:60% )"

	if [ ! "$filename" = "" ]; then
		"$VI" "$filename"
	fi
}

# handle folder path
if [ -d "${FOLDER_PATH}/${FOLDER}" ]; then
	FOLDER_PATH="${FOLDER_PATH}/${FOLDER}"
fi

# Main logic
search_filename "$FOLDER_PATH"
