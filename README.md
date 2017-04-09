[![Build Status](https://travis-ci.org/SirTori/indenticator.svg?branch=master)](https://travis-ci.org/SirTori/indenticator)

# Indenticator

Visually highlights the current indent depth.

Can be used by itself, but it's recommended to use it alongside the builtin indent guides.

## Feature Highlights

- **Language specific settings**: The extension can be configured for each language separately to accommondate the requirements of different coding styles.

- **Peeking around the current indent block**: *Optionally* a hover can be added on the current indent marker to peek before and/or after the current indent block.

- **Highlight Styling**: The highlighting can be styled by defining color, width and border style.


![Indenticator demonstration](img/demo.gif)

## Settings and defaults
``` JS
{
    /* Color of the indent marker for dark themes */
    "indenticator.color.dark": "#888",
    /* Color of the indent marker for light themes */
    "indenticator.color.light": "#999",
    /* Width of the indent marker in pixels */
    "indenticator.width": 1,
    /* Line style of the indent marker (e.g. "solid", "dashed", "dotted", ...) */
    "indenticator.style": "solid",
    /* Wether to displays the current indent depth on the statusbar */
    "indenticator.showCurrentDepthInStatusBar": true,
    /* Wether to display the hover near the indent line */
    "indenticator.showHover": false,
    /* Lines before the current indent to be shown on hover */
    "indenticator.hover.peekBack": 1,
    /* Lines after the current indent to be shown on hover */
    "indenticator.hover.peekForward": 0,
    /* Remove lines from the hover at the beginning and end that have less characters than this */
    "indenticator.hover.trimLinesShorterThan": 2,
    /* Block placeholder to be written between peeked lines */
    "indenticator.hover.peekBlockPlaceholder"; "...",
    /* A construct with language identifiers as properties containing a subset of indenticator options to be applied to that language */
    "indenticator.languageSpecific": {}
}
```
### Remarks

- **indenticator.languageSpecific**: The language identifier can be viewed by using [VS Codes language selection](https://code.visualstudio.com/docs/languages/overview#_language-id) in the statusbar. To be analogous to [language specific editor options](https://code.visualstudio.com/docs/getstarted/settings#_language-specific-editor-settings) of VS Code the key has to be put between square brackets.

  Any setting for indenticator that can be set normally, can also be set for the language specific configuration. If any setting is not set for the specific language the overall configuration will be used.

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