# aes-file-cracking

**Author:** Julien Bongars\
**Date:** 2025-10-13 02:02:16
**Path:**

---

## Source Code

```py
import sys
import pyAesCrypt
import os

BUFFER_SIZE = 64 * 1024

def try_password(encfile, outfile, password):
    if os.path.exists(outfile):
        try:
            os.remove(outfile)
        except OSError:
            pass
    try:
        pyAesCrypt.decryptFile(encfile, outfile, password, BUFFER_SIZE)
        with open(outfile, "rb") as f:
            head = f.read(4)
        if head.startswith(b"PK"):
            return True
        return True
    except Exception:
        if os.path.exists(outfile):
            try:
                os.remove(outfile)
            except OSError:
                pass
        return False

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 pyaes_decrypt.py encrypted_file wordlist_or_dash output_file")
        sys.exit(2)

    encfile = sys.argv[1]
    wordlist = sys.argv[2]
    outfile = sys.argv[3]

    def candidates():
        if wordlist == "-":
            for line in sys.stdin:
                yield line.rstrip("\n\r")
        else:
            with open(wordlist, "r", errors="ignore") as f:
                for line in f:
                    yield line.rstrip("\n\r")

    count = 0
    for pwd in candidates():
        count += 1
        if count % 1000 == 0:
            print(f"[+] tried {count} candidates...", flush=True)
        if pwd == "":
            continue
        if try_password(encfile, outfile, pwd):
            print(f"\n[+] SUCCESS! Password found: {pwd!r}")
            print(f"[+] Output written to: {outfile}")
            return
    print("\n[-] Finished list; no password found.")

if __name__ == "__main__":
    main()
```

## Install

```bash
# save the above in own folder
pipx install pyAesCrypt
python <file> <.... args>
```
