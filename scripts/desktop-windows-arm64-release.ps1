# Get root directory
$ROOT_DIR = git rev-parse --show-toplevel
Set-Location $ROOT_DIR

# Install dependencies and build for ARM64
yarn
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
yarn build:desktop:win:arm64 -v
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Make release directory
New-Item -ItemType Directory -Force -Path ./release | Out-Null

$ARM64_BUNDLE = "$ROOT_DIR/src-tauri/target/aarch64-pc-windows-msvc/release/bundle"

# Copy .msi files from the MSI bundle directory
Copy-Item -Path "$ARM64_BUNDLE/msi/*.msi" -Destination ./release -Force

# Copy .exe files from the EXE bundle directory
Copy-Item -Path "$ARM64_BUNDLE/nsis/*.exe" -Destination ./release -Force

# Prepend 'desktop-arm64-' to all .msi and .exe files in ./release
Get-ChildItem -Path ./release/*.msi,./release/*.exe -File | ForEach-Object {
    $newName = "desktop-arm64-$($_.Name)"
    Rename-Item -Path $_.FullName -NewName $newName
}

Write-Output "Done!"
