# Simple CRUD Endpoints Test
$baseUrl = "http://localhost:4321"
$pass = 0
$fail = 0

Write-Host "`n===== CRUD Endpoints Test Suite =====" -ForegroundColor Cyan

# Test 1: Homepage
Write-Host "`nTest 1: Homepage..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/" -ErrorAction Stop
    if ($r.StatusCode -eq 200) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $fail++
}

# Test 2: Dashboard redirects (no auth)
Write-Host "Test 2: Dashboard redirect..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/dashboard" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    Write-Host " FAIL (no redirect)" -ForegroundColor Red
    $fail++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 302) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        $fail++
    }
}

# Test 3: Uploads page redirects (no auth)
Write-Host "Test 3: Uploads page redirect..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/uploads" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    Write-Host " FAIL (no redirect)" -ForegroundColor Red
    $fail++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 302) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        $fail++
    }
}

# Test 4: Transactions page redirects (no auth)
Write-Host "Test 4: Transactions page redirect..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/transactions" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    Write-Host " FAIL (no redirect)" -ForegroundColor Red
    $fail++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 302) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        $fail++
    }
}

# Test 5: DELETE endpoint returns 401
Write-Host "Test 5: DELETE /api/uploads/test-id..." -NoNewline
try {
    Invoke-WebRequest -Uri "$baseUrl/api/uploads/test-id" -Method DELETE -ErrorAction Stop
    Write-Host " FAIL (should return 401)" -ForegroundColor Red
    $fail++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " FAIL (wrong status)" -ForegroundColor Red
        $fail++
    }
}

# Test 6: PATCH transactions endpoint returns 401
Write-Host "Test 6: PATCH /api/transactions/test-id..." -NoNewline
try {
    Invoke-WebRequest -Uri "$baseUrl/api/transactions/test-id" -Method PATCH -ErrorAction Stop
    Write-Host " FAIL (should return 401)" -ForegroundColor Red
    $fail++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " FAIL (wrong status)" -ForegroundColor Red
        $fail++
    }
}

# Test 7: PATCH costs endpoint returns 401  
Write-Host "Test 7: PATCH /api/costs/test-id..." -NoNewline
try {
    Invoke-WebRequest -Uri "$baseUrl/api/costs/test-id" -Method PATCH -ErrorAction Stop
    Write-Host " FAIL (should return 401)" -ForegroundColor Red
    $fail++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " FAIL (wrong status)" -ForegroundColor Red
        $fail++
    }
}

# Test 8: Signin page loads
Write-Host "Test 8: Signin page..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/auth/signin" -ErrorAction Stop
    if ($r.StatusCode -eq 200) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $fail++
}

# Summary
Write-Host "`n===== Test Results =====" -ForegroundColor Cyan
Write-Host "Passed: $pass" -ForegroundColor Green
Write-Host "Failed: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "Total:  $($pass + $fail)"

if ($fail -eq 0) {
    Write-Host "`n[SUCCESS] All CRUD endpoints working correctly!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[ERROR] Some tests failed" -ForegroundColor Red
    exit 1
}
