# Convert PNG to ICO
# Requires the PNG file to already exist

Add-Type -AssemblyName System.Drawing

$pngPath = Join-Path $PSScriptRoot "..\assets\icon.png"
$icoPath = Join-Path $PSScriptRoot "..\assets\icon.ico"

if (-not (Test-Path $pngPath)) {
    Write-Error "PNG file not found at: $pngPath"
    exit 1
}

# Load the PNG
$png = [System.Drawing.Image]::FromFile($pngPath)

# Create multiple sizes for ICO
$sizes = @(16, 32, 48, 256)
$icons = @()

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($png, 0, 0, $size, $size)
    $graphics.Dispose()
    $icons += $bitmap
}

# Create ICO file using the 256x256 image
$icon256 = $icons[3]
$memoryStream = New-Object System.IO.MemoryStream
$icon256.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)

# Create ICO header
$icoHeader = [byte[]]@(
    0, 0,           # Reserved
    1, 0,           # Type (1 = ICO)
    1, 0            # Number of images (just using 256x256 for simplicity)
)

$imageData = $memoryStream.ToArray()
$imageSize = $imageData.Length

# ICO directory entry
$icoEntry = [byte[]]@(
    0,              # Width (0 = 256)
    0,              # Height (0 = 256)
    0,              # Color palette
    0,              # Reserved
    1, 0,           # Color planes
    32, 0           # Bits per pixel
)

# Size of image data (4 bytes, little endian)
$sizeBytes = [BitConverter]::GetBytes([uint32]$imageSize)
$icoEntry += $sizeBytes

# Offset to image data (4 bytes, little endian) - header(6) + entry(16)
$offsetBytes = [BitConverter]::GetBytes([uint32]22)
$icoEntry += $offsetBytes

# Write ICO file
$fileStream = [System.IO.File]::Create($icoPath)
$fileStream.Write($icoHeader, 0, $icoHeader.Length)
$fileStream.Write($icoEntry, 0, $icoEntry.Length)
$fileStream.Write($imageData, 0, $imageData.Length)
$fileStream.Close()

# Cleanup
$png.Dispose()
foreach ($icon in $icons) {
    $icon.Dispose()
}
$memoryStream.Dispose()

Write-Host "ICO created at: $icoPath"
