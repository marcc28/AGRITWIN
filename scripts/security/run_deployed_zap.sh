#!/usr/bin/env bash
set -uo pipefail

report_dir="${GITHUB_WORKSPACE:-$PWD}/reports/security/.work"
mkdir -p "$report_dir"
chmod 777 "$report_dir"
image="ghcr.io/zaproxy/zaproxy:stable"

if ! docker pull "$image"; then
  exit 1
fi
docker image inspect --format '{{index .RepoDigests 0}}' "$image" > "$report_dir/image-digest.txt"

scanner_options='-config spider.processForm=false -config spider.postForm=false -config spider.thread=1'

docker run --rm -v "$report_dir:/zap/wrk:rw" "$image" \
  zap-baseline.py -t https://backend-web-ur8z.onrender.com/docs \
  -m 1 -T 5 --autooff -z "$scanner_options" \
  -J zap-baseline.json > "$report_dir/zap-baseline.log" 2>&1
baseline_status=$?
printf '%s\n' "$baseline_status" > "$report_dir/zap-baseline.exit"

if [ -s "$report_dir/openapi-readonly.json" ]; then
  docker run --rm -v "$report_dir:/zap/wrk:rw" "$image" \
    zap-api-scan.py -t /zap/wrk/openapi-readonly.json -f openapi \
    -S -T 5 -z "$scanner_options" \
    -J zap-api.json > "$report_dir/zap-api.log" 2>&1
  api_status=$?
else
  api_status=3
fi
printf '%s\n' "$api_status" > "$report_dir/zap-api.exit"

if [ "$baseline_status" -gt 2 ] || [ "$api_status" -gt 2 ]; then
  printf 'Scanner execution failed. Exit codes: baseline=%s api=%s\n' "$baseline_status" "$api_status"
  exit 1
fi
