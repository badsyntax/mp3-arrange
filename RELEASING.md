Ensure the following is done before releasing a new version:

* README is updated
  * Update the module CLI options
* Use `npm version` to tag and update package file

```
alias patch='pre-version && npm version patch && post-version'
alias minor='pre-version && npm version minor && post-version'
alias major='pre-version && npm version major && post-version'
alias pre-version='git diff --exit-code && npm prune && npm install -q && npm test'
alias post-version='(npm run build; exit 0) && git diff --exit-code && git push && git push --tags && npm publish'
```
