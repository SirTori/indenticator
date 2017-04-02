[![Build Status](https://travis-ci.org/SirTori/indenticator.svg?branch=master)](https://travis-ci.org/SirTori/indenticator)

# Changes in 0.3.0

* New Feature: Hover on active indent line peeks first line (thanks to [rsbondi](https://github.com/rsbondi) on github)
  * New Setting **indenticator.showHover** to activate the new Feature (default is `false`)

# Indenticator

Visually highlights the current indent depth.

Can be used by itself, but it's recommended to use it alongside the builtin indent guides.

![Indenticator demonstration](img/demo.gif)

## Settings
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
    "Wether to display the hover near the indent line"
    "indenticator.showHover": false
}
```