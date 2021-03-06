//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import * as path from "path";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../../src/extension';

let fs = require('fs');


let setEditorContent = (editor: vscode.TextEditor, text: string) => {
    return editor.edit((e) => {
        e.delete(editor.document.validateRange(
            new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE)));
        e.insert(new vscode.Position(0,0), text);
    });
};


suite("Extension Tests", () => {
    let tmpFilePath = path.resolve(__dirname) + "/tmp.txt";
    let document : vscode.TextDocument;

    suiteSetup(() => {
        fs.writeFileSync(tmpFilePath, "foo");
        return vscode.workspace.openTextDocument(tmpFilePath).then(
            (doc) => document = doc
        );
    });

    suiteSetup(() => {
        return vscode.window.showTextDocument(document);
    });

    suiteTeardown(() => {
        let fileStatus = fs.statSync(tmpFilePath);
        if(fileStatus.isFile()) {
            fs.unlinkSync(tmpFilePath);
        }
    });

    // Defines a Mocha unit test
    suite("IndentSpy", () => {
        let IndentSpy : myExtension.IndentSpy;

        setup(() => {
           IndentSpy = new myExtension.IndentSpy();
        });

        suite("_getTabSize", () => {
            let options;
            let initialValues;

            setup(() => {
                options = vscode.window.activeTextEditor.options;
                initialValues = {
                    insertSpaces: options.insertSpaces,
                    tabSize: options.tabSize
                };
            });

            teardown(() => {
                options.insertSpaces = initialValues.insertSpaces;
                options.tabSize = initialValues.tabSize;
            })

            test("returns 1 if insertSpaces option is false", () => {
                options.insertSpaces = false;
                options.tabSize = 5;

                let result = IndentSpy._getTabSize(options);

                assert.strictEqual(result, 1);
            });

            test("returns tabSize if insertSpaces option is true", () => {
                options.insertSpaces = true;
                options.tabSize = 5;

                let result = IndentSpy._getTabSize(options);

                assert.strictEqual(result, 5);
            });
        });

        suite("_getIndentDepth", () => {

            test("returns the quotient of given parameters", () => {
                let index = 12, tabSize = 3;

                let result = IndentSpy._getIndentDepth(index, tabSize);

                assert.strictEqual(result, 4);
            });

            test("always rounds up", () => {
                let index = 11, tabSize = 5;

                let result = IndentSpy._getIndentDepth(index, tabSize);

                assert.strictEqual(result, 3);
            });
        });

        suite("_getLinesIndentDepth", () => {

            let editor : vscode.TextEditor;

            suiteSetup(() => {
                editor = vscode.window.activeTextEditor;
                return setEditorContent(editor, "            test");
            });

            test("returns the quotient of given leading whitespace" +
                 " chararcters and tabSize", () => {

                let line = editor.document.lineAt(0);
                let tabSize = 3;

                let result = IndentSpy._getLinesIndentDepth(
                    line, tabSize);

                assert.strictEqual(result, 4);
            });

            test("always rounds up", () => {
                let line = editor.document.lineAt(0);
                let tabSize = 5;

                let result = IndentSpy._getLinesIndentDepth(line, tabSize);

                assert.strictEqual(result, 3);
            });
        });

        suite("_createIndicatorRange", () => {
            test("creates Range object with start equal to start", () => {
                let result = IndentSpy._createIndicatorRange(3, 4);
                assert.strictEqual(result.start.line, 3);
                assert.strictEqual(result.start.line, result.end.line);
                assert.strictEqual(result.start.character, 4);
                assert.strictEqual(result.start.character, result.end.character);
            });
        });

        suite("_getSelectedIndentDepth", () => {
            let document : vscode.TextDocument, tabSize;

            suiteSetup(() => {
                // set tabSize to 2 with whitespaces
                vscode.window.activeTextEditor.options.insertSpaces = true;
                vscode.window.activeTextEditor.options.tabSize = 2;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.activeTextEditor.options);

                // build stub for TextDocument:
                let editor = vscode.window.activeTextEditor;
                document = editor.document;
                return setEditorContent(editor,
                    "() => {\n" +
                    "  if(foo()) {\n" +
                    "    bar();\n" +
                    "    return;\n" +
                    "  }\n" +
                    "}\n"
                );
            });

            test("returns indent depth of selection start if single line" +
                 " selected and start before first nonwhitespace character",
                 () => {
                    let selection = new vscode.Selection(2, 1, 2, 2);

                    let result = IndentSpy._getSelectedIndentDepth(
                        document, selection, tabSize);

                    assert.strictEqual(result, 1);
                }
            );

            test("returns indent depth of first nonwhitespace character if" +
                 " single line and selections starts after first" +
                 " nonwhitespace character",
                 () => {
                    let selection = new vscode.Selection(2, 6, 2, 7);

                    let result = IndentSpy._getSelectedIndentDepth(
                        document, selection, tabSize);

                    assert.strictEqual(result, 2);
                }
            );

            test("returns lowest indent depth of the first nonwhitespace" +
                 " character of any selected line if multiple are selected" ,
                 () => {
                    let selection = new vscode.Selection(1, 0, 2, 0);

                    let result = IndentSpy._getSelectedIndentDepth(
                        document, selection, tabSize);

                    assert.strictEqual(result, 1);
                }
            );
        });

        suite("_getActiveIndentRanges", () => {
            let document : vscode.TextDocument, tabSize;

            let findRangePredicate = (expected) => {
                return (value, idx, obj) => {
                    return (
                        value.start.line === expected.start.line &&
                        value.start.character == expected.start.character
                    );
                }
            }

            suiteSetup(() => {
                // set tabSize to 2 with whitespaces
                vscode.window.activeTextEditor.options.insertSpaces = true;
                vscode.window.activeTextEditor.options.tabSize = 2;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.activeTextEditor.options);

                let editor = vscode.window.activeTextEditor;
                document = editor.document;
                return setEditorContent(editor,
                    "() => {\n" +
                    "  if(foo()) {\n" +
                    "    bar();\n" +
                    "    bar();\n" +
                    "    return;\n" +
                    "  } else {\n" +
                    "    foo();\n" +
                    "  }\n" +
                    "}\n"
                );
            });

            test("returns a set of ranges for all lines enclosing the" +
                 " selection with the same or higher indent as outer" +
                 " and following line higher indent as inner" +
                 " and updates configs first/last line and indentPos",
                 () => {
                    IndentSpy._innerConf.show = true;
                    let selection = new vscode.Selection(5, 9, 5, 9);
                    let selectedIndent = 1;
                    let result = IndentSpy._getActiveIndentRanges(
                        document, selection, selectedIndent, tabSize);

                    let expectedRanges = [
                        IndentSpy._createIndicatorRange(1, 0),
                        IndentSpy._createIndicatorRange(2, 0),
                        IndentSpy._createIndicatorRange(3, 0),
                        IndentSpy._createIndicatorRange(4, 0),
                        IndentSpy._createIndicatorRange(5, 0),
                        IndentSpy._createIndicatorRange(6, 0),
                        IndentSpy._createIndicatorRange(7, 0),
                    ];
                    let expectedInnerRanges = [
                        IndentSpy._createIndicatorRange(6, tabSize),
                    ];

                    assert.strictEqual(IndentSpy._innerConf.firstLine, 5);
                    assert.strictEqual(IndentSpy._innerConf.lastLine, 7);
                    assert.strictEqual(IndentSpy._innerConf.indentPos, tabSize);

                    assert.strictEqual(IndentSpy._outerConf.firstLine, 0);
                    assert.strictEqual(IndentSpy._outerConf.lastLine, 8);
                    assert.strictEqual(IndentSpy._outerConf.indentPos, 0);

                    assert.strictEqual(result.outer.length, expectedRanges.length);
                    assert.strictEqual(result.inner.length, expectedInnerRanges.length);
                    for(let i = 0; i < expectedRanges.length; i++) {
                        assert(result.outer.find(findRangePredicate(expectedRanges[i])),
                               `(${expectedRanges[i].start.line}, ${expectedRanges[i].start.character})`);
                    }
                    for(let i = 0; i < expectedInnerRanges.length; i++) {
                        assert(result.inner.find(findRangePredicate(expectedInnerRanges[i])),
                               `(${expectedInnerRanges[i].start.line}, ${expectedInnerRanges[i].start.character})`);
                    }
                }
            );

            test("returns a set of ranges for all lines enclosing the" +
                 " selection with the same or higher indent stopping at lower" +
                 " indets as outer",
                 () => {
                    IndentSpy._innerConf.show = true;
                    let selection = new vscode.Selection(3, 6, 3, 6);
                    let selectedIndent = 2;
                    let result = IndentSpy._getActiveIndentRanges(
                        document, selection, selectedIndent, tabSize);

                    let expectedRanges = [
                        IndentSpy._createIndicatorRange(2, tabSize),
                        IndentSpy._createIndicatorRange(3, tabSize),
                        IndentSpy._createIndicatorRange(4, tabSize),
                    ];

                    assert.strictEqual(IndentSpy._outerConf.firstLine, 1);
                    assert.strictEqual(IndentSpy._outerConf.lastLine, 5);
                    assert.strictEqual(IndentSpy._outerConf.indentPos, 2);

                    assert.strictEqual(result.outer.length, expectedRanges.length);
                    assert.strictEqual(result.inner.length, 0);

                    for(let i = 0; i < expectedRanges.length; i++) {
                        assert(result.outer.find(findRangePredicate(expectedRanges[i])),
                               `(${expectedRanges[i].start.line}, ${expectedRanges[i].start.character}) not in generated ranges`);
                    }
                }
            );

            test("returns a set of ranges for all lines enclosing the" +
                 " selection with the same or higher indent as outer" +
                 " and the same ident as inner stopping on lower indent",
                 () => {
                    IndentSpy._innerConf.show = true;
                    let selection = new vscode.Selection(3, 2, 3, 2);
                    let selectedIndent = 1;
                    let result = IndentSpy._getActiveIndentRanges(
                        document, selection, selectedIndent, tabSize);

                    let expectedRanges = [
                        IndentSpy._createIndicatorRange(1, 0),
                        IndentSpy._createIndicatorRange(2, 0),
                        IndentSpy._createIndicatorRange(3, 0),
                        IndentSpy._createIndicatorRange(4, 0),
                        IndentSpy._createIndicatorRange(5, 0),
                        IndentSpy._createIndicatorRange(6, 0),
                        IndentSpy._createIndicatorRange(7, 0)
                    ];
                    let expectedInnerRanges = [
                        IndentSpy._createIndicatorRange(2, tabSize),
                        IndentSpy._createIndicatorRange(3, tabSize),
                        IndentSpy._createIndicatorRange(4, tabSize),
                    ];

                    assert.strictEqual(IndentSpy._innerConf.firstLine, 1);
                    assert.strictEqual(IndentSpy._innerConf.lastLine, 5);
                    assert.strictEqual(IndentSpy._innerConf.indentPos, tabSize);

                    assert.strictEqual(IndentSpy._outerConf.firstLine, 0);
                    assert.strictEqual(IndentSpy._outerConf.lastLine, 8);
                    assert.strictEqual(IndentSpy._outerConf.indentPos, 0);

                    assert.strictEqual(result.outer.length, expectedRanges.length);
                    assert.strictEqual(result.inner.length, expectedInnerRanges.length);
                    for(let i = 0; i < expectedRanges.length; i++) {
                        assert(result.outer.find(findRangePredicate(expectedRanges[i])),
                               `(${expectedRanges[i].start.line}, ${expectedRanges[i].start.character})`);
                    }
                    for(let i = 0; i < expectedInnerRanges.length; i++) {
                        assert(result.inner.find(findRangePredicate(expectedInnerRanges[i])),
                               `(${expectedInnerRanges[i].start.line}, ${expectedInnerRanges[i].start.character})`);
                    }
                }
            );

            test("does return a set of ranges for inner even if disabled" +
                 " to enable peeking",
                 () => {
                    IndentSpy._innerConf.show = false;
                    IndentSpy._outerConf.show = true;
                    let selection = new vscode.Selection(3, 2, 3, 2);
                    let selectedIndent = 1;
                    let result = IndentSpy._getActiveIndentRanges(
                        document, selection, selectedIndent, tabSize);

                    let expectedRanges = [
                        IndentSpy._createIndicatorRange(1, 0),
                        IndentSpy._createIndicatorRange(2, 0),
                        IndentSpy._createIndicatorRange(3, 0),
                        IndentSpy._createIndicatorRange(4, 0),
                        IndentSpy._createIndicatorRange(5, 0),
                        IndentSpy._createIndicatorRange(6, 0),
                        IndentSpy._createIndicatorRange(7, 0)
                    ];
                    let expectedInnerRanges = [
                        IndentSpy._createIndicatorRange(2, tabSize),
                        IndentSpy._createIndicatorRange(3, tabSize),
                        IndentSpy._createIndicatorRange(4, tabSize),];

                    assert.strictEqual(IndentSpy._outerConf.firstLine, 0);
                    assert.strictEqual(IndentSpy._outerConf.lastLine, 8);
                    assert.strictEqual(IndentSpy._outerConf.indentPos, 0);

                    assert.strictEqual(result.outer.length, expectedRanges.length);
                    assert.strictEqual(result.inner.length, expectedInnerRanges.length);
                    for(let i = 0; i < expectedRanges.length; i++) {
                        assert(result.outer.find(findRangePredicate(expectedRanges[i])),
                               `(${expectedRanges[i].start.line}, ${expectedRanges[i].start.character})`);
                    }
                }
            );

            test("does return a set of ranges for outer even if disabled" +
                 " to enable peeking",
                 () => {
                    IndentSpy._innerConf.show = true;
                    IndentSpy._outerConf.show = false;
                    let selection = new vscode.Selection(3, 2, 3, 2);
                    let selectedIndent = 1;
                    let result = IndentSpy._getActiveIndentRanges(
                        document, selection, selectedIndent, tabSize);

                    let expectedRanges = [
                        IndentSpy._createIndicatorRange(1, 0),
                        IndentSpy._createIndicatorRange(2, 0),
                        IndentSpy._createIndicatorRange(3, 0),
                        IndentSpy._createIndicatorRange(4, 0),
                        IndentSpy._createIndicatorRange(5, 0),
                        IndentSpy._createIndicatorRange(6, 0),
                        IndentSpy._createIndicatorRange(7, 0)
                    ];
                    let expectedInnerRanges = [
                        IndentSpy._createIndicatorRange(2, tabSize),
                        IndentSpy._createIndicatorRange(3, tabSize),
                        IndentSpy._createIndicatorRange(4, tabSize),
                    ];

                    assert.strictEqual(IndentSpy._innerConf.firstLine, 1);
                    assert.strictEqual(IndentSpy._innerConf.lastLine, 5);
                    assert.strictEqual(IndentSpy._innerConf.indentPos, tabSize);

                    assert.strictEqual(result.outer.length, expectedRanges.length);
                    assert.strictEqual(result.inner.length, expectedInnerRanges.length);
                    for(let i = 0; i < expectedInnerRanges.length; i++) {
                        assert(result.inner.find(findRangePredicate(expectedInnerRanges[i])),
                                `(${expectedInnerRanges[i].start.line}, ${expectedInnerRanges[i].start.character})`);
                    }
                }
            );

            test("does return all ranges evem if both disabled",
                 () => {
                    IndentSpy._innerConf.show = false;
                    IndentSpy._outerConf.show = false;
                    let selection = new vscode.Selection(3, 2, 3, 2);
                    let selectedIndent = 1;
                    let result = IndentSpy._getActiveIndentRanges(
                        document, selection, selectedIndent, tabSize);

                    let expectedRanges = [
                        IndentSpy._createIndicatorRange(1, 0),
                        IndentSpy._createIndicatorRange(2, 0),
                        IndentSpy._createIndicatorRange(3, 0),
                        IndentSpy._createIndicatorRange(4, 0),
                        IndentSpy._createIndicatorRange(5, 0),
                        IndentSpy._createIndicatorRange(6, 0),
                        IndentSpy._createIndicatorRange(7, 0)
                    ];
                    let expectedInnerRanges = [
                        IndentSpy._createIndicatorRange(2, tabSize),
                        IndentSpy._createIndicatorRange(3, tabSize),
                        IndentSpy._createIndicatorRange(4, tabSize),
                    ];

                    assert.strictEqual(result.outer.length, expectedRanges.length);
                    assert.strictEqual(result.inner.length, expectedInnerRanges.length);
                }
            );
        });

        suite("_peekBack", () => {
            let editor : vscode.TextEditor, tabSize;

            suiteSetup(() => {
                // set tabSize to 2 with whitespaces
                vscode.window.activeTextEditor.options.insertSpaces = true;
                vscode.window.activeTextEditor.options.tabSize = 2;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.activeTextEditor.options);

                editor = vscode.window.activeTextEditor;
                return setEditorContent(editor,
                    "() => {\n" +
                    "  //foo?\n" +
                    "  //\n" +
                    "  foo();\n" +
                    "  if(foo()) {\n" +
                    "    bar();\n" +
                    "    return;\n" +
                    "  } else {\n" +
                    "    foo();\n" +
                    "  }\n" +
                    "}\n"
                );
            });

            setup(() => {
                IndentSpy._outerConf.hoverConf = {
                    highlight: true,
                    peekBack: 3,
                    peekForward: 0,
                    trimLinesShorterThan: 2,
                    peekBlockPlaceholder: '...'
                };
                IndentSpy._outerConf.firstLine = 4;
                IndentSpy._outerConf.lastLine = 7;
                IndentSpy._outerConf.indentPos = 4;
            })

            test("returns empty list if peekBack is lower than 1",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekBack = -1;
                    let lines = IndentSpy._peekBack(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 0);
                 });
            test("reutrns a list containing the configured number of" +
                 " lines from before the currently active indent block and" +
                 " trims their leading whitespace characters",
                 () => {
                    let lines = IndentSpy._peekBack(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 3);
                    assert.strictEqual(lines[0], "//");
                    assert.strictEqual(lines[1], "foo();");
                    assert.strictEqual(lines[2], "if(foo()) {");
                 });
            test("peeks at maximum the confgiured number of lines",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekBack = 1;
                    let lines = IndentSpy._peekBack(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 1);
                    assert.strictEqual(lines[0], "if(foo()) {");
                 });
            test("stops at changing indent depth",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekBack = 5;
                    let lines = IndentSpy._peekBack(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 4);
                    assert.strictEqual(lines[0], "//foo?");
                    assert.strictEqual(lines[1], "//");
                    assert.strictEqual(lines[2], "foo();");
                    assert.strictEqual(lines[3], "if(foo()) {");
                 });
            test("trims lines shorter than configured value",
                 () => {
                    IndentSpy._outerConf.hoverConf.trimLinesShorterThan = 3;
                    let lines = IndentSpy._peekBack(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 2);
                    assert.strictEqual(lines[0], "foo();");
                    assert.strictEqual(lines[1], "if(foo()) {");
                 });
            test("doesn't trim lines shorter than configured value if" +
                 " another before line is already peeked",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekBack = 4;
                    IndentSpy._outerConf.hoverConf.trimLinesShorterThan = 4;
                    let lines = IndentSpy._peekBack(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 4);
                    assert.strictEqual(lines[0], "//foo?");
                    assert.strictEqual(lines[1], "//");
                    assert.strictEqual(lines[2], "foo();");
                    assert.strictEqual(lines[3], "if(foo()) {");
                 });
            test("includes first line of file (issue #6)",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekBack = 1;
                    IndentSpy._outerConf.firstLine = 0;
                    let lines = IndentSpy._peekBack(editor.document, 2, 0, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 1);
                    assert.strictEqual(lines[0], "() => {");
                 });
        });

        suite("_peekForward", () => {
            let editor : vscode.TextEditor, tabSize;

            suiteSetup(() => {
                // set tabSize to 2 with whitespaces
                vscode.window.activeTextEditor.options.insertSpaces = true;
                vscode.window.activeTextEditor.options.tabSize = 2;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.activeTextEditor.options);

                editor = vscode.window.activeTextEditor;
                return setEditorContent(editor,
                    "() => {\n" +
                    "  if(foo()) {\n" +
                    "    bar();\n" +
                    "    return;\n" +
                    "  }\n" +
                    "  //foo?\n" +
                    "  //\n" +
                    "  foo();\n" +
                    "}\n"
                );
            });

            setup(() => {
                IndentSpy._outerConf.hoverConf = {
                    highlight: true,
                    peekBack: 0,
                    peekForward: 3,
                    trimLinesShorterThan: 2,
                    peekBlockPlaceholder: '...'
                };
                IndentSpy._outerConf.firstLine = 1;
                IndentSpy._outerConf.lastLine = 4;
                IndentSpy._outerConf.indentPos = 4
            })

            test("returns empty list if peekForward is lower than 1",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekForward = -1;
                    let lines = IndentSpy._peekForward(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 0);
                 });
            test("reutrns a list containing the configured number of" +
                 " lines from after the currently active indent block in " +
                 " reverse order and trims their leading whitespace characters",
                 () => {
                    let lines = IndentSpy._peekForward(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 3);
                    assert.strictEqual(lines[0], "}");
                    assert.strictEqual(lines[1], "//foo?");
                    assert.strictEqual(lines[2], "//");
                 });
            test("peeks at maximum the confgiured number of lines",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekForward = 2;
                    let lines = IndentSpy._peekForward(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 2);
                    assert.strictEqual(lines[0], "}");
                    assert.strictEqual(lines[1], "//foo?");
                 });
            test("stops at changing indent depth",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekForward = 5;
                    let lines = IndentSpy._peekForward(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 4);
                    assert.strictEqual(lines[0], "}");
                    assert.strictEqual(lines[1], "//foo?");
                    assert.strictEqual(lines[2], "//");
                    assert.strictEqual(lines[3], "foo();");
                 });
            test("trims lines shorter than configured value",
                 () => {
                    IndentSpy._outerConf.hoverConf.trimLinesShorterThan = 3;
                    let lines = IndentSpy._peekForward(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 2);
                    assert.strictEqual(lines[0], "}");
                    assert.strictEqual(lines[1], "//foo?");
                 });
            test("doesn't trim lines shorter than configured value if" +
                 " another before line is already peeked",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekForward = 4;
                    IndentSpy._outerConf.hoverConf.trimLinesShorterThan = 4;
                    let lines = IndentSpy._peekForward(editor.document, 2, 1, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 4);
                    assert.strictEqual(lines[0], "}");
                    assert.strictEqual(lines[1], "//foo?");
                    assert.strictEqual(lines[2], "//");
                    assert.strictEqual(lines[3], "foo();");
                 });
            test("includes last line of file (issue #6)",
                 () => {
                    IndentSpy._outerConf.hoverConf.peekForward = 1;
                    IndentSpy._outerConf.hoverConf.trimLinesShorterThan = 0;
                    IndentSpy._outerConf.firstLine = 0;
                    IndentSpy._outerConf.lastLine = 8;
                    let lines = IndentSpy._peekForward(editor.document, 2, 0, IndentSpy._outerConf);
                    assert.strictEqual(lines.length, 1);
                    assert.strictEqual(lines[0], "}");
                 });
        });

        suite("_buildHoverPlaceholder", () => {
            let editor : vscode.TextEditor, tabSize;

            suiteSetup(() => {
                editor = vscode.window.activeTextEditor;
            });

            setup(() => {
                IndentSpy._outerConf.hoverConf = {
                    highlight: true,
                    peekBack: 0,
                    peekForward: 3,
                    trimLinesShorterThan: 2,
                    peekBlockPlaceholder: '...'
                };
            })

            test("returns string with configured peekBlockPlaceholder" +
                 " with one indent placed before",() => {
                editor.options.insertSpaces = true;
                editor.options.tabSize = 2;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.activeTextEditor.options);
                IndentSpy._outerConf.hoverConf.peekBlockPlaceholder = 'foo!';
                let result = IndentSpy._buildHoverPlaceholder(editor, tabSize, IndentSpy._outerConf);
                assert.strictEqual(result, "  foo!");
            });

            test("uses configured indent",() => {
                editor.options.insertSpaces = false;
                editor.options.tabSize = 3;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.activeTextEditor.options);
                IndentSpy._outerConf.hoverConf.peekBlockPlaceholder = 'bar!';
                let result = IndentSpy._buildHoverPlaceholder(editor, tabSize, IndentSpy._outerConf);
                assert.strictEqual(result, "\tbar!");
            });
        });

        suite("_buildHoverString", () => {
            let editor : vscode.TextEditor, tabSize;

            suiteSetup(() => {
                // set tabSize to 2 with whitespaces
                vscode.window.activeTextEditor.options.insertSpaces = true;
                vscode.window.activeTextEditor.options.tabSize = 2;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.activeTextEditor.options);

                editor = vscode.window.activeTextEditor;
                return setEditorContent(editor,
                    "() => {\n" +
                    "  //foo?\n" +
                    "  //\n" +
                    "  foo();\n" +
                    "  if(foo()) {\n" +
                    "    bar();\n" +
                    "    return;\n" +
                    "  }\n" +
                    "  //foo?\n" +
                    "  //\n" +
                    "  foo();\n" +
                    "}\n"
                );
            });

            setup(() => {
                IndentSpy._outerConf.hoverConf = {
                    highlight: true,
                    peekBack: 3,
                    peekForward: 3,
                    trimLinesShorterThan: 3,
                    peekBlockPlaceholder: '// my indent block'
                };
                IndentSpy._outerConf.firstLine = 4;
                IndentSpy._outerConf.lastLine = 7;
                IndentSpy._outerConf.indentPos = 4;
            })

            test("returns a block using the configured peek options",
                 () => {
                    let block = IndentSpy._buildHoverString(editor, tabSize, IndentSpy._outerConf);
                    assert.strictEqual(
                        block,
                        "foo();\n" +
                        "if(foo()) {\n" +
                        "  // my indent block\n" +
                        "}\n" +
                        "//foo?"
                    );
                 });
        });
    });
});