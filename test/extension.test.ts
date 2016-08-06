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

import * as stubs from './stubs';



// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", () => {

    // Defines a Mocha unit test
    suite("IndentSpy", () => {
        let IndentSpy;

        setup(() => {
           IndentSpy = new myExtension.IndentSpy();
        });

        suite("_getLinesIndentDepth", () => {
            let line;

            setup(() => {
                line = new stubs.TextLine();
            });

            test("returns the quotient of given parameters", () => {
                line.firstNonWhitespaceCharacterIndex = 12;
                let tabSize = 3;

                let result = IndentSpy._getLinesIndentDepth(line, tabSize);

                assert.equal(result, 4);
            });

            test("always rounds up", () => {
                line.firstNonWhitespaceCharacterIndex = 11;
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
    });
});