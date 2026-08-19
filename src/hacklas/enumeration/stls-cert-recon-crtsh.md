# stls-cert-recon-crtsh

**Author:** Julien Bongars\
**Date:** 2025-12-15 04:02:54
**Path:**

---

Pull names from Certificate Transparency via crt.sh JSON.

```bash
curl -s "https://crt.sh/?q=facebook.com&output=json" | jq -r '.[] | select(.name_value | contains("dev")) | .name_value' | sort -u
curl -s "https://crt.sh/?q=facebook.com&output=json" | jq -r '.[]' | sort -u
```

**curl -s** — JSON from crt.sh.
**jq `contains("dev")`** — names with `dev`.
**sort -u** — unique.

## Resources

- [crt.sh](https://crt.sh/) — CT search
- [crt.sh JSON](https://github.com/crtsh/certwatch_db) — schema behind `output=json`
