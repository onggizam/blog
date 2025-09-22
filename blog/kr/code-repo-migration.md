# GitLab에서 GitHub으로 레포지토리 마이그레이션

_by Seunggi Hong_

최근 사내 인프라 개편으로 인해 어쩔 수 없이 **GitLab에서 GitHub으로 마이그레이션**을 진행하게 되었다.
흔하게 겪을 일은 아니라고 생각했기 때문에, 과정과 느낀 점을 기록해 둔다.

## 완벽한 마이그레이션은 불가능하다

먼저 짚고 넘어가야 할 점이 있다.
GitLab과 GitHub은 소스코드 관리 도구라는 점에서는 같지만, **병합 단위의 개념이 다르다**.

- GitLab: **MR (Merge Request)**
- GitHub: **PR (Pull Request)**

사실상 비슷한 개념이지만, 이름과 내부 처리 방식이 달라서 **MR을 PR로 1:1 변환하는 건 불가능**하다.
따라서 완벽한 이전보다는 **흉내내는 수준의 마이그레이션**이 가능하다고 보는 게 맞다.

## 1단계: 레포지토리 이력 통째로 이전하기

먼저 GitLab에 있던 저장소를 GitHub으로 옮겼다.
이때 중요한 건 **GitHub에 비어있는 레포지토리**를 만들어 두는 것이다. (README.md 같은 파일도 만들지 않아야 한다.)

```bash
git clone --mirror <GITLAB_REPO_URL>
cd <레포지토리명>
git remote set-url --push origin <GITHUB_REPO_URL>
git push --mirror
```

이 과정을 거치면 **모든 Git 히스토리와 브랜치**가 GitHub으로 옮겨진다.

## 2단계: MR → Issue로 변환하기

다음 문제는 GitLab의 MR을 어떻게 가져올까였다.
PR로 직접 옮기는 건 불가능하니, 나는 **MR을 GitHub Issue로 변환**하는 방식을 택했다.

이때 사용한 도구가 바로 [node-gitlab-2-github](https://github.com/piceaTech/node-gitlab-2-github) .

### 사용 방법

```bash
git clone https://github.com/piceaTech/node-gitlab-2-github.git
cd node-gitlab-2-github
npm install
```

그 후 설정 파일에 GitHub/GitLab 토큰과 대상 레포지토리를 입력하고 실행한다:

```bash
npm run start
```

이 도구는 MR을 Issue로 변환해 옮겨준다.
단, **머지 후 브랜치 삭제 기록** 같은 정보는 이슈에만 남게 된다.
현재 나의 경우에는 큰 문제가 되지 않아 그대로 사용했다.

## 3단계: 예상보다 긴 소요 시간

MR이 500개쯤 되는 레포를 옮겼는데, **약 1시간**이 걸렸다.
이유는 간단하다.

- GitHub API 호출 정책(레이트 리밋) 때문에 속도가 제한됨
- MR 수가 많으면 시간이 오래 걸릴 수밖에 없음

그래서 이 작업은 **미리 시간을 확보하고** 진행하는 게 중요하다.

## 마치며

GitLab에서 GitHub으로의 마이그레이션은 생각보다 간단하면서도, 동시에 100% 완벽하진 않다.

- Git 히스토리와 브랜치는 무리 없이 옮겨진다.
- MR은 PR로 변환할 수 없고, 이슈로 옮겨야 한다.
- MR이 많다면 시간이 많이 소요된다.

이번 과정을 겪으면서 느낀 건, “툴을 잘 활용하면 이전 자체는 충분히 가능하다”는 점이다.
다만, **양쪽 플랫폼의 개념 차이**를 정확히 이해하고 접근해야 불필요한 삽질을 줄일 수 있다.
