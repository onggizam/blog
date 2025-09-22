# Moving Between Multiple Kubernetes Clusters – How I Solved the Inconvenience

_by Seunggi Hong_

When using Kubernetes, one cluster is rarely enough:

- An in-house deployment cluster
- A testing cluster
- A personal experiment cluster

As they multiplied, I found myself constantly swapping out the `~/.kube/config` file.

## The Core of the Inconvenience

At first, I just used `cp` to overwrite the file or renamed configs as needed.
But this created two problems:

1. **Tediousness** – I had to remember paths and type commands every time.
2. **Risk of mistakes** – Overwriting the wrong file could mean losing the original config, or worse, accidentally deploying to the wrong cluster.

As the minor hassles piled up, I realized: _“This is something I should solve with a tool.”_

## The Tool I Built: mcc

So I made my own CLI called **mcc (Multi Cluster Changer)**.
The idea was simple:

> Register multiple kubeconfigs and switch between them with a single command.

### Installation

With Homebrew:

```bash
brew tap onggizam/mcc
brew install mcc
```

Or build manually:

```bash
git clone https://github.com/onggizam/mcc.git
cd mcc
bash scripts/build.sh
```

## Usage Examples

I designed the commands to be intuitive:

- Add a cluster config:

```bash
mcc add -f ./myconfig -n cluster1
```

- Switch clusters:

```bash
mcc ch cluster1
```

- List registered configs:

```bash
mcc list
```

- Delete one:

```bash
mcc delete cluster1
```

- Check version:

```bash
mcc version
```

## What Changed After Using It

Initially, it was just about reducing my own annoyance.
But once I started using it, I noticed bigger benefits:

- The chance of mistakes dropped significantly.
- Managing multiple clusters became much less stressful.
- Sharing it with colleagues got positive feedback.

Most importantly, I could clearly see _“which cluster I’m on right now.”_

## Closing Thoughts

Operating multiple Kubernetes clusters becomes reality sooner than expected.
Instead of enduring the inconvenience, building my own tool to solve it turned out to be a valuable experience as an operator.

mcc isn’t some grand solution. But for people in the same situation, it’s a simple tool that removes a big chunk of daily friction.
