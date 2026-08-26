---
note_tags:
  - osint
  - reference
  - cheatsheet
  - reverse-shell
  - cracking
---
# Useful Links

**Author:** Julien Bongars\
**Date:** 2026-03-07 16:24:27
**Path:**

---

Stages:-

- [A]ll
- [O]SINT
- [E]numeration
- [I]nfiltration/Foothold
- [E]scalation
- [P]ivot

## Websites

| URI            | Stage | Type          | Desciption                                                         | Remarks                                            |
| -------------- | ----- | ------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| revshells.com  | E/I   | reverse-shell | copy reverse shells for various tools/formats                      |                                                    |
| [CyberChef](./general/cyberchef.md) | E/I   | payload       | encode/decode/transformation on payloads                           | https://gchq.github.io/CyberChef/                  |
| hashes.com     | E/I/P | cracking      | crack passwords using rainbow tables. More low stakes than hashcat | Assume not crackable if this doesn't work for OSCP |
| crackstation   | E/I/P | cracking      | crack passwords using rainbow tables                               | Less accurate than hashes.com                      |
| hacktricks.com | A     | handbook      | handboox for vulnerabilities                                       |                                                    |
| exploitdb      | I/P   | exploit       | Database of CVEs and exploits, gives you the code directly         | better to try seearchploit first                   |
| ippsec.rocks   | A     | handbook      | tldr of cyber security topics. link to videos                      |                                                    |

## External Tools

| Name      | Stage | Type    | URI | Installation | Description       | Remarks |
| --------- | ----- | ------- | --- | ------------ | ----------------- | ------- |
| msfvenom  | I/P   | payload | -   | included     | payload generator | -       |
| autorecon | E     | scanner | -   |              |                   |         |

## Resources

- [revshells.com](https://www.revshells.com) — reverse-shell generator from the table
- [CyberChef](./general/cyberchef.md) — payload transforms
- [CyberChef app](https://gchq.github.io/CyberChef/) — hosted workbench
- [hashes.com](https://hashes.com) — rainbow tables
- [CrackStation](https://crackstation.net/) — rainbow tables
- [HackTricks](https://book.hacktricks.wiki/) — handbook
- [Exploit-DB](https://www.exploit-db.com/) — CVE/exploit DB
- [ippsec.rocks](https://ippsec.rocks/) — video index
- [Tib3rius/AutoRecon](https://github.com/Tib3rius/AutoRecon) — scanner named in the tools table
