# zip

Author: Julien Bongars
Date: 2025-09-21 09:29:02
Path: /opt/development/cybersec/hacklas/notes/infiltration/cracking/zip.md

---

## Extract Hash

```bash
zip2john protected_archive.zip > hash.txt
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
```
