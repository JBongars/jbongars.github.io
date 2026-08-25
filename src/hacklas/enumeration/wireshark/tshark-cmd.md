# tshark-cmd

**Author:** Julien Bongars\
**Date:** 2025-10-14 17:36:15
**Path:**

---

## Basic Capture

**Capture on interface:**

```bash
sudo tshark -i tun0 -w capture.pcap
```

**Capture with display filter:**

```bash
sudo tshark -i tun0 -w capture.pcap -f "host 192.168.1.100 and port 443"
```

**Capture specific protocol:**

```bash
sudo tshark -i tun0 -f "tcp port 80"
sudo tshark -i tun0 -f "udp port 53"
```

**Capture between two hosts:**

```bash
sudo tshark -i tun0 -f "host 10.10.14.5 and host 10.129.1.100"
```

## Reading and Analyzing Captures

**Read pcap file:**

```bash
tshark -r capture.pcap
```

**Count packets by protocol:**

```bash
tshark -r capture.pcap -q -z io,phs
```

**Open in WireShark**

```bash
wireshark mssql.pcap
```

## Extracting Data

**Extract HTTP objects:**

```bash
tshark -r capture.pcap --export-objects http,./http-objects/
```

**Extract specific fields:**

```bash
tshark -r capture.pcap -Y "http.request" -T fields -e http.host -e http.request.uri
tshark -r capture.pcap -Y "dns" -T fields -e dns.qry.name
```

**Extract TLS certificates:**

```bash
tshark -r capture.pcap -Y "tls.handshake.certificate" -T fields -e tls.handshake.certificate > cert.hex
xxd -r -p cert.hex > cert.der
openssl x509 -inform DER -in cert.der -text -noout
```

**Extract passwords (cleartext protocols):**

```bash
tshark -r capture.pcap -Y "ftp" -T fields -e ftp.request.arg
tshark -r capture.pcap -Y "http" -T fields -e http.authorization
```

## Advanced Usage

**Export to JSON:**

```bash
tshark -r capture.pcap -T json > capture.json
```

## Useful Options

| Option | Description                        |
| ------ | ---------------------------------- |
| `-i`   | Interface to capture on            |
| `-r`   | Read from pcap file                |
| `-w`   | Write to pcap file                 |
| `-f`   | Capture filter (BPF syntax)        |
| `-Y`   | Display filter (Wireshark syntax)  |
| `-T`   | Output format (fields, json, text) |
| `-e`   | Field to display with `-T fields`  |
| `-q`   | Quiet mode (for statistics)        |
| `-z`   | Statistics option                  |
| `-d`   | Decode as specific protocol        |
| `-c`   | Capture only N packets             |

---

## Quick Tips

- Use `-f` for **capture** filters (BPF syntax, faster, set before capture)
- Use `-Y` for **display** filters (Wireshark syntax, applied after capture)
- Combine filters: `tshark -r file.pcap -Y "http and ip.addr == 10.10.10.1"`
- Use `-V` for verbose packet details
- Use `-x` to show hex dump
- Chain with grep: `tshark -r file.pcap -Y "http" | grep "User-Agent"`
