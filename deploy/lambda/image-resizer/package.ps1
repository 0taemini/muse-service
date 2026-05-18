$ErrorActionPreference = "Stop"

if (Test-Path "image-resizer.zip") {
    Remove-Item "image-resizer.zip"
}

npm.cmd install --omit=dev --os=linux --cpu=x64 --libc=glibc
Compress-Archive -Path "index.js", "package.json", "node_modules" -DestinationPath "image-resizer.zip"
Write-Host "Created image-resizer.zip"
