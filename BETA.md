# Switching to LogDNA agent v2

If you already have the yaml file you used to deploy your agent you can simply change

```yaml 
image: logdna/logdna-agent:latest
``` 
to 
```yaml 
image: logdna/logdna-agent-v2:stable
```

Then re-apply your yaml and restart the agent, all done!

For those that don't, here are the steps.

#### Quick tip
If you want to easily restart the agent, run the following.
```
kubectl patch ds/logdna-agent -p '{"spec":{"updateStrategy":{"type":"RollingUpdate"}}}'
kubectl patch ds/logdna-agent -p "{\"spec\":{\"template\":{\"metadata\":{\"labels\":{\"updated\":\"`date +'%s'`\"}}}}}"
```
If you want to easily switch to agent-v2 stable
```
kubectl patch ds/logdna-agent -p '{"spec":{"template":{"spec":{"containers":[{"name":"logdna-agent","image":"logdna/logdna-agent-v2:stable"}]}}}}'
```
If you want to easily switch to agent-v2 latest
```
kubectl patch ds/logdna-agent -p '{"spec":{"template":{"spec":{"containers":[{"name":"logdna-agent","image":"logdna/logdna-agent-v2:latest"}]}}}}'
```

## Step 1 - Finding your current yaml
To see what is currently running on your cluster, `kubectl get ds logdna-agent -o yaml`

What you are looking for is the `env:` section.
It might look similar to
```yaml
env:
  - name: LOGDNA_AGENT_KEY
    valueFrom:
      secretKeyRef:
        name: logdna-agent-key
        key: logdna-agent-key
  - name: LOGDNA_PLATFORM
    value: k8s
  - name: LOGDNA_TAGS
    value: agent-v2
```
Once you have the env section from your current deployment you are ready for the next step!

## Step 2 - Creating your new yaml
Download https://raw.githubusercontent.com/logdna/logdna-agent/master/logdna-agent-v2.yaml

Replace the `env:` section with the one that you found in step 1.

Then apply your yaml and restart the agent and your all done!
