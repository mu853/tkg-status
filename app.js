Vue.createApp({
    data() {
        return {
            clusters: {},
        };
    },
    created(){
        fetch('data/clusters.json')
            .then(response => response.json())
            .then(data => {
                for(let i = 0; i < data.items.length; i++){
                    let cluster = data.items[i];

                    let readyString = "NotReady";
                    if(cluster.status.conditions.find((c) => c.type == "Ready").status){
                        readyString = "Ready";
                    }else if(cluster.status.conditions.find((c) => c.type == "ControlPlaneReady").status){
                        readyString = "ControlPlaneReady";
                    }else if(cluster.status.conditions.find((c) => c.type == "ControlPlaneInitialized").status){
                        readyString = "ControlPlaneInitialized";
                    }else if(cluster.status.conditions.find((c) => c.type == "InfrastructureReady").status){
                        readyString = "InfrastructureReady";
                    }

                    this.clusters[cluster.metadata.name] = {
                        name: cluster.metadata.name,
                        ready: readyString,
                        update: cluster.status.conditions.find((c) => c.type == "UpdatesAvailable").status,
                        numOfNodes: 0,
                        numOfReadyNodes: 0,
                        numOfPods: 0,
                        numOfReadyPods: 0,
                        clusterType: (cluster.spec.topology ? "Class-based" : "Plan-based"),
                        accessible: "Yes",
                    };
                }
                Object.keys(this.clusters).forEach(clusterName => {
                    fetch('data/' + clusterName + '/nodes.json')
                        .then(response => response.json())
                        .then(data => {
                            let cluster = this.clusters[clusterName];
                            for(let i = 0; i < data.items.length; i++){
                                cluster.numOfNodes++;
                                let readyCondition = data.items[i].status.conditions.find((c) => c.type == "Ready");
                                if(readyCondition.status == "True"){
                                    cluster.numOfReadyNodes++;
                                };
                            }
                        })
                        .catch(error => {
                            this.clusters[clusterName].accessible = "No"
                            console.error('Error loading JSON:', error);
                        });

                    fetch('data/' + clusterName + '/pods.json')
                        .then(response => response.json())
                        .then(data => {
                            let cluster = this.clusters[clusterName];
                            for(let i = 0; i < data.items.length; i++){
                                cluster.numOfPods++;
                                let readyCondition = data.items[i].status.conditions.find((c) => c.type == "Ready");
                                if(readyCondition.status == "True" || readyCondition.reason == "PodCompleted"){
                                    cluster.numOfReadyPods++;
                                };
                            }
                        })
                        .catch(error => {
                            console.error('Error loading JSON:', error);
                        });
		        });
	        })
            .catch(error => console.error('Error loading JSON:', error));

        fetch('data/vs.json')
            .then(response => response.json())
            .then(data => {
                for(let i = 0; i < data.results.length; i++){
                    let vs = data.results[i];
                    Object.keys(this.clusters).forEach(clusterName => {
                        if(vs.config.name.match(clusterName + "-control-plane")){
                            let segName = vs.config.se_group_ref.split("#")[1];
                            let ipAddr = vs.config.vip[0].ip_address.addr;
                            let sesUpPercent = vs.runtime.percent_ses_up;
                            let status = vs.runtime.oper_status.state.split("_")[1];
                            this.clusters[clusterName].ipAddr = ipAddr;
                            this.clusters[clusterName].vsStatus = status;
                        }
                    })
                }
            })
            .catch(error => console.error('Error loading JSON:', error));
    },
}).mount('#app');
