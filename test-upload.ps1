# Script para testar upload de imagem
$imagePath = "$PSScriptRoot\test-image.png"
$apiUrl = "http://localhost:3000/api/upload"

# Criar uma imagem de teste minimalista se não existir
if (-not (Test-Path $imagePath)) {
    # Criar imagem PNG vermelha simples (100x100)
    Add-Type -AssemblyName System.Drawing
    $bitmap = New-Object System.Drawing.Bitmap(100, 100)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Red)
    $graphics.Dispose()
    $bitmap.Save($imagePath)
    $bitmap.Dispose()
    Write-Host "✓ Imagem de teste criada: $imagePath"
}

# Fazer upload
$fileBytes = [System.IO.File]::ReadAllBytes($imagePath)
$fileName = [System.IO.Path]::GetFileName($imagePath)

$boundary = [System.Guid]::NewGuid().ToString()
$fileBoundary = "--$boundary"
$bodyStart = ($fileBoundary + "`r`nContent-Disposition: form-data; name=`"image`"; filename=`"$fileName`"`r`nContent-Type: image/png`r`n`r`n")
$bodyEnd = "`r`n$fileBoundary--"

$bodyStartBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyStart)
$bodyEndBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyEnd)

$ms = New-Object System.IO.MemoryStream
$ms.Write($bodyStartBytes, 0, $bodyStartBytes.Length)
$ms.Write($fileBytes, 0, $fileBytes.Length)
$ms.Write($bodyEndBytes, 0, $bodyEndBytes.Length)
$ms.Position = 0

$response = Invoke-WebRequest -Uri $apiUrl `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Method POST `
    -InFile $imagePath `
    -Headers @{'Content-Type' = "multipart/form-data; boundary=$boundary"}

Write-Host "Upload Response:"
Write-Host $response.Content
