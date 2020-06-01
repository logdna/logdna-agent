Set-PSDebug -Strict
$LogName = $args[0]
$curr = (Get-EventLog -LogName $LogName -Newest 1 2> $null).Index
if ([string]::IsNullOrEmpty($curr))
{
    $curr = -1
}
while ($true)
{
    start-sleep -Seconds 1
    $next = (Get-EventLog -LogName $LogName -Newest 1 2> $null).Index
    if ([string]::IsNullOrEmpty($next))
    {
        $next = -1
    }
    if ($next -gt $curr) {
        $data = Get-EventLog -LogName $LogName -Newest ($next - $curr + 1000) 2> $null | where {$_.Index -gt $curr}
        $curr = $data[-1].Index
        $data | ConvertTo-Json
    }
}
