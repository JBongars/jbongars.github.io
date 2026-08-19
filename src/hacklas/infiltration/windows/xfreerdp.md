# xfreerdp

**Author:** Julien Bongars\
**Date:** 2025-12-29 23:36:56
**Path:**

---

X11 FreeRDP client for Windows Remote Desktop (3389/TCP).

## Installation

**Ubuntu/Debian**

```bash
sudo apt update
sudo apt install freerdp2-x11
```

**Red Hat/CentOS/Fedora**

```bash
# For Fedora
sudo dnf install freerdp

# For CentOS/RHEL
sudo yum install freerdp
```

**Arch Linux**

```bash
sudo pacman -S freerdp
```

## Basic syntax

```bash
xfreerdp [options] /v:hostname[:port]
```

## Connection parameters

**/v:** Specify server address. Example: `/v:192.168.1.100`
**/u:** Username for authentication. Example: `/u:administrator`
**/p:** Password for authentication. Example: `/p:mypassword`
**/d:** Domain name. Example: `/d:company.local`
**/port:** Custom RDP port. Example: `/port:3390`

## Display and resolution

**/w:** Screen width. Example: `/w:1920`
**/h:** Screen height. Example: `/h:1080`
**/f:** Full screen mode. Example: `/f`
**/bpp:** Color depth (bits per pixel). Example: `/bpp:32`
**/multimon:** Multi-monitor support. Example: `/multimon`

## Practical examples

### Basic connection

```bash
xfreerdp /v:192.168.1.100 /u:username
```

Expected output:

```txt
Password: [password prompt will appear]
[INFO][com.freerdp.core] - freerdp_connect:freerdp_set_last_error_ex resetting error state
[INFO][com.freerdp.core] - established connection to 192.168.1.100:3389
[Window opens showing remote desktop]
```

### Connection with full credentials

```bash
xfreerdp /v:server.company.com /u:john.doe /p:SecurePass123 /d:COMPANY
```

### Full screen connection

```bash
xfreerdp /v:192.168.1.100 /u:administrator /f
```

### Custom resolution connection

```bash
xfreerdp /v:192.168.1.100 /u:user /w:1440 /h:900 /bpp:24
```

## Advanced configuration

### Audio and multimedia

```bash
# Enable audio redirection
xfreerdp /v:192.168.1.100 /u:user /sound:sys:alsa

# Disable audio
xfreerdp /v:192.168.1.100 /u:user /audio-mode:0
```

### Drive and folder sharing

```bash
# Share home directory
xfreerdp /v:192.168.1.100 /u:user /drive:home,/home/username

# Share multiple directories
xfreerdp /v:192.168.1.100 /u:user /drive:docs,/home/user/Documents /drive:downloads,/home/user/Downloads
```

### Clipboard integration

```bash
# Enable clipboard sharing
xfreerdp /v:192.168.1.100 /u:user +clipboard
```

### Network optimization

```bash
# For slow connections
xfreerdp /v:192.168.1.100 /u:user /compression /network:modem

# For LAN connections
xfreerdp /v:192.168.1.100 /u:user /network:lan

# Custom bandwidth
xfreerdp /v:192.168.1.100 /u:user /network:auto
```

## Security and authentication

### Certificate handling

```bash
# Ignore certificate warnings (use with caution)
xfreerdp /v:192.168.1.100 /u:user /cert:ignore

# Accept certificate automatically
xfreerdp /v:192.168.1.100 /u:user /cert:tofu
```

### Network Level Authentication

```bash
# Enable NLA
xfreerdp /v:192.168.1.100 /u:user +auth-only

# Disable NLA
xfreerdp /v:192.168.1.100 /u:user -auth-only
```

## Multi-monitor

```bash
# Use all available monitors
xfreerdp /v:192.168.1.100 /u:user /multimon

# Specify monitor layout
xfreerdp /v:192.168.1.100 /u:user /monitors:0,1

# Single monitor from multi-monitor setup
xfreerdp /v:192.168.1.100 /u:user /monitor-id:1
```

## Performance

### Graphics and rendering

```bash
# Hardware acceleration
xfreerdp /v:192.168.1.100 /u:user +gfx-h264

# Software rendering for compatibility
xfreerdp /v:192.168.1.100 /u:user /gfx:RFX

# Disable desktop composition
xfreerdp /v:192.168.1.100 /u:user +toggle-fullscreen
```

### Connection quality

```bash
# High quality for fast networks
xfreerdp /v:192.168.1.100 /u:user /quality:high

# Low quality for slow connections
xfreerdp /v:192.168.1.100 /u:user /quality:low
```

## Keyboard and input

```bash
# Set keyboard layout
xfreerdp /v:192.168.1.100 /u:user /kbd:0x00000409  # US English

# Enable Unicode keyboard
xfreerdp /v:192.168.1.100 /u:user +unicode

# Grab keyboard focus
xfreerdp /v:192.168.1.100 /u:user /grab-keyboard
```

## Logging and debugging

```bash
# Enable verbose logging
xfreerdp /v:192.168.1.100 /u:user /log-level:DEBUG

# Log to file
xfreerdp /v:192.168.1.100 /u:user /log-level:INFO /log-filters:com.freerdp.core
```

## Scripts

### Automated connection script

```bash
#!/bin/bash
# rdp-connect.sh

SERVER="192.168.1.100"
USERNAME="administrator"
DOMAIN="COMPANY"

xfreerdp /v:$SERVER /u:$USERNAME /d:$DOMAIN \
         /w:1920 /h:1080 \
         +clipboard \
         /drive:shared,/home/$USER/shared \
         /sound:sys:alsa \
         /cert:tofu
```

### Multiple server management

```bash
#!/bin/bash
# multi-rdp.sh

case $1 in
    "server1")
        xfreerdp /v:server1.company.com /u:admin /d:COMPANY /f
        ;;
    "server2")
        xfreerdp /v:server2.company.com /u:admin /d:COMPANY /w:1440 /h:900
        ;;
    *)
        echo "Usage: $0 {server1|server2}"
        exit 1
        ;;
esac
```

## Troubleshooting

### Connection refused

```bash
# Test with telnet first
telnet 192.168.1.100 3389

# Try different port
xfreerdp /v:192.168.1.100 /port:3390 /u:user
```

### Authentication failures

```bash
# Disable NLA if having auth issues
xfreerdp /v:192.168.1.100 /u:user -auth-only

# Try older security protocols
xfreerdp /v:192.168.1.100 /u:user /sec:rdp
```

### Display issues

```bash
# Force software rendering
xfreerdp /v:192.168.1.100 /u:user /gfx:AVC444

# Disable desktop effects
xfreerdp /v:192.168.1.100 /u:user +fonts +aero
```

## Performance monitoring

```bash
# Show connection statistics
xfreerdp /v:192.168.1.100 /u:user /network:auto +heartbeat

# Enable performance counters
xfreerdp /v:192.168.1.100 /u:user +async-channels
```

## Integration

### Desktop shortcuts

```bash
# ~/.local/share/applications/rdp-server.desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=RDP Server Connection
Comment=Connect to Windows Server
Exec=xfreerdp /v:192.168.1.100 /u:administrator /f
Icon=preferences-desktop-remote-desktop
Terminal=false
Categories=Network;RemoteAccess;
```

### SSH tunneling

```bash
# Create SSH tunnel first
ssh -L 3389:windows-server:3389 user@gateway-server

# Then connect through tunnel
xfreerdp /v:localhost /u:administrator
```

## Version

```bash
xfreerdp --version
```

```txt
This is FreeRDP version 2.4.1 (git 2.4.1)
Built with CMake 3.18.4
Built with Compiler GCC 9.3.0
```

## Resources

- [FreeRDP](https://github.com/FreeRDP/FreeRDP) — `xfreerdp` source and docs
