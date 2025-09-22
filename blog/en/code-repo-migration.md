# Migrating from GitLab to GitHub

_by Seunggi Hong_

Due to a recent infrastructure overhaul, I had no choice but to **migrate from GitLab to GitHub**.
Since it’s not something most people do often, I wanted to document the process and what I learned.

## Perfect Migration Is Impossible

First, one key fact:
GitLab and GitHub are both source code management tools, but their **merge concepts differ**.

- GitLab: **MR (Merge Request)**
- GitHub: **PR (Pull Request)**

They’re similar in spirit but not identical. Because their naming and internal handling differ, **you can’t convert MR → PR in a 1:1 way**.
So instead of a “perfect migration,” the realistic goal is a **close approximation**.

## Step 1: Migrating the Repository History

The first task was moving the GitLab repo to GitHub.
The important detail: create an **empty GitHub repo** beforehand (don’t even add a README.md).

```bash
git clone --mirror <GITLAB_REPO_URL>
cd <repo-name>
git remote set-url --push origin <GITHUB_REPO_URL>
git push --mirror
```

This transfers **all Git history and branches** to GitHub.

## Step 2: Converting MR → Issue

The next challenge: what to do with GitLab’s MRs.
Since direct conversion to PRs isn’t possible, I chose to **convert MRs into GitHub Issues**.

For this, I used [node-gitlab-2-github](https://github.com/piceaTech/node-gitlab-2-github).

### How to Use

```bash
git clone https://github.com/piceaTech/node-gitlab-2-github.git
cd node-gitlab-2-github
npm install
```

Then configure GitHub/GitLab tokens and target repos in the config file, and run:

```bash
npm run start
```

This tool migrates MRs as Issues.
Of course, some info—like “branch deleted after merge”—only remains as text in the Issue.
For me, that wasn’t a problem, so I accepted it.

## Step 3: Longer Than Expected Runtime

Migrating a repo with around 500 MRs took about **1 hour**.
The reasons:

- GitHub API rate limits slow things down
- More MRs → more time

So it’s important to **set aside enough time** before running the process.

## Final Thoughts

Migrating from GitLab to GitHub is both simpler and less complete than you might expect.

- Git history and branches transfer smoothly.
- MRs can’t become PRs—they must become Issues.
- Large numbers of MRs mean long runtimes.

My takeaway: with the right tools, migration is entirely feasible.
But you need to clearly understand the **conceptual differences between platforms** to avoid unnecessary headaches.
