# 📝 Blog Content Creation Guide

## 1. File Location

- Place all posts inside the correct language folder:

  - English: `blog/en/`
  - Korean: `blog/kr/`

- File name = **slug** (lowercase, no spaces). Example:

  ```
  blog/en/test-file.md
  ```

---

## 2. File Naming Rules

- Use **lowercase letters, numbers, and dashes (-)** only.
- Avoid spaces, special characters, or uppercase.

✅ Correct:

```
my-first-post.md
k8s-setup.md
```

❌ Incorrect:

```
My First Post.md
k8s_setup.md
```

---

## 3. Rules for the **Tags Line**

- **Always place the tags line at the very bottom** of the file.
- Format must be **exactly this**:

```markdown
tags: ['tag1','tag2','tag3']
```

- Use only **English lowercase words** for tags.
- Use **single quotes `'`**, not double quotes `"` inside the list.
- Tags should be **short keywords** (e.g., `k8s`, `docker`, `tutorial`).
- Minimum 1 tag, maximum \~5 recommended.

✅ Correct:

```markdown
tags: ['k8s','etcd']
```

❌ Incorrect:

```markdown
Tags: ['k8s','HA'] # Wrong: capital T
tags: "k8s, ha" # Wrong: not in list format
tags: ['Kubernetes'] # Wrong: long/capitalized
```

---

## 4. Good Practices

- Start with a **clear H1 title (`# Title`)**.
- Use **H2 (`##`) and H3 (`###`)** for sections.
- Add **code blocks** using triple backticks.
- Keep paragraphs short for readability.
- End with the `tags:` line.

---

👉 Following this structure guarantees:

- Your post is correctly parsed.
- Title, date (if front matter is added), and tags appear properly.
- Tags are available for search/filter in the blog UI.
