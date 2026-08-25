# convert-to-interactive-shell

Author: Julien Bongars
Date: 2025-09-20 19:46:51
Path: /opt/development/cybersec/hacklas/notes/convenience/reverse-shell/convert-to-interactive-shell.md

---

### Check current window rows ond cols

```bash
stty size
```

### Make fully interactive

**Method 1**

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'
CTRL-Z
stty raw -echo; fg

# set the target
export TERM=xterm
stty rows $(tput lines) cols $(tput cols)
```

**Method 2**

```bash
# Step 1: Spawn PTY
python3 -c 'import pty; pty.spawn("/bin/bash")'

# Step 2: Background shell
# Press: Ctrl+Z

# Step 3: In your local terminal
stty raw -echo; fg

# Step 4: Back in reverse shell
export TERM=xterm
export SHELL=/bin/bash
stty rows 60 columns 271
```

## Troubleshooting

```bash
www-data@dog:/var/www/html/modules/rvz722c62$ python3 -c 'import pty;pty.spawn("/bin/bash")'
<c62$ python3 -c 'import pty;pty.spawn("/bin/bash")'
shell-init: error retrieving current directory: getcwd: cannot access parent directories: No such file or directory
www-data@dog:/var/www/html/modules/rvz722c62$ cd /tmp
cd /tmp
```

problem: the directory you are in no longer exists
solution: cd /tmp
