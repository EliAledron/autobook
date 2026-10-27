$target = Join-Path $PSScriptRoot "android\app\src\main\assets"
Write-Host "Cleaning assets in $target..."
Get-ChildItem -Path $target -Recurse -Force | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
    try {
        $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
        [System.IO.File]::Delete($_.FullName)
        [System.IO.File]::WriteAllBytes($_.FullName, $bytes)
    } catch {
        Write-Warning "Could not re-write $($_.FullName): $_"
    }
}
Write-Host "Done cleaning assets."
