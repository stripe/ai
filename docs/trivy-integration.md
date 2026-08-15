Trivy integration (quick start)

This repository now includes a GitHub Actions job (.github/workflows/trivy-scan.yml) that runs Trivy filesystem scans on pushes to main and on pull requests.

Run locally (Docker):

- Scan the repo directory and produce a table report:
  docker run --rm -v "$(pwd)":/project aquasecurity/trivy:latest fs --severity CRITICAL,HIGH,MEDIUM -f table /project

- Output JSON for further processing:
  docker run --rm -v "$(pwd)":/project aquasecurity/trivy:latest fs --severity CRITICAL,HIGH,MEDIUM -f json -o /project/trivy-report.json /project

CI notes:
- The action used is aquasecurity/trivy-action; check job logs for scan output.
- Adjust 'severity' in .github/workflows/trivy-scan.yml to change which severities trigger reporting.
- For faster scans in CI, consider caching or targetting only changed files/directories.
