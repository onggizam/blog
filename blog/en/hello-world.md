# Kubernetes HA Cluster Notes

[![Go Reference](https://pkg.go.dev/badge/github.com/onggizam/mcc.svg)](https://pkg.go.dev/github.com/onggizam/mcc)
[![Release](https://img.shields.io/github/v/release/onggizam/mcc)](https://github.com/onggizam/mcc/releases)
[![Homebrew](https://img.shields.io/badge/homebrew-available-blue)](https://github.com/onggizam/homebrew-mcc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Quick pointers you (onggizam) said you care about:

- Control plane / worker separation
- External L4 LB (ex: HAProxy / Nginx / MetalLB)
- etcdctl install & snapshot basics
- kube-vip vs MetalLB trade-offs

## etcd snapshot

```bash
ls -al
```
