# 0.4.1

## Patch

- Fixed Issue #5: Language specific settings will now be applied correctly

# 0.4.0

## Minor

- More Configuration Options for hover on indent line
  - Changed setting **indenticator.showHover** to accept boolean and number. If given a number the hover is active if the current indent block is at list that many lines long. (default is `false`)
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