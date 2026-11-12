param(
  [Parameter(Mandatory = $true)][ValidateRange(0, 100)][int]$Weight,
  [string]$RouterUrl = "https://objetiva-routeratsha256.onrender.com"
)

if (-not $env:ROUTER_ADMIN_TOKEN) {
  throw "Define la variable de entorno ROUTER_ADMIN_TOKEN antes de ejecutar este script."
}

$body = @{ canaryWeight = $Weight } | ConvertTo-Json -Compress
$r = Invoke-RestMethod -Method Post -Uri "$RouterUrl/admin/weight" `
  -Headers @{ "x-admin-token" = $env:ROUTER_ADMIN_TOKEN } `
  -ContentType "application/json" -Body $body

"canaryWeight actual: $($r.canaryWeight)%"