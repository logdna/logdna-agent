# Kubernetes Logging

If you have never run the agent before, then we recommend installing [our latest version](https://github.com/logdna/logdna-agent-v2#installing-on-kubernetes)
to get started.

# Upgrading to LogDNA Agent 2.0 for Kubernetes

If you'd like to upgrade your existing Kubernetes agent, we've recently made the LogDNA Agent 2.0 publicly available for Kubernetes users.
To upgrade your exsiting agent, you can simply run the following:

```
kubectl patch ds/logdna-agent -p '{"spec":{"updateStrategy":{"type":"RollingUpdate", "maxUnavailable":"100%"}}}'

kubectl patch ds/logdna-agent -p '{"spec":{"template":{"spec":{"containers":[{"name":"logdna-agent","image":"logdna/logdna-agent-v2:stable", "imagePullPolicy": "Always"}]}}}}'
```

To confirm that it upgraded correctly, please run `kubectl get ds logdna-agent -o yaml | grep "image: logdna/"`.
If you see `image: logdna/logdna-agent-v2:stable` then you are good to go.

If you'd like to to install LogDNA's Agent 2.0 into a new cluster, you can simply run the following two `kubectl` commands:

```
kubectl create secret generic logdna-agent-key --from-literal=logdna-agent-key=<YOUR LOGDNA INGESTION KEY>

kubectl create -f https://raw.githubusercontent.com/logdna/logdna-agent/master/logdna-agent-v2.yaml
```

If you don't have a LogDNA account, you can create one at https://logdna.com.  If you're on macOS w/[Homebrew](https://brew.sh) installed,
you may use our LogDNA command line interface to register:

```
brew cask install logdna-cli
logdna register <email>
# now paste the Ingestion Key into the kubectl commands above
```
