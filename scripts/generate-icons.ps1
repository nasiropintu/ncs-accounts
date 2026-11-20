# Generates all application icons and splash screens using the vector Header Icon
# Removes the old #2F5D3A green background in favor of a clean, modern #FFFFFF background.
Add-Type -AssemblyName System.Drawing

$root = "C:\Users\User\Desktop\NCS WORK - STATION\ncs-accounts-main"

function Draw-HeaderIcon {
    param(
        [System.Drawing.Graphics]$g,
        [float]$TargetW,
        [float]$TargetH,
        [float]$ScaleRatio = 0.65
    )

    $boxSize = [Math]::Min($TargetW, $TargetH) * $ScaleRatio
    $scale = $boxSize / 36.0
    $offsetX = ($TargetW - $boxSize) / 2.0
    $offsetY = ($TargetH - $boxSize) / 2.0

    function X([float]$v) { return $offsetX + $v * $scale }
    function Y([float]$v) { return $offsetY + $v * $scale }
    function S([float]$v) { return $v * $scale }

    # Palette
    $colInk = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)       # #0F172A
    $colScreen = [System.Drawing.Color]::FromArgb(255, 238, 248, 245) # #EEF8F5
    $colCard = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)   # #FFFFFF
    $colMut = [System.Drawing.Color]::FromArgb(255, 100, 116, 139)    # #64748B
    $colAcc = [System.Drawing.Color]::FromArgb(255, 15, 118, 110)     # #0F766E
    $colPos = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)     # #10B981

    $penInkOuter = New-Object System.Drawing.Pen($colInk, (S 2.3))
    $penInkOuter.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penInkOuter.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penInkOuter.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $penInkCard = New-Object System.Drawing.Pen($colInk, (S 1.3))
    $penInkAvatar = New-Object System.Drawing.Pen($colInk, (S 1.2))
    $penInkAvatar.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penInkAvatar.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $penMut = New-Object System.Drawing.Pen($colMut, (S 1.0))
    $penMut.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penMut.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $brushScreen = New-Object System.Drawing.SolidBrush($colScreen)
    $brushCard = New-Object System.Drawing.SolidBrush($colCard)
    $brushAcc = New-Object System.Drawing.SolidBrush($colAcc)
    $brushPos = New-Object System.Drawing.SolidBrush($colPos)

    # 1. Screen interior
    $pathScreen = New-Object System.Drawing.Drawing2D.GraphicsPath
    $sRx = (S 1.5) * 2
    $pathScreen.AddArc((X 4.5), (Y 6.5), $sRx, $sRx, 180, 90)
    $pathScreen.AddArc((X (4.5 + 27 - 3)), (Y 6.5), $sRx, $sRx, 270, 90)
    $pathScreen.AddArc((X (4.5 + 27 - 3)), (Y (6.5 + 18 - 3)), $sRx, $sRx, 0, 90)
    $pathScreen.AddArc((X 4.5), (Y (6.5 + 18 - 3)), $sRx, $sRx, 90, 90)
    $pathScreen.CloseFigure()
    $g.FillPath($brushScreen, $pathScreen)

    # 2. Outer monitor frame
    $pathOuter = New-Object System.Drawing.Drawing2D.GraphicsPath
    $oRx = (S 3) * 2
    $pathOuter.AddArc((X 2.5), (Y 4.5), $oRx, $oRx, 180, 90)
    $pathOuter.AddArc((X (2.5 + 31 - 6)), (Y 4.5), $oRx, $oRx, 270, 90)
    $pathOuter.AddArc((X (2.5 + 31 - 6)), (Y (4.5 + 22 - 6)), $oRx, $oRx, 0, 90)
    $pathOuter.AddArc((X 2.5), (Y (4.5 + 22 - 6)), $oRx, $oRx, 90, 90)
    $pathOuter.CloseFigure()
    $g.DrawPath($penInkOuter, $pathOuter)

    # 3. Monitor stand neck
    $pathNeck = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathNeck.AddLine((X 16), (Y 26.5), (X 16), (Y 29.5))
    $pathNeck.AddLine((X 16), (Y 29.5), (X 20), (Y 29.5))
    $pathNeck.AddLine((X 20), (Y 29.5), (X 20), (Y 26.5))
    $g.DrawPath($penInkOuter, $pathNeck)

    # 4. Monitor stand base
    $g.DrawLine($penInkOuter, (X 11), (Y 29.5), (X 25), (Y 29.5))

    # 5. ID Card body
    $pathCard = New-Object System.Drawing.Drawing2D.GraphicsPath
    $cRx = (S 1) * 2
    $pathCard.AddArc((X 8.5), (Y 8.5), $cRx, $cRx, 180, 90)
    $pathCard.AddArc((X (8.5 + 11 - 2)), (Y 8.5), $cRx, $cRx, 270, 90)
    $pathCard.AddArc((X (8.5 + 11 - 2)), (Y (8.5 + 14 - 2)), $cRx, $cRx, 0, 90)
    $pathCard.AddArc((X 8.5), (Y (8.5 + 14 - 2)), $cRx, $cRx, 90, 90)
    $pathCard.CloseFigure()
    $g.FillPath($brushCard, $pathCard)
    $g.DrawPath($penInkCard, $pathCard)

    # 6. Avatar head
    $headR = S 1.8
    $g.DrawEllipse($penInkAvatar, (X (14 - 1.8)), (Y (12 - 1.8)), ($headR * 2), ($headR * 2))

    # 7. Avatar shoulders
    $pathShoulders = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathShoulders.AddBezier((X 11.5), (Y 16), (X 11.5), (Y 14.8), (X 12.6), (Y 14), (X 14), (Y 14))
    $pathShoulders.AddBezier((X 14), (Y 14), (X 15.4), (Y 14), (X 16.5), (Y 14.8), (X 16.5), (Y 16))
    $g.DrawPath($penInkAvatar, $pathShoulders)

    # 8. ID card lines
    $g.DrawLine($penMut, (X 10.5), (Y 18.5), (X 17.5), (Y 18.5))
    $g.DrawLine($penMut, (X 10.5), (Y 20.5), (X 15.5), (Y 20.5))

    # 9. Bar chart bar 1
    $pathBar1 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $b1Rx = (S 0.5) * 2
    $pathBar1.AddArc((X 22.5), (Y 17), $b1Rx, $b1Rx, 180, 90)
    $pathBar1.AddArc((X (22.5 + 2 - 1)), (Y 17), $b1Rx, $b1Rx, 270, 90)
    $pathBar1.AddArc((X (22.5 + 2 - 1)), (Y (17 + 5.5 - 1)), $b1Rx, $b1Rx, 0, 90)
    $pathBar1.AddArc((X 22.5), (Y (17 + 5.5 - 1)), $b1Rx, $b1Rx, 90, 90)
    $pathBar1.CloseFigure()
    $g.FillPath($brushAcc, $pathBar1)

    # 10. Bar chart bar 2
    $pathBar2 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $b2Rx = (S 0.5) * 2
    $pathBar2.AddArc((X 25.5), (Y 13), $b2Rx, $b2Rx, 180, 90)
    $pathBar2.AddArc((X (25.5 + 2 - 1)), (Y 13), $b2Rx, $b2Rx, 270, 90)
    $pathBar2.AddArc((X (25.5 + 2 - 1)), (Y (13 + 9.5 - 1)), $b2Rx, $b2Rx, 0, 90)
    $pathBar2.AddArc((X 25.5), (Y (13 + 9.5 - 1)), $b2Rx, $b2Rx, 90, 90)
    $pathBar2.CloseFigure()
    $g.FillPath($brushPos, $pathBar2)

    # Clean up
    $penInkOuter.Dispose(); $penInkCard.Dispose(); $penInkAvatar.Dispose(); $penMut.Dispose()
    $brushScreen.Dispose(); $brushCard.Dispose(); $brushAcc.Dispose(); $brushPos.Dispose()
}

function Save-Image {
    param(
        [int]$W,
        [int]$H,
        [string]$Path,
        [bool]$Transparent = $false,
        [float]$ScaleRatio = 0.68,
        [bool]$RoundMask = $false
    )

    $dir = Split-Path $Path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($Transparent) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        if ($RoundMask) {
            $g.Clear([System.Drawing.Color]::Transparent)
            $brushBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
            $g.FillEllipse($brushBg, 0, 0, $W, $H)
            $brushBg.Dispose()
        } else {
            $g.Clear([System.Drawing.Color]::White)
        }
    }

    Draw-HeaderIcon -g $g -TargetW $W -TargetH $H -ScaleRatio $ScaleRatio

    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $Path ($W x $H)"
}

Write-Host "=== Generating App Icons (White Clean Background) ==="

# 1. PWA & Windows Icons
Save-Image -W 512 -H 512 -Path "$root\icon-512.png" -ScaleRatio 0.70
Save-Image -W 192 -H 192 -Path "$root\icon-192.png" -ScaleRatio 0.70
Save-Image -W 512 -H 512 -Path "$root\build\icon.png" -ScaleRatio 0.70
Save-Image -W 512 -H 512 -Path "$root\www\icon-512.png" -ScaleRatio 0.70
Save-Image -W 192 -H 192 -Path "$root\www\icon-192.png" -ScaleRatio 0.70

# 2. Android Mipmap Icons
$mipmaps = @(
    @{ folder="mipmap-mdpi";   launcher=48;  fg=108 },
    @{ folder="mipmap-hdpi";   launcher=72;  fg=162 },
    @{ folder="mipmap-xhdpi";  launcher=96;  fg=216 },
    @{ folder="mipmap-xxhdpi"; launcher=144; fg=324 },
    @{ folder="mipmap-xxxhdpi";launcher=192; fg=432 }
)

foreach ($m in $mipmaps) {
    $folder = Join-Path "$root\native\android-res" $m.folder
    Save-Image -W $m.launcher -H $m.launcher -Path "$folder\ic_launcher.png" -ScaleRatio 0.72
    Save-Image -W $m.launcher -H $m.launcher -Path "$folder\ic_launcher_round.png" -RoundMask $true -ScaleRatio 0.65
    Save-Image -W $m.fg -H $m.fg -Path "$folder\ic_launcher_foreground.png" -Transparent $true -ScaleRatio 0.58
}

# 3. Android Splash Screens
$splashes = @(
    @{ folder="drawable";              w=480;  h=320; scale=0.38 },
    @{ folder="drawable-land-hdpi";     w=800;  h=480; scale=0.35 },
    @{ folder="drawable-land-mdpi";     w=480;  h=320; scale=0.35 },
    @{ folder="drawable-land-xhdpi";    w=1280; h=720; scale=0.30 },
    @{ folder="drawable-land-xxhdpi";   w=1600; h=960; scale=0.28 },
    @{ folder="drawable-land-xxxhdpi";  w=1920; h=1280; scale=0.25 },
    @{ folder="drawable-port-hdpi";     w=480;  h=800; scale=0.45 },
    @{ folder="drawable-port-mdpi";     w=320;  h=480; scale=0.45 },
    @{ folder="drawable-port-xhdpi";    w=720;  h=1280; scale=0.40 },
    @{ folder="drawable-port-xxhdpi";   w=960;  h=1600; scale=0.35 },
    @{ folder="drawable-port-xxxhdpi";  w=1280; h=1920; scale=0.32 }
)

foreach ($s in $splashes) {
    $out = Join-Path "$root\native\android-res\$($s.folder)" "splash.png"
    Save-Image -W $s.w -H $s.h -Path $out -ScaleRatio $s.scale
}

Write-Host "=== All App Icons & Splash Screens Generated Successfully! ==="
