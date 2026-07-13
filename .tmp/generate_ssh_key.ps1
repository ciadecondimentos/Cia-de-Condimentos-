$keyPath = "$env:USERPROFILE\.ssh\id_ed25519_ciadecondimentos"
if (Test-Path $keyPath) { Write-Output 'KEY_EXISTS'; exit 0 }
ssh-keygen -q -t ed25519 -f $keyPath -N "" -C "ciadecondimentos@local"
Get-Content "$keyPath.pub" -Raw | Set-Clipboard
Start-Process "https://github.com/settings/ssh/new"
Write-Output 'KEY_DONE'
