#!/bin/bash
# Assuming it is running on Debian

# Variables
export ANSIBLE_HOST_KEY_CHECKING=False
export TERRAFORM_STATE_ROOT=.

# Step 1: Install Dependencies
sudo apt-get install -y virtualenv
git clone https://${GITHUB_TOKEN}@github.com/answerbook/logdna-agent-ansible.git

# Step 2: Create a Virtual Environment for Ansible
cd logdna-agent-ansible
virtualenv venv
. venv/bin/activate
pip install -r requirements.txt
eval $(ssh-agent)
chmod 600 ssh_keys/id_rsa.agent-testing
ssh-add ssh_keys/id_rsa.agent-testing
cp ../*.deb logdna-agent-ansible/files/
cp ../*.rpm logdna-agent-ansible/files/

# Step 3: Install LogDNA Agent onto Hosts
ansible-playbook -l ubuntu*:centos-7:debian-9:rhel* -i hosts install_agent.yml

# Step 4: Test Sending Logs thru LogDNA Agent on Hosts
ansible-playbook -l ubuntu*:centos-7:debian-9:rhel* -i hosts generate_fakelogs.yml

# Step 5: Analyze the Results
py.test \
	-n 4 \
	--force-ansible --ansible-inventory=hosts \
	--connection=ansible \
	-v tests \
	--sudo --cache-clear --hosts rhel-7,ubuntu-1604,debian-9,centos-7,ubuntu-1804