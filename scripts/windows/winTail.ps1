Set-PSDebug -Strict
function WinEventTail($LogName) {
    $curr = (Get-WinEvent -log $LogName -max 1).RecordId
    while ($true)
    {
        start-sleep -Seconds 1
        $next = (Get-WinEvent -log $LogName -max 1).RecordId
        if ($next -gt $curr) {
            $data = Get-WinEvent -log $LogName -max ($next - $curr + 1000) | where {$_.RecordId -gt $curr}
            $data
            $curr = $data[-1].RecordId
        }
    }
}
