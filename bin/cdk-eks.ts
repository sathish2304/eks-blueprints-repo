import { Construct } from 'constructs';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const app = new cdk.App();


const addOns: Array<blueprints.ClusterAddOn> = [
	    new blueprints.addons.EbsCsiDriverAddOn(),
	    new blueprints.addons.VpcCniAddOn(),
	    new blueprints.addons.CoreDnsAddOn('v1.9.3-eksbuild.5'),
	    new blueprints.addons.KubeProxyAddOn('v1.26.6-eksbuild.1'),
	    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
	    new blueprints.addons.ArgoCDAddOn({
                bootstrapRepo: {
                    repoUrl: 'https://github.com/sathish2304/eks-blueprints-repo.git',
                    path: 'manifests/StorageClass',
                     targetRevision: "main",
                     },})
];

const clusterProvider = new blueprints.GenericClusterProvider({
    version: eks.KubernetesVersion.V1_26,
    tags: {
        "Name": "backup-example-cluster",
        "Type": "generic-cluster"
    },
    managedNodeGroups: [
        {
            id: "mng1",
            amiType: eks.NodegroupAmiType.AL2_X86_64,
            instanceTypes: [new ec2.InstanceType('m5.2xlarge')],
            desiredSize: 2,
            maxSize: 3, 
            nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            launchTemplate: {
                // You can pass Custom Tags to Launch Templates which gets propagated to worker nodes.
                tags: {
                    "Name": "Mng1",
                    "Type": "Managed-Node-Group",
                    "AppName": "TestApp",
                    "Instance": "ONDEMAND"
                }
            }
        }
        
    ]
});


const account = '370926141865';
const region  = 'us-west-1';

const stack = blueprints.EksBlueprint.builder()
    .account(account)
    .clusterProvider(clusterProvider)
    .region(region)
    .addOns(...addOns)
    .build(app, 'eks-blueprint');