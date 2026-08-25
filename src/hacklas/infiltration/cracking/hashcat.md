# hashcat

**Author:** Julien Bongars\
**Date:** 2025-11-05 14:29:11
**Path:**

---

## Hashcat Quick Start

```bash
echo "hash" > hash.txt

# identify hash code
hashcat --identify users.txt  --username

HASH_CODE=""

# For HTB just keep it simple?

hashcat -m 10 users.txt --username /usr/share/wordlists/rockyou.txt

# Wordlists

TOP10000="/usr/share/wordlists/seclists/Passwords/Common-Credentials/xato-net-10-million-passwords-10000.txt"
TOP100000="/usr/share/wordlists/seclists/Passwords/Common-Credentials/xato-net-10-million-passwords-100000.txt"
TOP1000000="/usr/share/wordlists/seclists/Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt"
ROCKYOU_WL="/usr/share/wordlists/rockyou.txt"

# Rules

RULE_1=/usr/share/hashcat/rules/best64.rule
RULE_2=/usr/share/hashcat/rules/rockyou-30000.rule
RULE_3=/usr/share/hashcat/rules/dive.rule

# quick scan
hashcat -m 10 hashes.txt /usr/share/wordlists/seclists/Passwords/Common-Credentials/xato-net-10-million-passwords-10000.txt -r /usr/share/hashcat/rules/best64.rule

# trying to get lucky
hashcat -m 10 hashes.txt /usr/share/wordlists/seclists/Passwords/Common-Credentials/xato-net-10-million-passwords-100000.txt -r /usr/share/hashcat/rules/rockyou-30000.rule

# rockyou.txt more thorough
hashcat -m 10 hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/rockyou-30000.rule

# give up
hashcat -m 10 hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/dive.rule
```

## Identify the hash and scan

```bash
hashid 'YOUR_HASH_HERE'

hashcat --identify 'YOUR_HASH_HERE'

hashcat -hh | grep 'HASH_TYPE_HERE'

# on a machine with GPU
hashcat -m <HASH-CODE> hash.txt /usr/share/wordlists/rockyou.txt
```

## NVIDIA GPU

Default OpenCL on a laptop is often the Intel iGPU — slow. Force the NVIDIA device and raise the workload:

```bash
hashcat -I                          # list backends / devices (look for CUDA / NVIDIA)
hashcat -d 1 …                      # first GPU in that list (check -I)
hashcat -D 2 …                      # GPU only (skip CPU)
hashcat -O -w 3 …                   # optimized kernel + high workload
hashcat -O -w 4 …                   # "nightmare" workload if the card stays cool
hashcat --backend-ignore-opencl …  # prefer CUDA on NVIDIA (hashcat 6+)
```

Example:

```bash
hashcat -m 10 -O -w 3 -D 2 hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
```

`-O` caps max password length (fine for rockyou). Drop it if you need long candidates.

## Popular Rules (Start Here)

| Rule                 | Size          | Description                                    |
| -------------------- | ------------- | ---------------------------------------------- |
| `best64.rule`        | 64 rules      | Best balance of speed and coverage. Use first. |
| `rockyou-30000.rule` | 30,000 rules  | Comprehensive. Much slower but thorough.       |
| `d3ad0ne.rule`       | ~35,000 rules | Large ruleset, good coverage.                  |
| `dive.rule`          | ~99,000 rules | Very large, deep mutations.                    |

## Cheat.sh

```bash
# hashcat
# Fast and advanced password recovery tool.
# More information: <https://hashcat.net/wiki/doku.php?id=hashcat>.

# Perform a brute-force attack (mode 3) with the default hashcat mask:
hashcat --hash-type hash_type_id --attack-mode 3 hash_value

# Perform a brute-force attack (mode 3) with a known pattern of 4 digits:
hashcat --hash-type hash_type_id --attack-mode 3 hash_value "?d?d?d?d"

# Perform a brute-force attack (mode 3) using at most 8 of all printable ASCII characters:
hashcat --hash-type hash_type_id --attack-mode 3 --increment hash_value "?a?a?a?a?a?a?a?a"

# Perform a dictionary attack (mode 0) using the RockYou wordlist of a Kali Linux box:
hashcat --hash-type hash_type_id --attack-mode 0 hash_value /usr/share/wordlists/rockyou.txt

# Perform a rule-based dictionary attack (mode 0) using the RockYou wordlist mutated with common password variations:
hashcat --hash-type hash_type_id --attack-mode 0 --rules-file /usr/share/hashcat/rules/best64.rule hash_value /usr/share/wordlists/rockyou.txt

# Perform a combination attack (mode 1) using the concatenation of words from two different custom dictionaries:
hashcat --hash-type hash_type_id --attack-mode 1 hash_value /path/to/dictionary1.txt /path/to/dictionary2.txt

# Show result of an already cracked hash:
hashcat --show hash_value
```

## Resources

- [hashcat](https://hashcat.net/) — official site
- [hashcat wiki](https://hashcat.net/wiki/doku.php?id=hashcat) — cited in the cheat.sh dump
- [hashcat backends](https://hashcat.net/wiki/doku.php?id=frequently_asked_questions) — CUDA vs OpenCL / `-I`
