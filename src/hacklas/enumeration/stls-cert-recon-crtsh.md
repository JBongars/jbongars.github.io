# stls-cert-recon-crtsh

**Author:** Julien Bongars\
**Date:** 2025-12-15 04:02:54
**Path:**

---

```bash
curl -s "https://crt.sh/?q=facebook.com&output=json" | jq -r '.[] | select(.name_value | contains("dev")) | .name_value' | sort -u
curl -s "https://crt.sh/?q=facebook.com&output=json" | jq -r '.[]' | sort -u
```

## Breakdown

curl -s — Fetches JSON output from crt.sh
jq -r '... | contains("dev")' — Filters for entries containing "dev"
sort -u — Sorts and removes duplicates
