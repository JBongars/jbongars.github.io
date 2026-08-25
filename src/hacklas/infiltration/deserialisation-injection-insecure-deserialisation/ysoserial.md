# ysoserial

**Author:** Julien Bongars\
**Date:** 2026-02-16 21:32:36
**Path:**

---

ysoserial is a collection of gadget chains for Java libraries that, under the right conditions, exploit unsafe deserialization. The driver wraps a command in a chosen chain and serializes it to stdout.

The full gadget table and `--help` dump live in [java/ysoserial.md](./java/ysoserial.md).

Website (Chrome only): https://whysoserial.cc/

Talk notes: https://frohoff.github.io/appseccali-marshalling-pickles/

## Usage

```bash
java -jar ysoserial.jar [payload] '[command]'
```

## Install

```bash
git clone https://github.com/frohoff/ysoserial.git /opt/external/ysoserial
```

## Resources

- [frohoff/ysoserial](https://github.com/frohoff/ysoserial) — gadget chains
- [Why so serial?](https://whysoserial.cc/) — payload picker (Chrome)
- [Marshalling Pickles (AppSecCali)](https://frohoff.github.io/appseccali-marshalling-pickles/) — talk notes on Java deserialization
- [java/ysoserial.md](./java/ysoserial.md) — gadget table and help dump
