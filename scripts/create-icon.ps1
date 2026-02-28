# Create a simple icon for the application
# This script generates a basic PNG icon

Add-Type -AssemblyName System.Drawing

$size = 256
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Enable anti-aliasing
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background - gradient blue
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($size, $size)),
    [System.Drawing.Color]::FromArgb(255, 10, 132, 255),
    [System.Drawing.Color]::FromArgb(255, 88, 86, 214)
)

# Draw rounded rectangle background
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 50
$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$path.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
$path.AddArc($rect.X + $rect.Width - $radius, $rect.Y, $radius, $radius, 270, 90)
$path.AddArc($rect.X + $rect.Width - $radius, $rect.Y + $rect.Height - $radius, $radius, $radius, 0, 90)
$path.AddArc($rect.X, $rect.Y + $rect.Height - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()

$graphics.FillPath($brush, $path)

# Draw "P" letter
$font = New-Object System.Drawing.Font("Segoe UI", 140, [System.Drawing.FontStyle]::Bold)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$stringFormat = New-Object System.Drawing.StringFormat
$stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

$graphics.DrawString("P", $font, $whiteBrush, ($size / 2), ($size / 2), $stringFormat)

# Save PNG
$pngPath = Join-Path $PSScriptRoot "..\assets\icon.png"
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Icon created at: $pngPath"

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$brush.Dispose()
$whiteBrush.Dispose()
$font.Dispose()
