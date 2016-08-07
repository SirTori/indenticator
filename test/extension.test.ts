//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../src/extension';


let setEditorContent = (editor: vscode.TextEditor, text: string) => {
    return editor.edit((e) => {
        e.delete(editor.document.validateRange(
            new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE)));
        e.insert(new vscode.Position(0,0), text);
    });
};


suite("Extension Tests", () => {

    // Defines a Mocha unit test
    suite("IndentSpy", () => {
        let IndentSpy;

        setup(() => {
           IndentSpy = new myExtension.IndentSpy();
        });

        suite("_getTabSize", () => {
            let options;
            let initialValues;

            setup(() => {
                options = vscode.window.visibleTextEditors[0].options;
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

                assert.equal(result, 1);
            });

            test("returns tabSize if insertSpaces option is true", () => {
                options.insertSpaces = true;
                options.tabSize = 5;

                let result = IndentSpy._getTabSize(options);

                assert.equal(result, 5);
            });
        });

        suite("_getIndentDepth", () => {

            test("returns the quotient of given parameters", () => {
                let index = 12, tabSize = 3;

                let result = IndentSpy._getIndentDepth(index, tabSize);

                assert.equal(result, 4);
            });

            test("always rounds up", () => {
                let index = 11, tabSize = 5;

                let result = IndentSpy._getIndentDepth(index, tabSize);

                assert.equal(result, 3);
            });
        });

        suite("_getLinesIndentDepth", () => {

            let editor;

            suiteSetup(() => {
                editor = vscode.window.visibleTextEditors[0];
                return setEditorContent(editor, "            test");
            });

            test("returns the quotient of given leading whitespace" +
                 " chararcters and tabSize", () => {

                let line = editor.document.lineAt(0);
                let tabSize = 3;

                let result = IndentSpy._getLinesIndentDepth(
                    line, tabSize);

                assert.equal(result, 4);
            });

            test("always rounds up", () => {
                let line = editor.document.lineAt(0);
                let tabSize = 5;

                let result = IndentSpy._getLinesIndentDepth(line, tabSize);

                assert.equal(result, 3);
            });
        });

        suite("_createIndicatorRange", () => {
            test("creates Range object with start equal to start", () => {
                let result = IndentSpy._createIndicatorRange(3, 4);
                assert.equal(result.start.line, 3);
                assert.equal(result.start.line, result.end.line);
                assert.equal(result.start.character, 4);
                assert.equal(result.start.character, result.end.character);
            });
        });

        suite("_getSelectedIndentDepth", () => {
            let document, tabSize;

            suiteSetup(() => {
                // set tabSize to 2 with whitespaces
                vscode.window.visibleTextEditors[0].options.insertSpaces = true;
                vscode.window.visibleTextEditors[0].options.tabSize = 2;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.visibleTextEditors[0].options);

                // build stub for TextDocument:
                let editor = vscode.window.visibleTextEditors[0];
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

                    assert.equal(result, 1);
                }
            );

            test("returns indent depth of first nonwhitespace character if" +
                 " single line and selections starts after first" +
                 " nonwhitespace character",
                 () => {
                    let selection = new vscode.Selection(2, 6, 2, 7);

                    let result = IndentSpy._getSelectedIndentDepth(
                        document, selection, tabSize);

                    assert.equal(result, 2);
                }
            );

            test("returns lowest indent depth of the first nonwhitespace" +
                 " character of any selected line if multiple are selected" ,
                 () => {
                    let selection = new vscode.Selection(1, 0, 2, 0);

                    let result = IndentSpy._getSelectedIndentDepth(
                        document, selection, tabSize);

                    assert.equal(result, 1);
                }
            );
        });

        suite("_getActiveIndentRanges", () => {
            let document, tabSize;

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
                vscode.window.visibleTextEditors[0].options.insertSpaces = true;
                vscode.window.visibleTextEditors[0].options.tabSize = 2;
                tabSize = IndentSpy._getTabSize(
                    vscode.window.visibleTextEditors[0].options);

                let editor = vscode.window.visibleTextEditors[0];
                document = editor.document;
                return setEditorContent(editor,
                    "() => {\n" +
                    "  if(foo()) {\n" +
                    "    bar();\n" +
                    "    return;\n" +
                    "  } else {\n" +
                    "    foo();\n" +
                    "  }\n" +
                    "}\n"
                );
            });

            test("returns a set of ranges for all lines enclosing the" +
                 " selection with the same or higher indent",
                 () => {
                    let selection = new vscode.Selection(4, 9, 4, 9);
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
                    ]
                    assert.equal(result.length, expectedRanges.length);

                    for(let i = 0; i < expectedRanges.length; i++) {
                        assert(result.find(findRangePredicate(expectedRanges[i])),
                               `(${expectedRanges[i].start.line}, ${expectedRanges[i].start.character})`);
                    }
                }
            );

            test("returns a set of ranges for all lines enclosing the" +
                 " selection with the same or higher indent stopping at lower" +
                 " indets",
                 () => {
                    let selection = new vscode.Selection(3, 6, 3, 6);
                    let selectedIndent = 2;
                    let result = IndentSpy._getActiveIndentRanges(
                        document, selection, selectedIndent, tabSize);

                    let expectedRanges = [
                        IndentSpy._createIndicatorRange(2, tabSize),
                        IndentSpy._createIndicatorRange(3, tabSize),
                    ]
                    assert.equal(result.length, expectedRanges.length);

                    for(let i = 0; i < expectedRanges.length; i++) {
                        assert(result.find(findRangePredicate(expectedRanges[i])),
                               `(${expectedRanges[i].start.line}, ${expectedRanges[i].start.character}) not in generated ranges`);
                    }
                }
            );

        });
    });
});