# GitOps Adoption Story

In Kubernetes operations, CI/CD is essentially the heart of the service. For a while, we used a **Jenkins + ArgoCD** combination. But when the **architect left without any documentation**, the problems began.
The remaining Jenkins jobs became a black box, and even small changes felt like big risks. We concluded **“this is unmaintainable as-is”**, and along with **migrating repositories from GitLab to GitHub**, we decided to completely rebuild CI/CD.

During that process, we **compared multiple tools using a scoring method**. Rather than personal preference, we wanted a quantified basis for decisions.

## Background: Why We Switched

- **Knowledge break**: No design intent or operations guide → effectively unmaintainable.
- **Operational cost**: Burden of managing Jenkins servers/plugins/security patches.
- **Strategic shift**: Aim to strengthen **GitHub-centric operations** + **GitOps**, tying code and pipelines together.

## Pre-evaluation: CI Tool Scoring Summary

- **GitHub Actions** : **96/100**
  - Overwhelming dev experience, ecosystem, and flexibility. Best for GitHub-centric work.
- Drone CI : 76/100
  - Lightweight and fast, but manual setup/ecosystem/advanced features hold it back.
- Jenkins X : 72/100
  - K8s-native with deep GitOps focus, but high adoption/maintenance difficulty.

**Why was GitHub Actions #1?**

- Runs immediately by **just adding YAML** under `.github/workflows`, easy runner choice (Hosted/Self-hosted).
- **Marketplace actions**, **conditions/matrix/reusable workflows** favor complex pipeline composition.
- Strong governance with **org/repo/environment-level secrets** and **approval policies (Environments/RBAC)**.
- **Zero** server/plugin management burden compared to Jenkins.

> Conclusion: For our situation—**“we must quickly normalize an unmaintainable state”**—it was the lowest-risk choice with strong long-term operability.

## Pre-evaluation: CD Tool Scoring Summary

- **ArgoCD** : **97/100**
  - The GitOps classic. Pull-based sync, drift detection, one-click rollback, strong multi-cluster.
- GitHub Actions(CD only) : 70/100
  - Great triggers/UX but lacks state sync/auto rollback/drift detection. Not a GitOps replacement.

**Why was ArgoCD essential?**

- A **pull-based controller** that guarantees **“state declared in Git = actual cluster state.”**
- **Drift detection/automatic recovery, commit-based rollback**, supports multi-cluster/multi-tenancy.
- While Actions can deploy, it’s hard to meet **GitOps essentials (state/sync/rollback)** with Actions alone.

> Conclusion: **CI with GitHub Actions, CD with ArgoCD**—clear division of roles that best matches our needs (stability/scalability).

## Detailed Scoring

### Drone CI

<details>
<summary>📍 Drone CI Summary (Total: 76/100)</summary>

A lightweight open-source CI tool with container-based architecture and strong performance in cloud environments.  
However, it has many manual setup elements and limitations in plugin ecosystem and advanced features.

**By Category**

1. Ease of setup/adoption - 5
2. Workflow flexibility - 6
3. Runner management & scalability - 9
4. Container/cloud-native support - 10
5. Plugin/ecosystem extensibility - 7
6. Git integration & event triggers - 8
7. Speed/performance optimization - 8
8. Security & secret management - 10
9. Monitoring & feedback UX - 8
10. Maintainability - 5

😎 **Analysis**: Good for teams with cloud-native DevOps experience. But if UI/UX and automation convenience matter, GitHub Actions is better.

</details>

### GitHub Actions (CI)

<details>
<summary>📍 GitHub Actions Summary (Total: 96/100)</summary>

A representative SaaS-based CI/CD tool. Deeply integrated with the GitHub ecosystem, offering excellent developer experience and automation flexibility.

**By Category**

1. Ease of setup/adoption - 10
2. Workflow flexibility - 10
3. Runner management & scalability - 10
4. Container/cloud-native support - 9
5. Plugin/ecosystem extensibility - 10
6. Git integration & event triggers - 10
7. Speed/performance optimization - 8
8. Security & secret management - 10
9. Monitoring & feedback UX - 10
10. Maintainability - 9

😎 **Analysis**: Optimal for GitHub-based collaboration. Quick adoption, scalability, and AI (Copilot) integration make it a modern CI/CD platform.

</details>

### Jenkins X

<details>
<summary>📍 Jenkins X Summary (Total: 72/100)</summary>

A Kubernetes-based, GitOps-focused CI/CD tool. Offers powerful automation and deep K8s integration, but with high adoption/ops complexity.

**By Category**

1. Ease of setup/adoption - 4
2. Workflow flexibility - 6
3. Runner management & scalability - 9
4. Container/cloud-native support - 10
5. Plugin/ecosystem extensibility - 8
6. Git integration & event triggers - 9
7. Speed/performance optimization - 8
8. Security & secret management - 8
9. Monitoring & feedback UX - 6
10. Maintainability - 4

😎 **Analysis**: Suited for platform teams in large organizations or advanced DevOps orgs. Heavy for startups/small teams.

</details>

### GitHub Actions (CD)

<details>
<summary>📍 GitHub Actions as CD (Total: 70/100)</summary>

Strong for unified CI/CD management, but limited from a GitOps perspective. Missing state sync, auto-rollback, and multi-cluster support.

**By Category**

- Deployment trigger method - 8
- Fit for GitOps model - 8
- Kubernetes integration level - 7
- Rollback capabilities - 4
- State detection & auto sync - 3
- CI/CD pipeline integration flexibility - 10
- Security & secret management - 7
- Access control & RBAC - 10
- Monitoring & feedback UX - 10
- Scalability & multi-cluster support - 3

😎 **Analysis**: Suitable for single-cluster/small teams. But lacking core GitOps features → needs a complementary tool like ArgoCD.

</details>

### ArgoCD

<details>
<summary>📍 ArgoCD Summary (Total: 97/100)</summary>

A Kubernetes-native CD tool that most faithfully implements GitOps principles. Supports pull-based sync, drift detection, rollback, and multi-cluster.

**By Category**

- Deployment trigger method - 10
- Fit for GitOps model - 10
- Kubernetes integration level - 10
- Rollback capabilities - 10
- State detection & auto sync - 10
- CI/CD pipeline integration flexibility - 7
- Security & secret management - 10
- Access control & RBAC - 10
- Monitoring & feedback UX - 10
- Scalability & multi-cluster support - 10

😎 **Analysis**: Optimal GitOps CD solution for enterprises. Meets stability, scalability, and security needs.

</details>

## Final Decision: GitHub Actions + ArgoCD

**Selection Criteria**

1. **Speed of recovery from the knowledge break**: Must stabilize quickly.
2. **Operational simplicity**: Minimize management points (aim for zero servers/plugins/security patches).
3. **GitOps suitability**: Declarative, watch/sync, rollback, multi-cluster are essential.
4. **Scalability**: Private registry (Harbor), environment separation, approvals, and alerts integration.

**Architecture Summary**

- **CI (GitHub Actions)**: Tests → Docker build → **Push to Harbor** → **Commit auto-update to deployment manifests’ image tags**
- **CD (ArgoCD)**: Detect **Git changes** and **auto/manual sync**, with environment-specific policies

  - Dev: auto-sync / Stage: auto or manual / Prod: manual (approval required)

## Migration & Setup Essentials

### Repository Migration

- Preserve **branches/tags/commit history** via `git clone --mirror` → Push to GitHub
- After integrity checks, tidy up README and branch strategy

### CI Workflows (Examples)

- `.github/workflows/ci.yml`: Lint/tests
- `.github/workflows/docker-publish.yml`: Docker build → **Push to Harbor**
- `.github/workflows/update-tag.yml`: Commit kustomization image tag updates in the `manifest repo`

**Secrets/Variables Examples**

- `HARBOR_USER`, `HARBOR_PASSWORD`, `REGISTRY` (e.g., `infra.harbor.com`)
- Separate deploy approvals/secret scopes/protection rules using GitHub **Environments**

### CD Structure (Example)

```bash
.
├── base
│   ├── deployment.yaml
│   ├── kustomization.yaml
│   └── service.yaml
├── overlays
│   ├── dev
│   │   ├── ingress.yaml
│   │   ├── kustomization.yaml
│   │   └── node-selector-patch.yaml
│   ├── prod
│   │   ├── ingress.yaml
│   │   ├── kustomization.yaml
│   │   └── node-selector-patch.yaml
│   └── stg
│       ├── ingress.yaml
│       ├── kustomization.yaml
│       └── node-selector-patch.yaml
```

- Actions **commit manifest changes** with the new tag → ArgoCD detects/applies
- Prod uses **manual sync** with operator approval

## Effects of the Transition

- **Transparency**: “Who/when/what” ends up fully captured in **commits + Actions logs**.
- **Reduced operational burden**: Removed Jenkins management points, simplified around GitHub.
- **Stability/Recovery**: ArgoCD’s **drift detection/one-click rollback** reduced incident response times.
- **Scalability**: Easy to extend to multi-cluster, per-environment approvals, preview deployments, Canary/Rollouts.

## Lessons Learned

> **Automation without documentation is technical debt.**  
> Maintainable design, documentation, permission/secret management, and approval processes must be designed together.

This rebuild wasn’t just a tool swap—it was a **cultural shift to GitOps with Git as the single source of truth**.  
And under the practical constraint of “rapid normalization,” the **GitHub Actions + ArgoCD** combination was the choice that achieved the greatest stability with the least risk.
