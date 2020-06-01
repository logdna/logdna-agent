$packageParameters = $env:chocolateyPackageParameters

IF(!($packageParameters))
{
    cmd.exe /c "nssm.exe stop logdna-agent & exit /b 0"
    cmd.exe /c "nssm.exe remove logdna-agent confirm & exit /b 0"
}

$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\logdna-agent"

IF(Test-Path $registryPath)
{
    Remove-Item -Path $registryPath -Force -Recurse
}
