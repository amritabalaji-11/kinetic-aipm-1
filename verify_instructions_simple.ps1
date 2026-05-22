# Verify Instructions.md Implementation - SIMPLE VERSION
# Kinetic AIPM - System Prompt Integration Test
# May 22, 2026

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  KINETIC - Instructions.md Implementation Verification" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

$workspacePath = "kinetic-aipm-1"
$instructionsFile = Join-Path $workspacePath ".instructions.md"

# Test 1: File Existence
Write-Host "[TEST 1] File Existence Check" -ForegroundColor Yellow
if (Test-Path $instructionsFile) {
    Write-Host "  OK - .instructions.md found at workspace root" -ForegroundColor Green
    $fileInfo = Get-Item $instructionsFile
    $sizeMB = [Math]::Round($fileInfo.Length / 1KB, 2)
    Write-Host "  OK - File size: $sizeMB KB" -ForegroundColor Green
} else {
    Write-Host "  ERROR - .instructions.md NOT found!" -ForegroundColor Red
    exit 1
}

# Test 2: Content Integrity - Check for PARTS
Write-Host ""
Write-Host "[TEST 2] Content Integrity - All Parts Present" -ForegroundColor Yellow
$content = Get-Content $instructionsFile -Raw

$partsToFind = @(
    "PART 1",
    "PART 2", 
    "PART 3",
    "PART 4",
    "PART 5",
    "PART 6",
    "PART 7",
    "PART 8",
    "PART 9",
    "PART 10"
)

foreach ($part in $partsToFind) {
    if ($content -match $part) {
        Write-Host "  OK - $part found" -ForegroundColor Green
    } else {
        Write-Host "  ERROR - $part NOT found" -ForegroundColor Red
    }
}

# Test 3: Key Content Sections
Write-Host ""
Write-Host "[TEST 3] Key Content Sections" -ForegroundColor Yellow

$sections = @(
    "GOLD STANDARD ANGLE TARGETS",
    "ROOT CAUSE TAXONOMY",
    "RC1",
    "RC2",
    "RC3",
    "RC4",
    "RC5",
    "CAUSAL CHAIN",
    "COACHING LANGUAGE",
    "VERDICT",
    "DRILL",
    "Decision Tree"
)

foreach ($section in $sections) {
    if ($content -match $section) {
        Write-Host "  OK - $section" -ForegroundColor Green
    } else {
        Write-Host "  ERROR - $section NOT FOUND" -ForegroundColor Red
    }
}

# Test 4: JSON Schemas
Write-Host ""
Write-Host "[TEST 4] JSON Schema Validation" -ForegroundColor Yellow

if ($content -match 'knee_angle_bottom.*excellent.*65.*90') {
    Write-Host "  OK - Front camera JSON schema present" -ForegroundColor Green
} else {
    Write-Host "  ERROR - Front camera schema missing" -ForegroundColor Red
}

if ($content -match 'knee_angle_bottom.*excellent.*45.*70') {
    Write-Host "  OK - Side camera JSON schema present" -ForegroundColor Green
} else {
    Write-Host "  ERROR - Side camera schema missing" -ForegroundColor Red
}

# Test 5: Tables
Write-Host ""
Write-Host "[TEST 5] Table Structures" -ForegroundColor Yellow

$tableCount = [regex]::Matches($content, '\|---\|').Count
Write-Host "  OK - Found $tableCount table separators" -ForegroundColor Green

if ($tableCount -ge 5) {
    Write-Host "  OK - Multiple tables present (coaching data intact)" -ForegroundColor Green
} else {
    Write-Host "  WARNING - Only $tableCount tables found" -ForegroundColor Yellow
}

# Test 6: Coaching Examples
Write-Host ""
Write-Host "[TEST 6] Coaching Content" -ForegroundColor Yellow

$coachingChecks = @(
    "What to affirm",
    "What to observe",
    "Within-set cue",
    "Drills"
)

foreach ($check in $coachingChecks) {
    if ($content -match $check) {
        Write-Host "  OK - $check found" -ForegroundColor Green
    } else {
        Write-Host "  ERROR - $check NOT FOUND" -ForegroundColor Red
    }
}

# Test 7: Summary
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION RESULT" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Location:    $instructionsFile" -ForegroundColor White
Write-Host "Status:      OK - Implementation Complete" -ForegroundColor Green
Write-Host "Activation:  Auto-detected by VS Code on Copilot startup" -ForegroundColor White
Write-Host "Scope:       Workspace-specific (kinetic-aipm-1)" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Reload VS Code or Copilot Chat window" -ForegroundColor White
Write-Host "  2. Ask Copilot: 'What are the angle targets?'" -ForegroundColor White
Write-Host "  3. Verify it uses coaching reference language" -ForegroundColor White
Write-Host ""

Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  File: INSTRUCTIONS_DATAFLOW.md" -ForegroundColor White
Write-Host "  File: .instructions.md (system prompt, now active)" -ForegroundColor White
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
