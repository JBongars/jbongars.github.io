# php-magic-functions

**Author:** Julien Bongars\
**Date:** 2026-02-12 14:11:10
**Path:**

Link: https://www.php.net/manual/en/language.oop5.magic.php

All magic methods must be declared as `public`. PHP reserves all function names starting with `__` as magical.

---

## Lifecycle

### `__construct(mixed ...$args): void`

Called when an object is instantiated with `new`.

### `__destruct(): void`

Called when an object is destroyed (garbage collected, script ends, `unset()`).

### `__clone(): void`

Called after an object is duplicated via the `clone` keyword. Useful for deep copying internal objects.

---

## Serialization

### `__sleep(): array`

Called by `serialize()`. Must return an array of property names to be serialized. Used for cleanup before serialization (e.g. closing DB connections).

### `__wakeup(): void`

Called by `unserialize()`. Used to re-establish resources (e.g. reconnect to a database). **Primary deserialization entry point for exploitation.**

### `__serialize(): array`

Called by `serialize()` (PHP 7.4+). Returns an associative array representing the serialized form. If both `__serialize()` and `__sleep()` exist, only `__serialize()` is called.

### `__unserialize(array $data): void`

Called by `unserialize()` (PHP 7.4+). Receives the array from `__serialize()`. If both `__unserialize()` and `__wakeup()` exist, only `__unserialize()` is called.

---

## Property Overloading

### `__get(string $name): mixed`

Called when reading an inaccessible (private/protected) or non-existent property.

### `__set(string $name, mixed $value): void`

Called when writing to an inaccessible or non-existent property.

### `__isset(string $name): bool`

Called when `isset()` or `empty()` is used on an inaccessible or non-existent property.

### `__unset(string $name): void`

Called when `unset()` is used on an inaccessible or non-existent property.

---

## Method Overloading

### `__call(string $name, array $arguments): mixed`

Called when an inaccessible or undefined **instance method** is invoked on an object. **Key gadget chain link — if you call a method on a controlled object that doesn't have that method, `__call()` fires.**

### `__callStatic(string $name, array $arguments): mixed`

Called when an inaccessible or undefined **static method** is invoked.

---

## Type Casting / Conversion

### `__toString(): string`

Called when an object is treated as a string (e.g. `echo $obj`, string concatenation, `printf("%s", $obj)`). **Triggered in gadget chains when a controlled object is concatenated or echoed.**

### `__invoke(mixed ...$args): mixed`

Called when an object is used as a function (e.g. `$obj()`). Available since PHP 5.3. **Triggered in chains when `call_user_func()` is used on a controlled object.**

---

## Export / Debug

### `__set_state(array $properties): object`

Static method called by `var_export()`. Receives an array of exported properties and should return a new instance.

### `__debugInfo(): ?array`

Called by `var_dump()` to control which properties are shown. If not defined, all properties are dumped.

---

## Exploitation Relevance

### High value for gadget chains

| Method         | Trigger                   | Why it matters                                         |
| -------------- | ------------------------- | ------------------------------------------------------ |
| `__wakeup()`   | `unserialize()` is called | First code that runs on deserialization                |
| `__destruct()` | Object is destroyed       | Always fires when script ends — guaranteed execution   |
| `__toString()` | Object used as string     | Fires on concatenation, `echo`, string comparisons     |
| `__call()`     | Undefined method invoked  | Redirects method calls — chain hopping between classes |
| `__get()`      | Undefined property read   | Redirects property access to attacker-controlled logic |
| `__invoke()`   | Object called as function | Fires via `call_user_func($controlledObj)`             |

### Lower value (but still worth noting)

| Method            | Trigger                            | Why it matters                                               |
| ----------------- | ---------------------------------- | ------------------------------------------------------------ |
| `__set()`         | Write to inaccessible property     | Can trigger side effects on assignment                       |
| `__isset()`       | `isset()` on inaccessible property | Occasionally useful if chained with conditional logic        |
| `__unserialize()` | `unserialize()` (PHP 7.4+)         | Modern replacement for `__wakeup()`, same exploitation value |
| `__callStatic()`  | Undefined static method invoked    | Less common in chains but same principle as `__call()`       |

### Typical chain flow

```
unserialize()
  → __wakeup() or __destruct()
    → calls method on $this->controlledProperty
      → __call() (if method doesn't exist on that class)
        → calls another method or function with controlled args
          → __toString() (if object used as string)
            → dangerous sink: system(), exec(), file_put_contents(), eval(), etc.
```
