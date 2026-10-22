# Run only after the root task gives GO and closes its online QA browsers.
$ErrorActionPreference = 'Stop'
$taskSession = 'bud-hosted-latency'
$taskUrl = 'https://alvenx.com/ui/budding-refinement-review-20261022/?baseline=https%3A%2F%2Falvenx.com%2Fui%2Fbudding-refinement-review-20261022-r5%2F'
$taskOutput = 'output/playwright/budding-latency-20261022'
try {
    playwright-cli "-s=$taskSession" open $taskUrl > "$taskOutput/paired-hosted-navigation.txt"
    if ($LASTEXITCODE -ne 0) { throw 'Could not open the hosted review.' }
    playwright-cli "-s=$taskSession" run-code --filename "$taskOutput/paired-comparison.cjs" > "$taskOutput/paired-hosted-cli.txt"
    if ($LASTEXITCODE -ne 0) { throw 'Hosted paired callback failed; inspect the retained CLI output.' }
    python "$taskOutput/summarize-paired.py" "$taskOutput/paired-hosted-cli.txt" --output-prefix "$taskOutput/paired-hosted"
    if ($LASTEXITCODE -ne 0) { throw 'Hosted summary validation failed.' }
} finally {
    playwright-cli "-s=$taskSession" close
}
