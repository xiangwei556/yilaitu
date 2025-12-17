$uri = "http://localhost:8001/api/process-image"
$filePath = "./uploads/products/test.jpg"

# 创建Web客户端
$client = New-Object System.Net.WebClient

# 创建表单数据
$contentType = "multipart/form-data; boundary=---------------------------7d81b516112480"
$fileContent = [System.IO.File]::ReadAllBytes($filePath)
$fileName = [System.IO.Path]::GetFileName($filePath)

# 构建请求体
$body = @"
-----------------------------7d81b516112480
Content-Disposition: form-data; name="file"; filename="$fileName"
Content-Type: image/jpeg

"@

$bodyBytes = [System.Text.Encoding]::ASCII.GetBytes($body)
$endBoundary = [System.Text.Encoding]::ASCII.GetBytes("\r\n-----------------------------7d81b516112480\r\nContent-Disposition: form-data; name=\"width\"\r\n\r\n800\r\n-----------------------------7d81b516112480\r\nContent-Disposition: form-data; name=\"height\"\r\n\r\n600\r\n-----------------------------7d81b516112480\r\nContent-Disposition: form-data; name=\"background_type\"\r\n\r\nwhite\r\n-----------------------------7d81b516112480--\r\n")

# 合并所有字节
$memStream = New-Object System.IO.MemoryStream
$memStream.Write($bodyBytes, 0, $bodyBytes.Length)
$memStream.Write($fileContent, 0, $fileContent.Length)
$memStream.Write($endBoundary, 0, $endBoundary.Length)

# 设置请求头
$client.Headers.Add("Content-Type", $contentType)

# 发送请求并获取响应
try {
    $response = $client.UploadData($uri, "POST", $memStream.ToArray())
    $responseString = [System.Text.Encoding]::UTF8.GetString($response)
    Write-Output "API响应: $responseString"
} catch {
    Write-Output "API请求失败: $_"
} finally {
    $memStream.Dispose()
    $client.Dispose()
}