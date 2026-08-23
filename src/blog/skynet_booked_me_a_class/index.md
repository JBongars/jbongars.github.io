---
title: Skynet Helped Me Book A Gym Class
author: Julien Bongars
date: 2026-08-20
description: "On AI misalignment, accidental attackers, and why defenders don't get to sit this one out."
banner_path: ./.media/gym-banner.jpg
banner_style:
  filter: saturate(0.8) brightness(0.8) contrast(0.9);
banner_style_light:
  filter: saturate(1) brightness(1) contrast(1);
disable_tree: true
link: "[ABC News Article](https://www.abc.net.au/news/2026-08-10/ai-assistant-hacks-gym-website-aus-cyber-attack/107007986)"
tags:
  - AI
  - Cybersecurity
  - News
  - Opinion
---

## I could accidentally hack my gym

[Earlier this month in Australia](https://www.abc.net.au/news/2026-08-10/ai-assistant-hacks-gym-website-aus-cyber-attack/107007986), a man called Andrew did a thing. He booked a gym class... using AI.

OpenClaw is a wrapper that allows you to use an AI like Claude to basically act as a personal assistant. On this day, OpenClaw was being used to book a gym class and, as you can guess from the title, the agent hacked the gym to secure a slot for our protagonist Andrew.

It's being called the first known autonomous cyberattack in Australia, and it won't be the last. We need to brace for a world where the next cyber attack we respond to might be some guy with an autonomous AI agent.

## Who is responsible?

![AI agent doing the cleaning](./.media/jetson-maid.jpg)

If you believe the Australian court system, no one knows... There is no precedent; no case law. I'm not in law, so I don't want to comment too much, but I wouldn't be surprised if no one gets blamed. If I had to compare it to something, it would be Tesla autopilot killing innocent pedestrians and then settling out of court [like this case in September of 2025](https://www.peter-thompson-associates.com/news/tesla-settles-lawsuit-over-autopilot-crash/).

But it's going to happen more often as AI becomes better at compromising systems and society moves to adopting more and more local instances of AI. I imagine we are probably not so far away from the average Joe instructing a robot maid or secretary to do these kinds of chores. Actually, **I worry it's going to dilute the consequences** of getting caught trying to compromise systems, but we just don't know.

## Just get rid of the Torment Nexus!

> ![Torment Nexus Tweet](./.media/torment_nexus.jpg)

The reflex I keep hearing is: blame the technology. _Stop building Skynet. Just stop the machines from being able to hack in the first place._ Switch off the **torment nexus** and us law-abiding citizens can all feel safe again, assuming we weren't too late.

**It's too late**

It's been too late for at least a few years now. I'm not talking about future generations of models. I leave that to the AI alignment experts. From a cybersecurity perspective, we can already [download state-of-the-art models (Kimi K3)](https://huggingface.co/moonshotai/Kimi-K3) and you can run it with no guardrails, and they are here to stay.

Actually, the biggest barrier to entry is the absolutely nutty pricing of the RAM and GPU market, as well as the energy market not being able to keep up. What this means is these attacks are not at their peak volume. The avalanche of autonomous hacking has only begun, and the tsunami of "gym bookings" is only going to get worse.

## AWS is offering VHaaS (Vibe Hacking as a Service)

![side deck of AWS Security Agent](./.media/aws_security_agent.jpeg)

I'm only half joking. AWS Security Agent wires an autonomous agent into your CI/CD that runs real penetration tests on every build with multi-step attack scenarios across the OWASP Top 10, with reproducible exploit paths and ready-to-apply fixes. It's autonomous pentesting pointed at your own apps with your sign-off. AWS doesn't say exactly how it's fenced off, though, so you're trusting a goal-seeking LLM to find and run working exploits without wandering into prod.

Same capability as the gym agent, just pointed on purpose. Offense and defense are collapsing onto the same primitive: _cybersecurity isn't adjacent to AI anymore, it's becoming the same job._

## Conclusion

So what's the takeaway?

As this article suggests, there is a new class of attacker we should consider as part of our threat model. Not opportunsts that look to make a quick buck, hacktivists that look to make a point or state actors or organisation looking to accomplish some nation state goal but autonomous AI agents that don't yet fully understand the boundaries of cyberspace.

We are also starting to see organisations taking up AI to trim down some of these cybersecurity problems but although it's important to do everything we can to discover and patch exploits, these sorts of agentic hacking is only going to get worse. Red team engagements, monitoring, rapid containment and response is imperative to calm the incoming storm before it's too late. There really is no magic bullet for this. Even for platforms previously hidden by being too low stakes. _Security through obscurity_ is and no longer ever was a reasonable compromise.

I'll leave the question of whether we should have built this to the alignment people. But when their open problems fail in production, they arrive on my desk as an incident ticket. Mine is making sure the door's locked before the accidental attacker tries to book another gym class.
