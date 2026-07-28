param(
    [string]$ProviderName,
    [string]$BaseUrl,
    [string]$FastModel,
    [string]$SmartModel,
    [string]$JsonMode
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $projectRoot ".env"

function Read-WithDefault {
    param([string]$Prompt, [string]$DefaultValue)
    $value = Read-Host "$Prompt [$DefaultValue]"
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultValue
    }
    return $value.Trim()
}

Write-Host ""
Write-Host "AlgoShell AI Provider configuration" -ForegroundColor Green
Write-Host "The key will be stored only in the local .env file, which is ignored by Git."
Write-Host "Compatible with services that implement the OpenAI Chat Completions API."
Write-Host ""

$ProviderName = if ([string]::IsNullOrWhiteSpace($ProviderName)) { Read-WithDefault "Provider name" "DeepSeek" } else { $ProviderName.Trim() }
$BaseUrl = if ([string]::IsNullOrWhiteSpace($BaseUrl)) { Read-WithDefault "API base URL" "https://api.deepseek.com" } else { $BaseUrl.Trim() }
$FastModel = if ([string]::IsNullOrWhiteSpace($FastModel)) { Read-WithDefault "Fast model" "deepseek-chat" } else { $FastModel.Trim() }
$SmartModel = if ([string]::IsNullOrWhiteSpace($SmartModel)) { Read-WithDefault "Smart model" "deepseek-reasoner" } else { $SmartModel.Trim() }
$JsonMode = if ([string]::IsNullOrWhiteSpace($JsonMode)) { Read-WithDefault "Enable JSON response_format? (true/false)" "true" } else { $JsonMode.Trim() }

$parsedUri = $null
if (-not [Uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$parsedUri) -or
    ($parsedUri.Scheme -ne "https" -and -not ($parsedUri.Scheme -eq "http" -and $parsedUri.IsLoopback))) {
    throw "Base URL must use HTTPS, or HTTP for a loopback/local service."
}
if ($JsonMode -notmatch "^(?i:true|false|1|0|yes|no)$") {
    throw "JSON mode must be true or false."
}

$secureKey = Read-Host "Paste the API Key" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    if ([string]::IsNullOrWhiteSpace($plainKey) -or $plainKey.Contains("`r") -or $plainKey.Contains("`n")) {
        throw "The API key is empty or invalid."
    }

    @(
        "AI_PROVIDER=$ProviderName"
        "AI_API_KEY=$plainKey"
        "AI_BASE_URL=$BaseUrl"
        "AI_FAST_MODEL=$FastModel"
        "AI_SMART_MODEL=$SmartModel"
        "AI_JSON_MODE=$JsonMode"
        "AI_TIMEOUT_MS=40000"
        "PORT=3317"
    ) | Set-Content -LiteralPath $envPath -Encoding UTF8

    Write-Host ""
    Write-Host "$ProviderName configuration saved. Close AlgoShell and run start.bat again." -ForegroundColor Green
}
finally {
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }
    $plainKey = $null
    $secureKey = $null
}
