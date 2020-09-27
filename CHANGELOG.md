# 0.7.0

## Minor
- Renamed settings:
  - **indenticator.showHighlight** changed to **indenticator.showIndentGuide**
  - **indenticator.inner.showHighlight** changed to **indenticator.inner.showIndentGuide**
- At some point the behaviour for hovers in VS Code changed slightly:

  Now if the hover highlights a code block the content of the hover is shown above or below the highlighted block, rather than at the cursor position. Without highlighting a code block the hover will still be shown at the cursor position.

  To give the user control over how the peek feature should behave when hovering on the indent guides new settings were added:
  - **indenticator.hover.highlight** (default `true`): Controls wether hovering on the indent guide should highlight the code block
  - **indenticator.inner.hover.highlight** (default `true`): Controls wether hovering on the inner indent guide should highlight the code block
- Hovering now works even if the indent guides themselves are disabled
## Patch
- Fixes for #23, #25 & #26
- Dependencies updated

# 0.6.0

## Minor

- Switched default border style from 'solid' to 'inset'
  - With VS Code 1.23.0 there seems to have been a change in the rendering of solid borders that makes them appear thicker than before. To offset that change the default style is now inset which should make the default borders somewhat slimmer again.
- Updated README to reflect recent changes with new buildin active indent guide of VS Code

## Patch
- additional checks before fetching lines from document to fix #20

# 0.5.1

## Path

- Fixed some typos

# 0.5.0

## Minor

- New Setting **indenticator.showHighlight** to toggle the Highlighting of the indent line. (default is `true`)
  - If this setting is `false` the hover options will be ignored
- New Feature: Highlighting for inner indent as suggested in #14
  - highlights the indent guide of the block contained by the current cursor position
  - added settings **indenticator.inner.\*** allowing for all configuration options already present for the standard indent highlight to be configured for the new highlight of the inner indent.
    - To keep the extensions behaviour for existing users **indenticator.inner.showHighlight** defaults to `false`

  ![Indenticator demonstration](img/r0.5.0/example_inner.png)

- Hover-Feature now also highlights the block it peeks around

  ![Indenticator demonstration](img/r0.5.0/example_highlight.png)

- Setting **indenticator.languageSpecific** now allows configuration of multiple languages at once by naming them in a comma seperated list

  Example:
    ``` JS
    {
      "indenticator.languageSpecific": {
        "[json, jsonc]": {
          //...
        },
        "[xml, html, xhtml]": {
          //...
        }
      }
    }
    ```

# 0.4.2

## Patch

- Fixed Issue #6: include first and last line of file in hover

# 0.4.1

## Patch

- Fixed Issue #5: Language specific settings will now be applied correctly

# 0.4.0

## Minor

- More Configuration Options for hover on indent line
  - changed setting **indenticator.showHover** to accept boolean and number. If given a number the hover is active if the current indent block is at list that many lines long. (default is `false`)
  - added setting **indenticator.hover.peekBack** to set the number of lines to be peeked before the current indent block (default is `1`)
  - added setting **indenticator.hover.peekForward** to set the number of lines to be peeked after the current indent block (default is `0`)
  - added setting **indenticator.hover.trimLinesShorterThan** to remove lines at beginning and end of hover if they are shorter then the given value (default is `2`)
  - added setting **indenticator.hover.peekBlockPlaceholder** to set string to be shown between the peeked lines in the hover (default is "`...`")
- Added option to specify language specific configurations
  - added setting **indenticator.languageSpecific** to specify language specific settings (default is `{}`)

    Accepts an object with language keys enclosed in square brackets (analogous to [language specific editor options](https://code.visualstudio.com/docs/getstarted/settings#_language-specific-editor-settings)) as property keys and any set of indenticator configuartion as values.

    Example:
    ``` JS
    {
      "indenticator.languageSpecific": {
        "[json]": {
          "indenticator.showHover": true,
          "indenticator.hover.peekBack": 1
        }
      }
    }
    ```

# 0.3.0

## Minor
- New Feature: Hover on active indent line peeks first line (thanks to [rsbondi](https://github.com/rsbondi) on github)
  - added setting **indenticator.showHover** to activate the new Feature (default is `false`)

## Patch
- Updated project to Typescript 2
- Fixed Travis builds

# 0.2.1

## Patch

- Fixed Issue #1: The Extension will no longer add multiple Information Items into the Statusbar

# 0.2.0

## Minor

- First release to be published to the VS Marketplace