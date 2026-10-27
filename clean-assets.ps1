Get-ChildItem -Path "android\app\src\main\assets" -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    [System.IO.File]::Delete($_.FullName)
    [System.IO.File]::WriteAllBytes($_.FullName, $bytes)
}
