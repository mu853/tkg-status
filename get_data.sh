#!/bin/bash
export PATH=$PATH:/usr/local/bin
cd $(dirname $0)
echo "{\"date\": \"$(date)\"}" > data/last_update

echo "[get cluster info]"
kubectl get cluster -A --kubeconfig /home/vmware/.kube-tkg/config -o json > data/clusters.json

echo "[get node/pod info]"
kubectl config view -o json | jq -r '.contexts[] | [.name, .context.cluster] | @tsv' | grep admin | while read CONTEXT CLUSTER
do
  echo " - $CONTEXT"
  mkdir -p data/$CLUSTER
  kubectl --context $CONTEXT get nodes -o json > data/$CLUSTER/nodes.json
  kubectl --context $CONTEXT get pods -A -o json > data/$CLUSTER/pods.json
done

echo "[get vs info]"
nsxctl exec get --alb "/api/virtualservice-inventory/?include_name=true" > data/vs.json

echo "[get certificate expiration period]"
echo "[" > tmp
kubectl config get-users | grep -v NAME | while read USER
do
  echo " - $USER"
  notAfter=$(cat /home/vmware/.kube/config | yq ".users[]|select(.name==\"$USER\").user.client-certificate-data" | base64 -d | openssl x509 -noout -dates | grep notAfter | awk -F= '{print $2}')
  jq --arg user "$USER" --arg notAfter "$notAfter" '{ "user": $user, "notAfter": $notAfter }' -n >> tmp
  echo , >> tmp
done
sed -i '$d' tmp
echo "]" >> tmp
jq -r '.' tmp > data/cert.json
rm tmp
