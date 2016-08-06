'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, TextEditor, TextEditorOptions, TextEditorDecorationType, TextLine, Selection, Range, Position} from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    let indentSpy = new IndentSpy();
    let indentSpyController = new IndentSpyController(indentSpy);

    context.subscriptions.push(indentSpy);
    context.subscriptions.push(indentSpyController);
}

// this method is called when your extension is deactivated
export function deactivate() {
}


export class IndentSpy {
    private _statusBarItem: StatusBarItem;
    private _indicatorStyle: TextEditorDecorationType;
    private _indicatorActiveStyle: TextEditorDecorationType;

    constructor() {
        this._indicatorActiveStyle = window.createTextEditorDecorationType({
            dark: {
                borderColor: '#888',
                borderStyle: 'solid',
                borderWidth: '1px',
            },
            light: {
                borderColor: '#999',
                borderStyle: 'solid',
                borderWidth: '1px',
            }
        });
        this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    }

    public updateCurrentIndent() {

        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let document = editor.document;
        if (!document) {
            this._statusBarItem.hide();
            return;
        }

        let selection = editor.selection;
        if (!selection) {
            this._statusBarItem.hide();
            return;
        }


        let tabSize = this._getTabSize(editor.options);
        let selectedIndent = this._getSelectedIndentDepth(document, selection, tabSize);

        let activeIndentRanges = this._getActiveIndentRanges(document, selection, selectedIndent, tabSize)

        editor.setDecorations(this._indicatorActiveStyle, activeIndentRanges);

        this._statusBarItem.text = `Indent Depth ${selectedIndent}`
        this._statusBarItem.show();
    }

    _getIndentDepth(index: number, tabSize: number) {
        return Math.ceil(index / tabSize);
    }

    _getLinesIndentDepth(line: TextLine, tabSize: number) {
        return this._getIndentDepth(line.firstNonWhitespaceCharacterIndex,
                                    tabSize);
    }

    _getSelectedIndentDepth(document: TextDocument, selection: Selection,
                            tabSize: number) {
        let selectedIndent = Number.MAX_VALUE;
        if(selection.isSingleLine) {
            let line = document.lineAt(selection.start.line);
            return this._getIndentDepth(
                Math.min(selection.start.character,
                         line.firstNonWhitespaceCharacterIndex),
                tabSize);
        }
        for(let i = selection.start.line; i <= selection.end.line; i++) {
            let line = document.lineAt(i);
            if(line.isEmptyOrWhitespace) {
                continue;
            }
            selectedIndent = Math.min(selectedIndent,
                                      this._getLinesIndentDepth(line, tabSize));
        }
        return selectedIndent;
    }

    _getTabSize(options: TextEditorOptions) {
        return options.insertSpaces?Number(options.tabSize):1;
    }

    _getDefaultIndentRanges(document: TextDocument, tabSize: number) {
        let ranges = [];
        for(let i = 0; i < document.lineCount;i++) {
            let firstNonWhitespace = document.lineAt(i).firstNonWhitespaceCharacterIndex;
            for(let j = tabSize; j < firstNonWhitespace; j += tabSize){
                ranges.push(this._createIndicatorRange(i, j));
            }
        }
        return ranges;
    }

    _getActiveIndentRanges(document: TextDocument, selection: Selection, selectedIndent: number, tabSize: number) {
        if(selectedIndent == 0) {
            return [];
        }
        let selectedIndentPos = (selectedIndent - 1) * tabSize;
        let activeRanges = [];
        // add ranges for selected block
        for(let i = selection.start.line; i <= selection.end.line; i++) {
            let line = document.lineAt(i);
            activeRanges.push(this._createIndicatorRange(i, selectedIndentPos));
        }
        // add ranges for preceeding lines on same indent
        for(let i = selection.start.line-1; i >= 0; i--) {
            let line = document.lineAt(i);
            let lineIndent = this._getLinesIndentDepth(line, tabSize);
            if(lineIndent >= selectedIndent || (line.isEmptyOrWhitespace && selectedIndent == 1)) {
                activeRanges.push(this._createIndicatorRange(i, selectedIndentPos));
            } else if(!line.isEmptyOrWhitespace) {
                break;
            }
        }
        // add ranges for following lines on same indent
        for(let i = selection.end.line+1; i < document.lineCount; i++) {
            let line = document.lineAt(i);
            let lineIndent = this._getLinesIndentDepth(line, tabSize);
            if(lineIndent >= selectedIndent || (line.isEmptyOrWhitespace && selectedIndent == 1)) {
                activeRanges.push(this._createIndicatorRange(i, selectedIndentPos));
            } else if(!line.isEmptyOrWhitespace) {
                break;
            }
        }
        return activeRanges;
    }

    _createIndicatorRange(line: number, character: number) {
        return new Range(new Position(line, character),
                         new Position(line, character));
    }

    dispose() {
        this._statusBarItem.dispose();
    }
}

class IndentSpyController {

    private _indentSpy: IndentSpy;
    private _disposable: Disposable;

    constructor(indentSpy: IndentSpy) {
        this._indentSpy = indentSpy;
        this._indentSpy.updateCurrentIndent();

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    private _onEvent(e) {
        this._indentSpy.updateCurrentIndent();
    }
}