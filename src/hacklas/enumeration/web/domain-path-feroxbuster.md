# domain-path-feroxbuster

**Author:** Julien Bongars\
**Date:** 2026-06-23 20:19:54
**Path:** `/home/julien/.hacklas/./notes/enumeration/web/domain-path-feroxbuster.md`

---

## TLDD

> feroxbuster
> Simple, fast, recursive content discovery tool written in Rust.
> Used to brute-force hidden paths on web servers and more.
> More information: <https://epi052.github.io/feroxbuster-docs/docs/>.

```bash
## Discover specific directories and files that match in the wordlist with extensions and 100 threads and a random user-agent:
feroxbuster --url "https://example.com" --wordlist path/to/file --threads 100 --extensions "php,txt" --random-agent

## Enumerate directories without recursion through a specific proxy:
feroxbuster --url "https://example.com" --wordlist path/to/file --no-recursion --proxy "http://127.0.0.1:8080"

## Find links in webpages:
feroxbuster --url "https://example.com" --extract-links

## Filter by a specific status code and a number of chars:
feroxbuster --url "https://example.com" --filter-status 301 --filter-size 4092
```

## Enumerate numbers

```bash
feroxbuster -u "http://192.168.197.23/index.php?u=page/FUZZ" \
  --wordlist <(seq 1 10000) \
  -t 50 \
  --filter-similar-to "http://192.168.197.23/index.php?u=page/2"
```
