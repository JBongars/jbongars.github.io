# ffuf

**Author:** Julien Bongars\
**Date:** 2026-01-28 18:15:24
**Path:**

---

## Subdomain and directory discovery tool.

## More information: <https://github.com/ffuf/ffuf>.

### Burp to ffuf fuzz request

```bash
ffuf -request login.req -request-proto http ...
```

### Search hosts

```bash
# Using ffuf (fast, preferred)
ffuf -u http://target.htb -H "Host: FUZZ.target.htb" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 1234 -t 1000

# Using gobuster
gobuster vhost -u http://target.htb -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain
```

### Search subdirectory

```bash
# Using ffuf (fast, preferred)
ffuf -u http://target.htb/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -fc 404

# Using gobuster (classic)
gobuster dir -u http://target.htb -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -x php,html,txt

# Using feroxbuster (recursive, modern)
feroxbuster -u http://target.htb -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt
```

### FILTER ATTRIBUTE

```BASH
  -AC                 AUTOMATICALLY CALIBRATE FILTERING OPTIONS (DEFAULT: FALSE)
  -ACC                CUSTOM AUTO-CALIBRATION STRING. CAN BE USED MULTIPLE TIMES. IMPLIES -AC
  -ACH                PER HOST AUTOCALIBRATION (DEFAULT: FALSE)
  -ACK                AUTOCALIBRATION KEYWORD (DEFAULT: FUZZ)
  -ACS                CUSTOM AUTO-CALIBRATION STRATEGIES. CAN BE USED MULTIPLE TIMES. IMPLIES -AC

MATCHER OPTIONS:
  -MC                 MATCH HTTP STATUS CODES, OR "ALL" FOR EVERYTHING. (DEFAULT: 200-299,301,302,307,401,403,405,500)
  -ML                 MATCH AMOUNT OF LINES IN RESPONSE
  -MMODE              MATCHER SET OPERATOR. EITHER OF: AND, OR (DEFAULT: OR)
  -MR                 MATCH REGEXP
  -MS                 MATCH HTTP RESPONSE SIZE
  -MT                 MATCH HOW MANY MILLISECONDS TO THE FIRST RESPONSE BYTE, EITHER GREATER OR LESS THAN. EG: >100 OR <100
  -MW                 MATCH AMOUNT OF WORDS IN RESPONSE

FILTER OPTIONS:
  -FC                 FILTER HTTP STATUS CODES FROM RESPONSE. COMMA SEPARATED LIST OF CODES AND RANGES
  -FL                 FILTER BY AMOUNT OF LINES IN RESPONSE. COMMA SEPARATED LIST OF LINE COUNTS AND RANGES
  -FMODE              FILTER SET OPERATOR. EITHER OF: AND, OR (DEFAULT: OR)
  -FR                 FILTER REGEXP
  -FS                 FILTER HTTP RESPONSE SIZE. COMMA SEPARATED LIST OF SIZES AND RANGES
  -FT                 FILTER BY NUMBER OF MILLISECONDS TO THE FIRST RESPONSE BYTE, EITHER GREATER OR LESS THAN. EG: >100 OR <100
  -FW                 FILTER BY AMOUNT OF WORDS IN RESPONSE. COMMA SEPARATED LIST OF WORD COUNTS AND RANGES
```

### CHEAT.SH

```BASH
# DISCOVER DIRECTORIES USING A [W]ORDLIST ON A TARGET [U]RL WITH [C]OLORIZED AND [V]ERBOSE OUTPUT:
FFUF -W PATH/TO/WORDLIST -U HTTPS://TARGET/FUZZ -C -V

# FUZZ HOST-[H]EADERS WITH A HOST FILE ON A TARGET WEBSITE AND [M]ATCH HTTP 200 [C]ODE RESPONSES:
FFUF -W HOSTS.TXT -U HTTPS://EXAMPLE.ORG -H "HOST: FUZZ" -MC 200

# DISCOVER DIRECTORIES USING A [W]ORDLIST ON A TARGET WEBSITE WITH A MAX INDIVIDUAL JOB TIME OF 60 SECONDS AND RECURSION DISCOVERY DEPTH OF 2 LEVELS:
FFUF -W PATH/TO/WORDLIST -U HTTPS://TARGET/FUZZ -MAXTIME-JOB 60 -RECURSION -RECURSION-DEPTH 2

# FUZZ GET PARAMETER ON A TARGET WEBSITE AND [F]ILTER OUT MESSAGE [S]IZE RESPONSE OF 4242 BYTES:
FFUF -W PATH/TO/PARAM_NAMES.TXT -U HTTPS://TARGET/SCRIPT.PHP?FUZZ=TEST_VALUE -FS 4242

# FUZZ POST METHOD WITH POST [D]ATA OF PASSWORD ON A TARGET WEBSITE AND [F]ILTER OUT HTTP RESPONSE [C]ODE 401:
FFUF -W PATH/TO/POSTDATA.TXT -X POST -D "USERNAME=ADMIN\&PASSWORD=FUZZ" -U HTTPS://TARGET/LOGIN.PHP -FC 401

# DISCOVER SUBDOMAINS USING A SUBDOMAIN LIST ON A TARGET WEBSITE:
FFUF -W SUBDOMAINS.TXT -U HTTPS://WEBSITE.COM -H "HOST: FUZZ.WEBSITE.COM"
```
