$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$uploadFile = Join-Path $repoRoot 'src\views\biz\components\BizFileUpload.vue'
$apiFile = Join-Path $repoRoot 'src\service\api\biz\file.ts'

$uploadSource = Get-Content -LiteralPath $uploadFile -Raw -Encoding UTF8
$apiSource = Get-Content -LiteralPath $apiFile -Raw -Encoding UTF8

function Assert-Contains {
  param(
    [string] $Source,
    [string] $Needle,
    [string] $Message
  )

  if (-not $Source.Contains($Needle)) {
    throw $Message
  }
}

Assert-Contains $uploadSource 'const QINIU_COMPLETE_TIMEOUT = QINIU_COMPLETE_REQUEST_TIMEOUT;' 'Qiniu upload component must use the shared 10 minute complete timeout.'
Assert-Contains $uploadSource 'const QINIU_RESUMABLE_CHUNK_SIZE_MB = 4;' 'Qiniu resumable chunk size must stay explicit.'
Assert-Contains $uploadSource 'const QINIU_CONCURRENT_REQUEST_LIMIT = 4;' 'Qiniu resumable upload must use explicit concurrent multipart requests.'
Assert-Contains $uploadSource 'const QINIU_UPLOAD_STALL_TIMEOUT_MS = 30 * 1000;' 'Qiniu upload component must define a 30 second no-progress watchdog.'
Assert-Contains $uploadSource 'function shouldUseDirectQiniuUpload(rawFile: File)' 'Qiniu upload mode must be selected by browser and file type.'
Assert-Contains $uploadSource 'if (isMicrosoftEdgeBrowser()) {' 'Qiniu upload mode must handle Microsoft Edge separately.'
Assert-Contains $uploadSource 'forceDirect: shouldUseDirectQiniuUpload(rawFile),' 'Images should use direct upload except Microsoft Edge; model/video/zip files keep SDK default resumable behavior.'
Assert-Contains $uploadSource 'checkByServer: false,' 'Every browser must disable Qiniu pre-upload server check to avoid preparation-stage stalls.'
if ($uploadSource.Contains('checkByServer: !isMicrosoftEdgeBrowser(),')) {
  throw 'Qiniu pre-upload server check disabling must not be limited to Microsoft Edge.'
}
Assert-Contains $uploadSource 'function isMicrosoftEdgeBrowser()' 'Qiniu upload component must detect Microsoft Edge for upload host compatibility.'
Assert-Contains $uploadSource "return 'up-z2.qiniup.com';" 'All browsers must use the z2 source upload host when backend returns upload-z2.qiniup.com.'
Assert-Contains $uploadSource 'if (host === ''upload-z2.qiniup.com'')' 'All browsers must override upload-z2.qiniup.com when backend returns upload-z2.qiniup.com.'
if ($uploadSource.Contains("if (isMicrosoftEdgeBrowser() && host === 'upload-z2.qiniup.com')")) {
  throw 'upload-z2.qiniup.com override must not be limited to Microsoft Edge.'
}
Assert-Contains $uploadSource 'function createUploadSpeedTracker()' 'Upload component must calculate upload speed.'
Assert-Contains $uploadSource 'const speedText = trackUploadSpeed(Number(total.loaded || 0));' 'Qiniu progress callback must calculate current upload speed from loaded bytes.'
Assert-Contains $uploadSource 'subscription?.unsubscribe?.();' 'Qiniu upload component must cancel stalled uploads.'
Assert-Contains $uploadSource 'createQiniuUploadStallError()' 'Qiniu upload component must use a clear timeout retry error.'
Assert-Contains $uploadSource 'percent.toFixed(0)' 'Upload component must show upload percent text.'
Assert-Contains $uploadSource 'speedText ?' 'Upload component must append upload speed text.'
Assert-Contains $uploadSource 'const completeRes = await completeQiniuUpload' 'Upload component must call qiniu complete after upload finishes.'
Assert-Contains $uploadSource 'resetUploadStatus();' 'Upload component must clear success status after upload completes.'
Assert-Contains $apiSource 'export const QINIU_COMPLETE_REQUEST_TIMEOUT = 600 * 1000;' 'Qiniu complete API timeout must be exported and fixed at 10 minutes.'

Write-Host 'qiniu upload static tests passed'
