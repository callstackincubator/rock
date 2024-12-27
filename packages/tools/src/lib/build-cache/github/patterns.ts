import * as r from 'ts-regex-builder';

export const GITHUB_REPO_REGEX = r.buildRegExp([
  r.startOfString,
  r.choiceOf('git@', 'https://'),
  r.oneOrMore(/[^:/]/),
  r.anyOf(':/'),
  r.capture(r.oneOrMore(/[^/]/)), // organization
  '/',
  r.capture(r.oneOrMore(r.any, { greedy: false })), // repository
  r.optional('.git'),
  r.endOfString,
]);
