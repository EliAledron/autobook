$target = Join-Path $PSScriptRoot "android\app\src\main\assets"
Write-Host "Cleaning assets in $target..."
Get-ChildItem -Path $target -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    [System.IO.File]::Delete($_.FullName)
    [System.IO.File]::WriteAllBytes($_.FullName, $bytes)
}
Write-Host "Done cleaning assets."
