Set-Location "c:\Users\LB70XE\OneDrive - ING\Desktop\10xDevs_MVP"
Write-Host "Starting deployment..."
$response = Read-Host -Prompt "Would you like to continue with deployment? (Y/n)"

if ($response -eq "" -or $response -eq "Y" -or $response -eq "y") {
    node_modules\.bin\wrangler.cmd deploy
    Write-Host "Deployment complete!"
} else {
    Write-Host "Deployment cancelled"
}
