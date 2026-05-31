$ErrorActionPreference = "Stop"

$port = 8000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = $context.Request.Url.AbsolutePath.TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    $requestPath = $requestPath -replace "/", "\"
    $fullPath = Join-Path $root $requestPath

    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $buffer = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
      $context.Response.Close()
      continue
    }

    switch ([System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()) {
      ".html" { $contentType = "text/html; charset=utf-8" }
      ".css"  { $contentType = "text/css; charset=utf-8" }
      ".js"   { $contentType = "application/javascript; charset=utf-8" }
      ".json" { $contentType = "application/json; charset=utf-8" }
      ".png"  { $contentType = "image/png" }
      ".jpg"  { $contentType = "image/jpeg" }
      ".jpeg" { $contentType = "image/jpeg" }
      ".gif"  { $contentType = "image/gif" }
      ".svg"  { $contentType = "image/svg+xml" }
      default { $contentType = "application/octet-stream" }
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
