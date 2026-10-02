# Document length research

This note records where the default lengths in
`skills/style/references/document-lengths.md` come from. Each default is a
ceiling for a genre a person writes at work. A number is either measured,
stated as guidance by the source that owns the format, or a convention. The
table in the skill reference carries the same labels.

Measured lengths describe what people write, and only some studies tie
length to an outcome. A ceiling sits above the typical length, so a writer
with more to say still fits. It stays low enough that a model's default
length fails it.

## Email

Boomerang counted replies against body length across more than 40 million
emails whose senders had asked for a reminder when no reply came. [Replies
peaked at 50 to 125 words](https://blog.boomerangapp.com/2016/02/7-tips-for-getting-more-responses-to-your-emails-with-data/#:~:text=The%20sweet%20spot%20for%20email%20length%20is%20between%2050-125%20words):
"The sweet spot for email length is between 50-125 words". Past 125 words the reply
rate fell, to about 44% at 500 words. The data comes from one vendor, is not
peer-reviewed, and shows a correlation. Terse takes 125 words as the email
ceiling.

## Issues and bug reports

Bettenburg and colleagues surveyed 466 developers and reporters at Apache,
Eclipse, and Mozilla. They also mined about 150,000 bug reports for
[What Makes a Good Bug Report?](https://thomas-zimmermann.com/publications/files/bettenburg-fse-2008.pdf).
Developers ranked incomplete information as the worst problem, named by 74%,
against 26% for text that ran too long. Developers fixed the more readable
reports sooner. The study sets no word count. It does set the shape: steps to
reproduce, the expected and actual behavior, and a stack trace when one
exists.

For a typical length, Panichella and colleagues measured 667 rejected GitHub
issues across 279 projects. [Their
study](https://arxiv.org/pdf/1904.02414) reports a median description of 470
characters, about 80 words. Rejected issues are a narrow sample.

Terse sets 150 words for a bug report and 200 for a feature request. Both are
conventions above the measured typical length. Code blocks, logs, and stack
traces do not count toward either ceiling. The rule against a user story and
the cap of five acceptance criteria are conventions too. They target the user
stories and long criteria lists a model adds by default.

## Pull request descriptions

Watanabe and colleagues compared 567 pull requests that Claude Code wrote with
567 that people wrote in the same repositories. [Human descriptions had a
median of 56
words](https://arxiv.org/html/2509.14745v3#:~:text=a%20median%20of%20355%20words%2C%20compared%20to%2056%20words%20in%20HPRs),
against 355 for the agent's. Zhang and colleagues studied 3.3 million pull
requests. In [their model of review
latency](https://zhangxunhui.github.io/files/ESE_2022_zxh.pdf), description
length explained the most variance, and longer descriptions took longer. The authors read the length as a marker of a
complex change, so the result does not show that a shorter description speeds
review. Terse sets 150 words, a convention well above the human median.

## Review comments

Neither the [Microsoft usefulness
study](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/bosu2015useful.pdf)
nor the [Google review case study](https://sback.it/publications/icse2018seip.pdf)
reports the length of a review comment. The three-sentence ceiling is a
convention.

## Commit messages

Git's own documentation sets the subject line. The [git-commit
page](https://git-scm.com/docs/git-commit#:~:text=no%20more%20than%2050%20characters)
advises a first line of "no more than 50 characters", then a blank line and
the body. Wrapping the body at 72 characters appears in neither git document
and is a convention. In one classroom study, students' messages had a [median
of four or five words](https://arxiv.org/pdf/2304.13887), so the body is
optional.

## Slack and chat

Wang and colleagues measured 4,300 channels in one company's Slack. [Messages
averaged 12.8 to 23.0 words](https://arxiv.org/pdf/1906.01756v5) by channel
type, and announcement channels averaged 20.7. Slack publishes no length data.
Terse sets 50 words for a message and 100 for an announcement, as conventions
above that range.

## Text messages

Thurlow collected 544 text messages from 135 students around 2001. The
[messages averaged about 14
words](https://extra.shu.ac.uk/daol/articles/v1/n1/a3/thurlow2002003-04.html#:~:text=the%20average%20length%20of%20text-messages%20was%20approximately%2014)
and 65 characters. The sample is small and dated, and the 160-character limit
shaped it. Terse sets 25 words for a text or a chat direct message.

## Architecture decision records

Michael Nygard introduced the format and [set its
length](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions#:~:text=The%20whole%20document%20should%20be%20one%20or%20two%20pages%20long):
"The whole document should be one or two pages long." That is the
originator's guidance, not a measurement.

## Rejected claims

- The figure of 75 to 100 words and 51% for email circulates on secondary
  sites. It is not on the Boomerang page, so Terse does not use it.
- The Enron email corpus papers give no typical email length.
