# xfreerdp

**Author:** Julien Bongars\
**Date:** 2025-12-29 23:36:56
**Path:**

---

## What is xfreerdp?

xfreerdp is the X11-based client implementation of the FreeRDP project, which provides an open-source implementation of the Remote Desktop Protocol. It allows Linux users to connect to Windows desktops, Windows Server machines, and other systems that support RDP connections with full graphical interface support.

## Key Features of xfreerdp

- Multi-platform support: Works across various Linux distributions
- High-performance rendering: Optimized graphics and video streaming
- Audio redirection: Support for remote audio playback
- Drive mapping: Share local directories with remote sessions
- Clipboard integration: Copy-paste between local and remote systems
- Multi-monitor support: Span sessions across multiple displays

## Installation

Before using xfreerdp, you need to install it on your Linux system. The installation process varies by distribution:

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

## Basic Syntax

The basic syntax of the xfreerdp command follows this pattern:

```bash
xfreerdp [options] /v:hostname[:port]
```

Where:

- options: Various configuration parameters
- hostname: Target server IP address or domain name
- port: RDP port (default is 3389)

## Essential Command Options

### Connection Parameters

| Option | Description                 | Example          |
| ------ | --------------------------- | ---------------- |
| /v:    | Specify server address      | /v:192.168.1.100 |
| /u:    | Username for authentication | /u:administrator |
| /p:    | Password for authentication | /p:mypassword    |
| /d:    | Domain name                 | /d:company.local |
| /port: | Custom RDP port             | /port:3390       |

### Display and Resolution Options

| Option    | Description                  | Example   |
| --------- | ---------------------------- | --------- |
| /w:       | Screen width                 | /w:1920   |
| /h:       | Screen height                | /h:1080   |
| /f        | Full screen mode             | /f        |
| /bpp:     | Color depth (bits per pixel) | /bpp:32   |
| /multimon | Multi-monitor support        | /multimon |

## Practical Examples

### Basic Connection

The simplest way to connect to a remote Windows machine:

```bash
xfreerdp /v:192.168.1.100 /u:username
```

Expected Output:

```
Password: [password prompt will appear]
[INFO][com.freerdp.core] - freerdp_connect:freerdp_set_last_error_ex resetting error state
[INFO][com.freerdp.core] - established connection to 192.168.1.100:3389
[Window opens showing remote desktop]
```

### Connection with Full Credentials

Connect with username, password, and domain specified:

```bash
xfreerdp /v:server.company.com /u:john.doe /p:SecurePass123 /d:COMPANY
```

### Full Screen Connection

Establish a full-screen remote desktop session:

```bash
xfreerdp /v:192.168.1.100 /u:administrator /f
```

### Custom Resolution Connection

Connect with specific screen dimensions:

```bash
xfreerdp /v:192.168.1.100 /u:user /w:1440 /h:900 /bpp:24
```

## Advanced Configuration Options

### Audio and Multimedia

```bash
# Enable audio redirection
xfreerdp /v:192.168.1.100 /u:user /sound:sys:alsa

# Disable audio
xfreerdp /v:192.168.1.100 /u:user /audio-mode:0
```

### Drive and Folder Sharing

Share local directories with the remote session:

```bash
# Share home directory
xfreerdp /v:192.168.1.100 /u:user /drive:home,/home/username

# Share multiple directories
xfreerdp /v:192.168.1.100 /u:user /drive:docs,/home/user/Documents /drive:downloads,/home/user/Downloads
```

### Clipboard Integration

```bash
# Enable clipboard sharing
xfreerdp /v:192.168.1.100 /u:user +clipboard
```

### Network Optimization

```bash
# For slow connections
xfreerdp /v:192.168.1.100 /u:user /compression /network:modem

# For LAN connections
xfreerdp /v:192.168.1.100 /u:user /network:lan

# Custom bandwidth
xfreerdp /v:192.168.1.100 /u:user /network:auto
```

## Security and Authentication

### Certificate Handling

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

## Multi-Monitor Setup

For users with multiple monitors, xfreerdp provides excellent multi-monitor support:

```bash
# Use all available monitors
xfreerdp /v:192.168.1.100 /u:user /multimon

# Specify monitor layout
xfreerdp /v:192.168.1.100 /u:user /monitors:0,1

# Single monitor from multi-monitor setup
xfreerdp /v:192.168.1.100 /u:user /monitor-id:1
```

## Performance Optimization

### Graphics and Rendering

```bash
# Hardware acceleration
xfreerdp /v:192.168.1.100 /u:user +gfx-h264

# Software rendering for compatibility
xfreerdp /v:192.168.1.100 /u:user /gfx:RFX

# Disable desktop composition
xfreerdp /v:192.168.1.100 /u:user +toggle-fullscreen
```

### Connection Quality Settings

```bash
# High quality for fast networks
xfreerdp /v:192.168.1.100 /u:user /quality:high

# Low quality for slow connections
xfreerdp /v:192.168.1.100 /u:user /quality:low
```

## Keyboard and Input Options

```bash
# Set keyboard layout
xfreerdp /v:192.168.1.100 /u:user /kbd:0x00000409  # US English

# Enable Unicode keyboard
xfreerdp /v:192.168.1.100 /u:user +unicode

# Grab keyboard focus
xfreerdp /v:192.168.1.100 /u:user /grab-keyboard
```

## Logging and Debugging

When troubleshooting connection issues, logging can be invaluable:

```bash
# Enable verbose logging
xfreerdp /v:192.168.1.100 /u:user /log-level:DEBUG

# Log to file
xfreerdp /v:192.168.1.100 /u:user /log-level:INFO /log-filters:com.freerdp.core
```

## Common Use Cases and Scripts

### Automated Connection Script

Create a bash script for frequent connections:

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

### Multiple Server Management

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

## Troubleshooting Common Issues

### Connection Refused

If you encounter connection refused errors:

```bash
# Test with telnet first
telnet 192.168.1.100 3389

# Try different port
xfreerdp /v:192.168.1.100 /port:3390 /u:user
```

### Authentication Failures

```bash
# Disable NLA if having auth issues
xfreerdp /v:192.168.1.100 /u:user -auth-only

# Try older security protocols
xfreerdp /v:192.168.1.100 /u:user /sec:rdp
```

### Display Issues

```bash
# Force software rendering
xfreerdp /v:192.168.1.100 /u:user /gfx:AVC444

# Disable desktop effects
xfreerdp /v:192.168.1.100 /u:user +fonts +aero
```

## Performance Monitoring

Monitor your RDP session performance:

```bash
# Show connection statistics
xfreerdp /v:192.168.1.100 /u:user /network:auto +heartbeat

# Enable performance counters
xfreerdp /v:192.168.1.100 /u:user +async-channels
```

## Best Practices

### Security Recommendations

- Use strong passwords: Never use default or weak passwords
- Enable certificate verification: Always verify server certificates in production
- Use VPN: Connect through VPN for external RDP access
- Regular updates: Keep FreeRDP updated to latest version

### Performance Tips

- Match network conditions: Use appropriate quality settings for your connection
- Optimize resolution: Don't use higher resolution than necessary
- Disable unnecessary features: Turn off audio/drive sharing if not needed
- Use hardware acceleration: Enable when available for better performance

## Integration with System Tools

### Desktop Shortcuts

Create desktop entries for frequent connections:

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

### SSH Tunneling

Combine with SSH for secure connections:

```bash
# Create SSH tunnel first
ssh -L 3389:windows-server:3389 user@gateway-server

# Then connect through tunnel
xfreerdp /v:localhost /u:administrator
```

## Version Differences and Updates

Different versions of FreeRDP may have varying syntax. Check your version:

```bash
xfreerdp --version
```

Expected Output:

```
This is FreeRDP version 2.4.1 (git 2.4.1)
Built with CMake 3.18.4
Built with Compiler GCC 9.3.0
```
