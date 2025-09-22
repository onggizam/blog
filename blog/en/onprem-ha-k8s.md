# Building an HA Kubernetes Cluster

There was always one thing that bothered me when using Kubernetes:
the anxiety of “What if it goes down?”

We were running development applications and PoCs on an on-premises cluster, but the Control Plane was just a single node. If that node went down, the entire cluster would inevitably stop.

I wanted to eliminate that risk. That’s what led me to set up an HA (High Availability) cluster.

## Lessons from Expanding the Control Plane

The first attempt was simply adding another Control Plane node. It looked easy on paper, but in practice, issues piled up: certificates, version mismatches, CRI differences.

Surprisingly though, even with “different Kubernetes versions and runtimes,” the nodes still managed to join the cluster. I expected failures, but it worked more smoothly than anticipated. That gave me a strong impression: “Kubernetes is more flexible than I thought.”

## Load Balancer: The Beauty of Simplicity

Multiple Control Planes require something in front of them. I chose HAProxy + Keepalived.

The reasons were simple:

- Time-tested architecture
- Supports both L4 and L7
- Lightweight and easy to install

Rather than a heavy, complex solution, this setup was just enough—practical and elegant. Watching the VIP switch from LB01 to LB02 when one failed was oddly satisfying.

## Seamless Failover: The Real Key

The most sensitive point was ensuring seamless failover.

Changing the ControlPlaneEndpoint to a VIP seems trivial, but without adding the VIP to the certificate SAN, errors immediately surface. In production, that translates to downtime. I learned this the hard way when I forgot to include the VIP in the certs.

The takeaway:

- HA isn’t just about adding more nodes.
- The essence lies in guaranteeing a reliable transition process.

## etcd Backups: The Final Piece of HA

Even with HA configured, etcd remains the weak spot. If etcd gets corrupted, the cluster collapses.

That’s why I implemented regular etcd backup/restore procedures. At first, I thought “once a week should be enough.”

But after experiencing a real failure, I realized daily backups are the only way to feel secure.

## Looking Back

This HA setup was more than a technical challenge—it was about easing the anxieties of an operator with technology.

- Control Plane expansion removed the “single point of failure.”
- Load balancer redundancy prepared us for “unexpected downtime.”
- etcd backups gave us a “last line of defense.”

It’s not perfect—monitoring, alerting, and further scaling are still on the roadmap.

But at least now, I have the confidence that the cluster won’t stop just because one node dies.

## Final Thoughts

Kubernetes HA is not just a technical task.

It’s a process that gives operators the confidence: “My system won’t easily collapse.”

If you’re still running a cluster with a single Control Plane, I highly recommend considering HA.

It reduces anxiety, boosts confidence, and transforms not only your system—but also your mindset as an operator.
