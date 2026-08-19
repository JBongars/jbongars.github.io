# zip

**Author:** Julien Bongars\
**Date:** 2025-09-21 09:29:02
**Path:**

---

Password-protected zip: extract a John hash, then crack it.

## Extract hash

```bash
zip2john protected_archive.zip > hash.txt
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
```

## Resources

- [Openwall John](https://www.openwall.com/john/) — `zip2john` / `john`
- [cheat.sh/john](https://cheat.sh/john) — wordlist and format flags
