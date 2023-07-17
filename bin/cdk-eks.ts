import { Construct } from 'constructs';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as backup from 'aws-cdk-lib/aws-backup';
import { Duration } from 'aws-cdk-lib';


const app = new cdk.App();

const bootstrapRepo: blueprints.ApplicationRepository = {
    repoUrl: 'https://github.com/sathish2304/eks-blueprints-repo'
}


const addOns: Array<blueprints.ClusterAddOn> = [
	    new blueprints.addons.EbsCsiDriverAddOn(),
	    new blueprints.addons.EfsCsiDriverAddOn(),
	    new blueprints.addons.VpcCniAddOn(),
	    new blueprints.addons.CoreDnsAddOn('v1.9.3-eksbuild.5'),
	    new blueprints.addons.KubeProxyAddOn('v1.26.6-eksbuild.1'),
	    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
	    new blueprints.addons.ArgoCDAddOn({
                bootstrapRepo: {
                    ...bootstrapRepo,
                    path: './manifests/StorageClass',
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
                    "EKSPVBackup": "true",
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
    
// Create a AWS Backup Vault
const backupVault = new backup.BackupVault(stack, 'BackupVault', {backupVaultName: 'EKSBackupVault'});

// Create a AWS Backup Backup plan to backup resources based on Tags
const backupPlan = new backup.BackupPlan(stack, 'BackupPlan', {backupPlanName: 'EKSBackupPlan'});
backupPlan.addRule(backup.BackupPlanRule.daily(backupVault));
backupPlan.addSelection('EKSResources', {
  resources: [
    backup.BackupResource.fromTag('EKSPVBackup', 'true'), 
  ]
})