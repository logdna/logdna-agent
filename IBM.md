# Installing LogDNA's Agent 2.0 for Kubernetes users on IBM Cloud

We've recently made the LogDNA Agent 2.0 publicly available for Kubernetes users. We'll be rolling this out to existing users as well as other platforms and operating systems over the next few weeks, but we've provided instructions here for IBM Cloud users in the interim as we update our documentation globablly.

In order to install LogDNA's Agent 2.0 into a new cluster, you can simply run the following two `kubectl` commands

```
kubectl create secret generic logdna-agent-key --from-literal=logdna-agent-key=<YOUR LOGDNA INGESTION KEY>

kubectl create -f https://repo.logdna.com/ibm/prod/logdna-agent-v2-ds-us-south.yaml
```

This automatically installs a logdna-agent pod into each node in your cluster and ships stdout/stderr from all containers, both application logs and node logs. Note: By default, the agent pod will collect logs from all namespaces on each node, including kube-system. See YAML file for additional options such as LOGDNA_TAGS.

For those who are upgrading from LogDNA Agent 1, you can patch your existing agent with the following:

```
kubectl patch ds/logdna-agent -p '{"spec":{"updateStrategy":{"type":"RollingUpdate", "maxUnavailable":"100%"}}}'

kubectl patch ds/logdna-agent -p '{"spec":{"template":{"spec":{"containers":[{"name":"logdna-agent","image":"logdna/logdna-agent-v2:stable", "imagePullPolicy": "Always"}]}}}}'
```
