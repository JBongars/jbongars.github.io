# dns-dnsenum

**Author:** Julien Bongars\
**Date:** 2026-03-22 16:25:21
**Path:**

---

DNS records, AXFR, and subdomain brute-force (`dig`, gobuster, dnsenum).

## Manual dig commands

```bash
# Zone transfer attempt (often blocked but worth trying):
dig axfr tombwatcher.htb @DC01.tombwatcher.htb

# Various record types
dig any tombwatcher.htb @DC01.tombwatcher.htb
dig A tombwatcher.htb @DC01.tombwatcher.htb
dig MX tombwatcher.htb @DC01.tombwatcher.htb
dig NS tombwatcher.htb @DC01.tombwatcher.htb

# Reverse IP lookup
dig -x <DC_IP> @DC01.tombwatcher.htb
```

## Gobuster

Checks for subdomains in the DNS register. Useful for multi-node setups

```bash
gobuster dns -d tombwatcher.htb -r DC01.tombwatcher.htb -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
```

## dnsenum

```bash
dnsenum --dnsserver DC01.tombwatcher.htb --enum tombwatcher.htb
```

Perl DNS recon: records, AXFR, wordlist brute-force.

### Example Command

```bash
dnsenum --dnsserver DC01.somednssserver.htb --enum inlanefreight.com -f /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -r
```

**`--enum`** — Shortcut enabling enumeration options

**`-f <wordlist>`** — Path to subdomain wordlist

**`-r`** — Enable recursive brute-forcing (enumerate subdomains of subdomains)

### Sample Output

```txt
inlanefreight.com.         300  IN  A  134.209.24.248
www.inlanefreight.com.     300  IN  A  134.209.24.248
support.inlanefreight.com. 300  IN  A  134.209.24.248
```

### Help text

```txt
dnsenum VERSION:1.3.1
Usage: dnsenum [Options] <domain>
[Options]:
Note: If no -f tag supplied will default to /usr/share/dnsenum/dns.txt or
the dns.txt file in the same directory as dnsenum
GENERAL OPTIONS:
  --dnsserver 	<server>
			Use this DNS server for A, NS and MX queries.
  --enum		Shortcut option equivalent to --threads 5 -s 15 -w.
  -h, --help		Print this help message.
  --noreverse		Skip the reverse lookup operations.
  --nocolor		Disable ANSIColor output.
  --private		Show and save private ips at the end of the file domain_ips.txt.
  --subfile <file>	Write all valid subdomains to this file.
  -t, --timeout <value>	The tcp and udp timeout values in seconds (default: 10s).
  --threads <value>	The number of threads that will perform different queries.
  -v, --verbose		Be verbose: show all the progress and all the error messages.
GOOGLE SCRAPING OPTIONS:
  -p, --pages <value>	The number of google search pages to process when scraping names,
			the default is 5 pages, the -s switch must be specified.
  -s, --scrap <value>	The maximum number of subdomains that will be scraped from Google (default 15).
BRUTE FORCE OPTIONS:
  -f, --file <file>	Read subdomains from this file to perform brute force. (Takes priority over default dns.txt)
  -u, --update	<a|g|r|z>
			Update the file specified with the -f switch with valid subdomains.
	a (all)		Update using all results.
	g		Update using only google scraping results.
	r		Update using only reverse lookup results.
	z		Update using only zonetransfer results.
  -r, --recursion	Recursion on subdomains, brute force all discovered subdomains that have an NS record.
WHOIS NETRANGE OPTIONS:
  -d, --delay <value>	The maximum value of seconds to wait between whois queries, the value is defined randomly, default: 3s.
  -w, --whois		Perform the whois queries on c class network ranges.
			 **Warning**: this can generate very large netranges and it will take lot of time to perform reverse lookups.
REVERSE LOOKUP OPTIONS:
  -e, --exclude	<regexp>
			Exclude PTR records that match the regexp expression from reverse lookup results, useful on invalid hostnames.
OUTPUT OPTIONS:
  -o --output <file>	Output in XML format. Can be imported in MagicTree (www.gremwell.com)
```

## Alternative Tools

**dnsenum** — DNS enumeration with dictionary/brute-force support

**fierce** — Recursive discovery with wildcard detection

**dnsrecon** — Multiple techniques and custom output formats

**amass** — Integrates with many data sources

**assetfinder** — Lightweight subdomain finder

**puredns** — Brute-forcing with filtering

## Resources

- [dnsenum (Kali)](https://www.kali.org/tools/dnsenum/) — package and flag list
- [dig(1)](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility) — record queries and AXFR
