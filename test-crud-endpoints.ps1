# Test CRUD Endpoints
# Prosty smoke test dla nowo zaimplementowanych funkcjonalności

$baseUrl = "http://localhost:4321"
$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "`n=== Testing: $Name ===" -ForegroundColor Cyan
    Write-Host "URL: $Url"
    Write-Host "Method: $Method"
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -ErrorAction Stop
        $status = $response.StatusCode
        
        if ($status -eq $ExpectedStatus) {
            Write-Host "[PASS] Status: $status" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[FAIL] Expected: $ExpectedStatus, Got: $status" -ForegroundColor Red
            return $false
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "[PASS] Status: $statusCode (expected)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
            return $false
        }
    }
}

Write-Host "`n╔═══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   CRUD Endpoints - Smoke Test Suite      ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Magenta

# Test 1: Homepage loads
if (Test-Endpoint -Name "Homepage" -Url "$baseUrl/" -ExpectedStatus 200) {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 2: Dashboard requires auth (redirect to signin)
if (Test-Endpoint -Name "Dashboard (auth required)" -Url "$baseUrl/dashboard" -ExpectedStatus 302) {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 3: New uploads management page exists (requires auth)
if (Test-Endpoint -Name "Uploads page (auth required)" -Url "$baseUrl/uploads" -ExpectedStatus 302) {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 4: New transactions page exists (requires auth)
if (Test-Endpoint -Name "Transactions page (auth required)" -Url "$baseUrl/transactions" -ExpectedStatus 302) {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 5: DELETE endpoint exists (will return 401 without auth)
if (Test-Endpoint -Name "DELETE /api/uploads/test-id" -Url "$baseUrl/api/uploads/test-id" -Method "DELETE" -ExpectedStatus 401) {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 6: PATCH transactions endpoint exists (will return 401 without auth)
if (Test-Endpoint -Name "PATCH /api/transactions/test-id" -Url "$baseUrl/api/transactions/test-id" -Method "PATCH" -ExpectedStatus 401) {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 7: PATCH costs endpoint exists (will return 401 without auth)
if (Test-Endpoint -Name "PATCH /api/costs/test-id" -Url "$baseUrl/api/costs/test-id" -Method "PATCH" -ExpectedStatus 401) {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 8: Signin page loads
if (Test-Endpoint -Name "Signin page" -Url "$baseUrl/auth/signin" -ExpectedStatus 200) {
    $testsPassed++
} else {
    $testsFailed++
}

# Results summary
Write-Host "`n╔═══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║           Test Results Summary            ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Magenta

Write-Host "`nTests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -gt 0) { "Red" } else { "Green" })
Write-Host "Total Tests: $($testsPassed + $testsFailed)"

if ($testsFailed -eq 0) {
    Write-Host "`n[SUCCESS] All tests passed! CRUD endpoints are working." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[ERROR] Some tests failed. Check the output above." -ForegroundColor Red
    exit 1
}
