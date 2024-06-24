#!/bin/bash
kubectl get cluster -A --kubeconfig ~/.kube-tkg/config -o json > data/clusters.json

kubectl config view -o json | jq -r '.contexts[] | [.name, .context.cluster] | @tsv' | grep admin | while read CONTEXT CLUSTER
do
  echo $CONTEXT
  mkdir -p data/$CLUSTER
  kubectl --context $CONTEXT get nodes -o json > data/$CLUSTER/nodes.json
  kubectl --context $CONTEXT get pods -A -o json > data/$CLUSTER/pods.json
done

nsxctl exec get --alb "/api/virtualservice-inventory/?include_name=true" > data/vs.json


kubectl config get-users | while read USER
do
  echo $USER
  cat ~/.kube/config | yq ".users[]|select(.name==\"$USER\").user.client-certificate-data" | base64 -d | openssl x509 -noout -dates
done
