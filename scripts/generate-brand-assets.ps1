Add-Type -AssemblyName System.Drawing

function New-RoundedPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-BrandSymbol {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$OffsetX,
    [float]$OffsetY,
    [float]$Scale,
    [System.Drawing.Color]$Color,
    [float]$StrokeMultiplier = 1.0,
    [float]$WheelMultiplier = 1.0
  )

  $pen = New-Object System.Drawing.Pen($Color, (34.0 * $Scale * $StrokeMultiplier))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $Graphics.DrawLine($pen, $OffsetX + (350.0 * $Scale), $OffsetY + (470.0 * $Scale), $OffsetX + (520.0 * $Scale), $OffsetY + (500.0 * $Scale))
  $Graphics.DrawLine($pen, $OffsetX + (520.0 * $Scale), $OffsetY + (500.0 * $Scale), $OffsetX + (590.0 * $Scale), $OffsetY + (285.0 * $Scale))
  $Graphics.DrawLine($pen, $OffsetX + (590.0 * $Scale), $OffsetY + (285.0 * $Scale), $OffsetX + (910.0 * $Scale), $OffsetY + (285.0 * $Scale))
  $Graphics.DrawLine($pen, $OffsetX + (910.0 * $Scale), $OffsetY + (285.0 * $Scale), $OffsetX + (860.0 * $Scale), $OffsetY + (500.0 * $Scale))
  $Graphics.DrawLine($pen, $OffsetX + (520.0 * $Scale), $OffsetY + (500.0 * $Scale), $OffsetX + (860.0 * $Scale), $OffsetY + (500.0 * $Scale))
  $Graphics.DrawLine($pen, $OffsetX + (300.0 * $Scale), $OffsetY + (260.0 * $Scale), $OffsetX + (420.0 * $Scale), $OffsetY + (280.0 * $Scale))
  $Graphics.DrawLine($pen, $OffsetX + (405.0 * $Scale), $OffsetY + (350.0 * $Scale), $OffsetX + (465.0 * $Scale), $OffsetY + (350.0 * $Scale))
  $Graphics.DrawArc($pen, $OffsetX + (595.0 * $Scale), $OffsetY + (165.0 * $Scale), 150.0 * $Scale, 170.0 * $Scale, 180, 180)
  $Graphics.DrawLine($pen, $OffsetX + (595.0 * $Scale), $OffsetY + (250.0 * $Scale), $OffsetX + (595.0 * $Scale), $OffsetY + (165.0 * $Scale))
  $Graphics.DrawLine($pen, $OffsetX + (745.0 * $Scale), $OffsetY + (250.0 * $Scale), $OffsetX + (745.0 * $Scale), $OffsetY + (165.0 * $Scale))

  $brush = New-Object System.Drawing.SolidBrush($Color)
  $font = New-Object System.Drawing.Font('Segoe UI', (166.0 * $Scale), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $stringFormat = New-Object System.Drawing.StringFormat
  $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = [System.Drawing.RectangleF]::new(
    $OffsetX + (558.0 * $Scale),
    $OffsetY + (250.0 * $Scale),
    220.0 * $Scale,
    230.0 * $Scale
  )
  $Graphics.DrawString("`$", $font, $brush, $rect, $stringFormat)
  $wheelSize = 52.0 * $Scale * $WheelMultiplier
  $wheelY = $OffsetY + (554.0 * $Scale) - (($wheelSize - (36.0 * $Scale)) / 2)
  $leftWheelX = $OffsetX + (555.0 * $Scale) - (($wheelSize - (36.0 * $Scale)) / 2)
  $rightWheelX = $OffsetX + (745.0 * $Scale) - (($wheelSize - (36.0 * $Scale)) / 2)
  $Graphics.FillEllipse($brush, $leftWheelX, $wheelY, $wheelSize, $wheelSize)
  $Graphics.FillEllipse($brush, $rightWheelX, $wheelY, $wheelSize, $wheelSize)

  $stringFormat.Dispose()
  $font.Dispose()
  $brush.Dispose()
  $pen.Dispose()
}

function New-Graphics {
  param([System.Drawing.Bitmap]$Bitmap)

  $graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return $graphics
}

$assetsPath = 'd:\Mis proyectos\tienda-app\assets'
$playstorePath = Join-Path $assetsPath 'playstore'

$greenDark = [System.Drawing.Color]::FromArgb(255, 15, 90, 63)
$greenMid = [System.Drawing.Color]::FromArgb(255, 31, 122, 89)
$greenLight = [System.Drawing.Color]::FromArgb(255, 31, 122, 89)
$white = [System.Drawing.Color]::White
$softCircle = [System.Drawing.Color]::FromArgb(38, 255, 255, 255)
$softCircle2 = [System.Drawing.Color]::FromArgb(24, 255, 255, 255)
$softPanel = [System.Drawing.Color]::FromArgb(28, 255, 255, 255)
$softPanelBorder = [System.Drawing.Color]::FromArgb(80, 255, 255, 255)
$accentDot = [System.Drawing.Color]::FromArgb(255, 255, 233, 157)

$iconBitmap = New-Object System.Drawing.Bitmap 512, 512
$iconGraphics = New-Graphics $iconBitmap
$iconRect = [System.Drawing.Rectangle]::new(0, 0, 512, 512)
$iconBackground = New-Object System.Drawing.Drawing2D.LinearGradientBrush($iconRect, $greenDark, $greenLight, 45)
$iconPath = New-RoundedPath -X 23 -Y 23 -Width 466 -Height 466 -Radius 70
$iconGraphics.FillPath($iconBackground, $iconPath)
$iconGraphics.FillEllipse((New-Object System.Drawing.SolidBrush($softCircle)), 320, -40, 210, 210)
$iconGraphics.FillEllipse((New-Object System.Drawing.SolidBrush($softCircle2)), -40, 380, 130, 130)
$innerPath = New-RoundedPath -X 78 -Y 70 -Width 356 -Height 356 -Radius 36
$iconGraphics.FillPath((New-Object System.Drawing.SolidBrush($softPanel)), $innerPath)
Draw-BrandSymbol -Graphics $iconGraphics -OffsetX 20 -OffsetY 100 -Scale 0.39 -Color $white -StrokeMultiplier 1.14 -WheelMultiplier 1.22
$iconGraphics.Dispose()
$iconBitmap.Save((Join-Path $assetsPath 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$iconBitmap.Dispose()
$iconBackground.Dispose()
$iconPath.Dispose()
$innerPath.Dispose()

$adaptiveBitmap = New-Object System.Drawing.Bitmap 1024, 1024
$adaptiveGraphics = New-Graphics $adaptiveBitmap
$adaptiveRect = [System.Drawing.Rectangle]::new(0, 0, 1024, 1024)
$adaptiveBackground = New-Object System.Drawing.Drawing2D.LinearGradientBrush($adaptiveRect, $greenDark, $greenLight, 45)
$adaptivePath = New-RoundedPath -X 46 -Y 46 -Width 932 -Height 932 -Radius 140
$adaptiveGraphics.FillPath($adaptiveBackground, $adaptivePath)
$adaptiveGraphics.FillEllipse((New-Object System.Drawing.SolidBrush($softCircle)), 640, -80, 420, 420)
$adaptiveGraphics.FillEllipse((New-Object System.Drawing.SolidBrush($softCircle2)), -80, 760, 260, 260)
$adaptiveInnerPath = New-RoundedPath -X 156 -Y 140 -Width 712 -Height 712 -Radius 72
$adaptiveGraphics.FillPath((New-Object System.Drawing.SolidBrush($softPanel)), $adaptiveInnerPath)
Draw-BrandSymbol -Graphics $adaptiveGraphics -OffsetX 34 -OffsetY 202 -Scale 0.79 -Color $white -StrokeMultiplier 1.14 -WheelMultiplier 1.22
$adaptiveGraphics.Dispose()
$adaptiveBitmap.Save((Join-Path $assetsPath 'adaptive-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$adaptiveBitmap.Dispose()
$adaptiveBackground.Dispose()
$adaptivePath.Dispose()
$adaptiveInnerPath.Dispose()

$faviconBitmap = New-Object System.Drawing.Bitmap 256, 256
$faviconGraphics = New-Graphics $faviconBitmap
$faviconRect = [System.Drawing.Rectangle]::new(0, 0, 256, 256)
$faviconBackground = New-Object System.Drawing.Drawing2D.LinearGradientBrush($faviconRect, $greenDark, $greenMid, 45)
$faviconPath = New-RoundedPath -X 10 -Y 10 -Width 236 -Height 236 -Radius 40
$faviconGraphics.FillPath($faviconBackground, $faviconPath)
$faviconGraphics.FillEllipse((New-Object System.Drawing.SolidBrush($softCircle2)), 150, -20, 120, 120)
Draw-BrandSymbol -Graphics $faviconGraphics -OffsetX 2 -OffsetY 50 -Scale 0.21 -Color $white -StrokeMultiplier 1.12 -WheelMultiplier 1.22
$faviconGraphics.Dispose()
$faviconBitmap.Save((Join-Path $assetsPath 'favicon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$faviconBitmap.Dispose()
$faviconBackground.Dispose()
$faviconPath.Dispose()

$featureBitmap = New-Object System.Drawing.Bitmap 1024, 500
$featureGraphics = New-Graphics $featureBitmap
$featureRect = [System.Drawing.Rectangle]::new(0, 0, 1024, 500)
$featureBackground = New-Object System.Drawing.Drawing2D.LinearGradientBrush($featureRect, $greenDark, $greenLight, 0)
$featureGraphics.FillRectangle($featureBackground, $featureRect)
$featureGraphics.FillEllipse((New-Object System.Drawing.SolidBrush($softCircle)), 805, -120, 360, 360)
$featureGraphics.FillEllipse((New-Object System.Drawing.SolidBrush($softCircle2)), -90, 320, 180, 180)

$featurePanel = New-RoundedPath -X 342 -Y 54 -Width 602 -Height 392 -Radius 30
$featureGraphics.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(42, 255, 255, 255))), $featurePanel)
$featureGraphics.DrawPath((New-Object System.Drawing.Pen($softPanelBorder, 1.5)), $featurePanel)

$iconPanelRect = [System.Drawing.Rectangle]::new(58, 86, 216, 216)
$iconPanelBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($iconPanelRect, [System.Drawing.Color]::FromArgb(255, 53, 171, 86), $greenMid, 45)
$iconPanel = New-RoundedPath -X 58 -Y 86 -Width 216 -Height 216 -Radius 34
$featureGraphics.FillPath($iconPanelBrush, $iconPanel)
Draw-BrandSymbol -Graphics $featureGraphics -OffsetX 3 -OffsetY 94 -Scale 0.27 -Color $white -StrokeMultiplier 1.12 -WheelMultiplier 1.22

$titleFont = New-Object System.Drawing.Font('Segoe UI', 34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subFont = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$sectionFont = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$itemFont = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$whiteBrush = New-Object System.Drawing.SolidBrush($white)
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(234, 255, 255, 255))
$dotBrush = New-Object System.Drawing.SolidBrush($accentDot)
$darkPillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(38, 13, 82, 43))
$pillBorderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(78, 255, 255, 255), 1)

$featureGraphics.DrawString('T-SUMA', $titleFont, $whiteBrush, 52, 345)
$featureGraphics.DrawString('POS movil para ventas, inventario y control en USD/VES', $subFont, $mutedBrush, 54, 392)
$featureGraphics.DrawString('Funciones principales', $sectionFont, $whiteBrush, 380, 88)

$items = @(
  'Punto de venta rapido',
  'Inventario y productos',
  'Clientes y ventas',
  'Reportes y metricas',
  'Tasa de cambio USD/VES',
  'Recibos y codigos QR'
)

for ($index = 0; $index -lt $items.Count; $index++) {
  $column = $index % 2
  $row = [math]::Floor($index / 2)
  $pillX = 376 + ($column * 280)
  $pillY = 140 + ($row * 90)
  $pillPath = New-RoundedPath -X $pillX -Y $pillY -Width 250 -Height 58 -Radius 18
  $featureGraphics.FillPath($darkPillBrush, $pillPath)
  $featureGraphics.DrawPath($pillBorderPen, $pillPath)
  $featureGraphics.FillEllipse($dotBrush, $pillX + 16, $pillY + 21, 16, 16)
  $featureGraphics.DrawString($items[$index], $itemFont, $whiteBrush, $pillX + 46, $pillY + 17)
  $pillPath.Dispose()
}

$featureGraphics.DrawString('Gestion comercial simple y moderna para tu negocio', $sectionFont, $whiteBrush, 385, 404)
$featureGraphics.Dispose()
$featureBitmap.Save((Join-Path $playstorePath 'feature-graphic-tsuma.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$featureBitmap.Dispose()
$featureBackground.Dispose()
$featurePanel.Dispose()
$iconPanelBrush.Dispose()
$iconPanel.Dispose()
$titleFont.Dispose()
$subFont.Dispose()
$sectionFont.Dispose()
$itemFont.Dispose()
$whiteBrush.Dispose()
$mutedBrush.Dispose()
$dotBrush.Dispose()
$darkPillBrush.Dispose()
$pillBorderPen.Dispose()

$splashBitmap = New-Object System.Drawing.Bitmap 1400, 1400
$splashGraphics = New-Graphics $splashBitmap
$splashGraphics.Clear([System.Drawing.Color]::Transparent)
$splashGlowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(78, 15, 90, 63))
$splashTextBrush = New-Object System.Drawing.SolidBrush($white)
$splashSubBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
$titleFontSplash = New-Object System.Drawing.Font('Segoe UI', 108, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subFontSplash = New-Object System.Drawing.Font('Segoe UI', 42, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$centerPanel = New-RoundedPath -X 360 -Y 120 -Width 680 -Height 680 -Radius 132
$splashGraphics.FillPath($splashGlowBrush, $centerPanel)
Draw-BrandSymbol -Graphics $splashGraphics -OffsetX 95 -OffsetY 88 -Scale 1.0 -Color $white -StrokeMultiplier 1.18 -WheelMultiplier 1.28
$splashFormat = New-Object System.Drawing.StringFormat
$splashFormat.Alignment = [System.Drawing.StringAlignment]::Center
$splashGraphics.DrawString('T-Suma', $titleFontSplash, $splashTextBrush, [System.Drawing.RectangleF]::new(110, 860, 1180, 140), $splashFormat)
$splashGraphics.DrawString('Punto de venta', $subFontSplash, $splashSubBrush, [System.Drawing.RectangleF]::new(110, 992, 1180, 74), $splashFormat)
$splashGraphics.Dispose()
$splashBitmap.Save((Join-Path $assetsPath 'splash.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$splashBitmap.Dispose()
$splashGlowBrush.Dispose()
$splashTextBrush.Dispose()
$splashSubBrush.Dispose()
$titleFontSplash.Dispose()
$subFontSplash.Dispose()
$splashFormat.Dispose()
$centerPanel.Dispose()

Write-Output 'Brand assets regenerated successfully.'
