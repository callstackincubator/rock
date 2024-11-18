const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  const token = core.getInput('github-token');
  const platform = core.getInput('platform');
  const artifactUrl = core.getInput('artifact-url');

  const title = `## ${platform} Development Build`;
  const body = `🔗 Download link: [${platform} build](${artifactUrl}).\n\n
Note: if the download link expires, please re-run the workflow to generate a new build.\n\n
*Generated at ${new Date().toISOString()} UTC*\n`;

  const octokit = github.getOctokit(token);
  const {data: comments} = await octokit.rest.issues.listComments({
    ...github.context.repo,
    issue_number: github.context.issue.number,
  });

  const botComment = comments.find(
    comment =>
      comment.user.login === 'github-actions[bot]' &&
      comment.body.includes(title),
  );

  if (botComment) {
    await octokit.rest.issues.updateComment({
      ...github.context.repo,
      comment_id: botComment.id,
      body: `${title}\n\n${body}`,
    });
    console.log('Updated comment');
  } else {
    await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: github.context.issue.number,
      body: `${title}\n\n${body}`,
    });
    console.log('Created comment');
  }
}

run();
