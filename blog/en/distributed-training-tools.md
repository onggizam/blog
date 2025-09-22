# Distributed Training: Why I Moved from Horovod to Ray

_by Seunggi Hong_

## Why Distributed Training?

Machine learning and deep learning models have grown to the point where a single GPU can no longer handle them efficiently.

- Datasets have expanded from tens of GBs to terabytes.
- Model parameters have grown from millions to billions.

In such scenarios, single-node training is not only **time-consuming and costly**, but also fails to meet **real-time requirements** in production.

In domains like smart greenhouses, where sensor data streams continuously, **distributed training and inference** become essential.

## Why I First Chose Horovod — and Its Limitations

Initially, I adopted **Horovod**, developed by Uber. Horovod leverages the **AllReduce algorithm** to efficiently synchronize parameters, delivering strong performance in large-scale deep learning.

### 👍 Strengths

- **High-speed training**: Integrates with TensorFlow, PyTorch, and MXNet, enabling fast distributed training on GPU clusters.
- **MPI optimization**: Well-optimized GPU communication, often producing strong benchmark results.

### 👎 Weaknesses

However, practical challenges emerged quickly:

1. **Dependency sensitivity**  
   Horovod is highly sensitive to versions of CUDA, NCCL, OpenMPI, and TensorFlow/PyTorch. Even a minor mismatch often broke the build, costing days in debugging.
2. **Kubernetes integration challenges**  
   Running Horovod on Kubernetes requires MPI Operators, Helm charts, and extensive configurations — raising operational complexity.
3. **Limited workload coverage**  
   Horovod shines in training but lacks natural support for preprocessing, online inference, or reinforcement learning workloads.

In short, Horovod is great for research but not as practical in a **cloud-native production environment**.

## Why I Transitioned to Ray

To overcome these challenges, I moved to **Ray** — designed from the ground up as a **general-purpose distributed framework**. Unlike Horovod, Ray covers the full pipeline: **data processing → training → tuning → serving**.

### Advantages of Ray

1. **Kubernetes-native**  
   With the Ray Operator, deploying RayClusters is simple. Pods recover automatically, making it more cloud-friendly than Horovod.

2. **Pythonic interface**  
   Minimal code changes are required. Adding a `@ray.remote` decorator distributes tasks seamlessly, lowering the barrier to entry.

3. **Multi-workload support**

   - Data processing (Ray Data)
   - Training (Ray Train)
   - Hyperparameter tuning (Ray Tune)
   - Online serving (Ray Serve)
   - Reinforcement learning (RLlib)  
     This makes Ray an **end-to-end ML pipeline platform**.

4. **Flexible resource management**  
   Ray’s scheduler allocates CPU/GPU resources dynamically across Pods. For example, preprocessing can run on CPUs, training on GPUs, and inference on mixed resources.

## Insights from Moving to Ray

Switching to Ray wasn’t just about performance gains — it was about **operational efficiency**.

- **Setup time reduced**: Environment setup dropped from several days (Horovod) to less than a day (Ray).
- **Unified workloads**: Preprocessing, training, and inference now run within the same Ray cluster, reducing overhead.
- **Easier integration**: Connecting Ray with Airflow and MLflow was simpler and more streamlined.
- **Effortless scaling**: When dataset size grew 10x, I only needed to scale Ray Worker Pods.

## Horovod vs Ray — At a Glance

| Aspect       | Horovod                           | Ray                                       |
| ------------ | --------------------------------- | ----------------------------------------- |
| Main Purpose | Large-scale training optimization | General-purpose distributed computing     |
| Strengths    | Fast GPU training, MPI-optimized  | Kubernetes-native, multi-workload support |
| Weaknesses   | Dependency-heavy, complex ops     | Some workloads still maturing             |
| Best Fit     | Research training clusters        | Production ML pipelines, cloud-native     |

## Conclusion

Horovod remains valuable in research or controlled environments. But in production, **operational efficiency and scalability** often matter more than raw training speed.

My experience with Ray reinforced this: **distributed training is not just about speed, but about fitting seamlessly into a cloud-native ecosystem**.

For teams choosing distributed training tools, don’t just compare benchmarks. Instead, consider **operational simplicity, pipeline integration, and cloud readiness** as critical decision factors.
