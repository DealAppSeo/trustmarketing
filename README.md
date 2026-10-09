# trustmarketing

Static pages only.

- `/`
- `/clients`
- `/cmo`
- `/methods`
- `/methods/video-social`
- `/video`
- `/belt`
- `/start`

No account. No form. No wallet. No video file. A belt row with no link prints `NOT_CHECKED`. A name on `/methods` is a method.

## Video social

`/video` is a motion page: CSS keyframes and inline SVG, sixteen seconds, 9:16. It has no script, loads nothing from outside this site, and no video file is committed here. A motion page is a static page, so this does not break "static pages only".

A person screen-records it. The recording stays on that person's machine. Nothing in this repo hosts, renders, schedules or posts it, and no clip made this way has been posted from here, so there is no result to report.

`/methods/video-social` lists the steps and who does each one: motion page, caption draft on a free-tier model, `trustshell verify`, screen recording, a person reads the cut, a person schedules it in a free social tier. Its rows are on `/belt` under the same rule: a row with no link prints `NOT_CHECKED`, and some of these rows have no link.

The receipt line on `/video` ships as `NOT_CHECKED`, because nobody has run the verify command for that cut. The test fails if a made-up line is committed in its place.

Check the pages with `node tests/pages.test.mjs`. The belt tests and the no-auto-install-or-partner test are separate files in `tests/`.
