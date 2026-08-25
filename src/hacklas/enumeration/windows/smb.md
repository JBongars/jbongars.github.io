# smb

**Author:** Julien Bongars\
**Date:** 2026-03-22 16:42:51
**Path:** `/home/julien/.hacklas/notes/enumeration/windows/smb.md`

---

# smb

**Author:** Julien Bongars\
**Date:** 2026-03-22 16:31:42
**Path:** `/home/julien/.hacklas/notes/enumeration/windows/smb.md`

---

## Using NXC to enumerate SMB

```bash
nxc smb DC01.tombwatcher.htb -u henry -p 'H3nry_987TGV! --shares'

# output
┌─[julien@parrot]─[~/.hacklas/targets/track-oscp/Tombwatcher]
└──╼ $ nxc smb DC01.tombwatcher.htb -u henry -p 'H3nry_987TGV!' --shares
SMB         10.129.232.167  445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:tombwatcher.htb) (signing:True) (SMBv1:False)
SMB         10.129.232.167  445    DC01             [+] tombwatcher.htb\henry:H3nry_987TGV!
SMB         10.129.232.167  445    DC01             [*] Enumerated shares
SMB         10.129.232.167  445    DC01             Share           Permissions     Remark
SMB         10.129.232.167  445    DC01             -----           -----------     ------
SMB         10.129.232.167  445    DC01             ADMIN$                          Remote Admin
SMB         10.129.232.167  445    DC01             C$                              Default share
SMB         10.129.232.167  445    DC01             IPC$            READ            Remote IPC
SMB         10.129.232.167  445    DC01             NETLOGON        READ            Logon server share
SMB         10.129.232.167  445    DC01             SYSVOL          READ            Logon server share
```
