# Open Source Contribution Experience: Fill in the TODO comments

_by Seunggi Hong_

There are many tools designed to make Kubernetes easier to use. Among them, the **kubectl-ai** repository managed by GoogleCloudPlatform is an interesting project that leverages LLM models to assist with kubectl commands.

Recently, I enhanced the reliability of this project by resolving a small TODO comment in the repository. Specifically, I added integrity verification to the model download logic.

## Awareness Sparked by a Single Comment

The original code contained logic to download models from Hugging Face, but there was a comment like this:

```bash
# TODO Verify checksum
```

In other words, the file was simply being downloaded without any verification of its integrity. Since model files are often several gigabytes in size, they could be corrupted during download or pose security risks such as man-in-the-middle attacks. Integrity verification is not just a “nice to have” but an essential step.

## Improvement Process

While exploring the Hugging Face API, I found that it provides SHA-256 checksum values for model files in the API response. This allowed me to easily automate the integrity check.

The key points of the improved logic are as follows:

### 1. Retrieve Expected Checksum

Query the Hugging Face API for the SHA-256 value of the file.

```bash
EXPECTED_SHA256=$(curl -s "https://huggingface.co/api/models/${MODEL_REPO}" | \
 jq -r ".siblings[] | select(.rfilename == \"${MODEL_NAME}\") | .sha256")
```

### 2. Download the Model

Download the file with wget as before.

wget "${MODEL_URL}" -O "${MODEL_PATH}"

### 3. Verify the Downloaded File

Use sha256sum to calculate the hash of the downloaded file and compare it with the expected value. If they do not match, delete the file immediately and raise an error.

```bash
actual_hash=$(sha256sum "${MODEL_PATH}" | awk '{print $1}')
if [[ "${actual_hash}" != "${EXPECTED_SHA256}" ]]; then
  echo "Checksum mismatch"
  rm -f "${MODEL_PATH}"
exit 1
fi
```

## The Meaning of This Code Change

At first glance, this may seem like nothing more than a minor script tweak. But the impact is meaningful:

- Reliability: Ensures corrupted model files are not left in the local cache.
- Security: Detects malicious tampering during the download process.
- User Trust: Builds confidence that “kubectl-ai safely manages models.”

In short, a single line of code significantly improved the trustworthiness of the project as a whole.

## Conclusion

This experience reminded me that open source contributions don’t always mean adding large new features—sometimes they’re about improving quality in small but important ways.

If I had overlooked that one comment, this improvement would never have happened. By reading the code with an eye for improvement, I was able to make a meaningful contribution.

Going forward, I want to keep spotting these small inconveniences and gaps and turning them into improvements that benefit everyone.
