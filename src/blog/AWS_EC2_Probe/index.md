---
title: I created an AWS EC2 Probe using AI
author: Julien Bongars
date: 2026-02
banner_path: ../backgrounds/satelite-dish.jpg
banner_style:
  filter: saturate(0.8) brightness(0.8) contrast(0.9);
banner_style_light:
  filter: saturate(1) brightness(1) contrast(1);
disable_tree: true
link: "[JBongars/ec2-probe](https://github.com/JBongars/ec2-probe)"
tags:
  - Security
  - Devops
  - Opinion
  - Project
---

I created this [EC2 Probe](https://github.com/JBongars/ec2-probe) for AWS. Well, I say "created" but really I'd had the idea in my head for quite some time and "co-authored" it with AI.

It's a pretty simple project. Bastions are kind of a pain to set up in AWS. You need to create an EC2 and select an AMI. Then the tricky part: you either set up some kind of networking to reach that EC2 which can be impossible in some environments or you set up AWS SSM so AWS can use _magic_ to let you connect to the instance directly.

Really, this project is a wrapper that uses CloudFormation to build the infrastructure: an EC2 with a user-data script that loads SSM, and then just connects to it all under [one file](https://github.com/JBongars/ec2-probe/blob/main/probe.sh).

## So what's it actually for?

At its core, it lets you exist inside a ~~private~~ subnet so you can reach other services. That's it. That's the whole trick — but it's a surprisingly useful one.

From there you can:

- forward ports or spin up a SOCKS proxy to reach a VNC session (basically remote desktop for Linux)
- hit an internal dashboard to confirm a service is actually running instead of just praying it is
- copy files back and forth
- simulate an assumed-breach scenario without the hassle of compromising a real service first

The point is you get to do real work inside an internal network with tools you already know without ever touching the hosts themselves.

## What worries me

This was pretty much vibe coded in a few hours, mostly because I already knew SSM and was just automating something I'd done by hand for years. But a normal bastion is a known quantity: it's logged, it's watched, it sits where your controls expect it. This one is a ghost. It leaves almost nothing to observe and nothing obvious to control.

Naturally, you could argue this just exposes the concern of security through obscurity. Before, you could kind of hide behind the fact that a project like this would just never get built in the first place, or only by someone motivated enough to see it through. Motivation like that usually came with the experience to do it responsibly. **The barrier was doing the work that the security controls should have been.**

**BUT**... let's not kid ourselves.

Developers want admin to everything. Access control is the antithesis of progress, and progress can't be slowed at least according to the dev team. So the friction was never a control we chose; it was one we tolerated because we had no choice.

The existence of AI doesn't break security. It just amplifies all the problems we never wanted to fix.

That being said... I did kind of enjoy building this one.
