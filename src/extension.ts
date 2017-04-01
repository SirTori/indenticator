'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment,
        StatusBarItem, TextDocument, TextEditor, TextEditorOptions,
        TextEditorDecorationType, TextLine, Selection, Range,
        Position, workspace, env, languages} from 'vscode';

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
    _locales: Object;
    _currentLocale: Object;
    _statusBarItem: StatusBarItem;
    _indicatorStyle: TextEditorDecorationType;
    _firstLine: number;
    _hoverProvider: Disposable;
    _rangeAtThisLineMaker: Range;

    constructor() {
        this._locales = {
            en: {statusText: `Indents: {indent}`,
                 statusTooltip: `current indent depth: {indent}`},
            de: {statusText: `Einzüge: {indent}`,
                 statusTooltip: `aktuelle Einzugtiefe: {indent}`},
            default: {statusText: `Indents: {indent}`,
                      statusTooltip: `current indent depth: {indent}`},
        };
        this.updateConfig();
    }

    public updateConfig() {
        this._clearDecorators();
        let config = workspace.getConfiguration('indenticator');
        let locale = env.language;
        let multipartLocale = env.language.indexOf('-');
        if(multipartLocale >= 0) {
            locale = locale.substring(0, multipartLocale);
        }

        if(!this._locales[locale]) {
            this._currentLocale = this._locales['default'];
        } else {
            this._currentLocale = this._locales[locale];
        }

        this._indicatorStyle = window.createTextEditorDecorationType({
            dark: {
                borderColor: config.get('color.dark', '#888'),
                borderStyle: config.get('style', 'solid'),
                borderWidth: config.get('width', 1) + "px"
            },
            light: {
                borderColor: config.get('color.light', '#999'),
                borderStyle: config.get('style', 'solid'),
                borderWidth: config.get('width', 1) + "px"
            }
        });
        if(config.get('showCurrentDepthInStatusBar', true)) {
            if(!this._statusBarItem) {
                this._statusBarItem = window.createStatusBarItem(
                    StatusBarAlignment.Right, 100);
            }
        } else if(this._statusBarItem) {
            this._statusBarItem.dispose();
            this._statusBarItem = undefined;
        }
        this.updateCurrentIndent();
    }

    public updateCurrentIndent() {
        let hideStatusbarIfPossible = () => {
            if(this._statusBarItem) {
                this._statusBarItem.hide();
            }
        }

        let editor = window.activeTextEditor;
        if (!editor) {
            hideStatusbarIfPossible();
            return;
        }

        let document = editor.document;
        if (!document) {
            hideStatusbarIfPossible();
            return;
        }

        let selection = editor.selection;
        if (!selection) {
            hideStatusbarIfPossible();
            return;
        }


        let tabSize = this._getTabSize(editor.options);
        let selectedIndent = this._getSelectedIndentDepth(document,
                                                          selection,
                                                          tabSize);

        let activeIndentRanges = this._getActiveIndentRanges(document,
                                                             selection,
                                                             selectedIndent,
                                                             tabSize)

        if (this._hoverProvider) this._hoverProvider.dispose();
        this._hoverProvider = languages.registerHoverProvider(editor.document.languageId, {
            provideHover: (doc, position) => {
                if (position.character == this._rangeAtThisLineMaker.start.character
                    && position.line == this._rangeAtThisLineMaker.start.line) {
                    return {
                        range: this._rangeAtThisLineMaker,
                        contents: [
                            { language: editor.document.languageId, value: document.lineAt(this._firstLine).text.trim() }
                        ]
                    };
                }
            }
        });

        editor.setDecorations(this._indicatorStyle, activeIndentRanges);

        if(this._statusBarItem){
            this._statusBarItem.text = this._currentLocale['statusText']
                .replace('{indent}', selectedIndent);
            this._statusBarItem.tooltip = this._currentLocale['statusTooltip']
                .replace('{indent}', selectedIndent);
            this._statusBarItem.show();
        }
    }

    _clearDecorators() {
        if(!this._indicatorStyle) {
            return;
        }
        for(let i = 0; i < window.visibleTextEditors.length; i++) {
            window.visibleTextEditors[i].setDecorations(this._indicatorStyle,
                                                        []);
        }
    }

    _getTabSize(options: TextEditorOptions) {
        return options.insertSpaces?Number(options.tabSize):1;
    }

    _getIndentDepth(index: number, tabSize: number) {
        return Math.ceil(index / tabSize);
    }

    _getLinesIndentDepth(line: TextLine, tabSize: number) {
        return this._getIndentDepth(line.firstNonWhitespaceCharacterIndex,
                                    tabSize);
    }

    _createIndicatorRange(line: number, character: number) {
        return new Range(new Position(line, character),
                         new Position(line, character));
    }

    _getSelectedIndentDepth(document: TextDocument, selection: Selection,
                            tabSize: number) {
        if(selection.isSingleLine) {
            let line = document.lineAt(selection.start.line);
            return this._getIndentDepth(
                Math.min(selection.start.character,
                         line.firstNonWhitespaceCharacterIndex),
                tabSize);
        }
        let selectedIndent = Number.MAX_VALUE;
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

    _getActiveIndentRanges(document: TextDocument, selection: Selection,
                           selectedIndent: number, tabSize: number) {
        if(selectedIndent == 0) {
            return [];
        }
        let selectedIndentPos = (selectedIndent - 1) * tabSize;
        let activeRanges = [];
        this._firstLine = selection.start.line;
        // add ranges for selected block
        for(let i = selection.start.line; i <= selection.end.line; i++) {
            let line = document.lineAt(i);
            this._rangeAtThisLineMaker = this._createIndicatorRange(i, selectedIndentPos);
            activeRanges.push(this._rangeAtThisLineMaker);
        }
        // add ranges for preceeding lines on same indent
        for(let i = selection.start.line-1; i >= 0; i--) {
            let line = document.lineAt(i);
            let lineIndent = this._getLinesIndentDepth(line, tabSize);
            if(lineIndent >= selectedIndent || (line.isEmptyOrWhitespace && selectedIndent == 1)) {
                activeRanges.push(this._createIndicatorRange(i, selectedIndentPos));
            } else if(!line.isEmptyOrWhitespace) {
                this._firstLine = i;
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

    dispose() {
        if(this._statusBarItem){
            this._statusBarItem.dispose();
        }
        if (this._hoverProvider) {
            this._hoverProvider.dispose();
        }
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
        window.onDidChangeTextEditorSelection(
            this._onUpdateEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(
            this._onUpdateEvent, this, subscriptions);

        // subscribe to configuration change events
        workspace.onDidChangeConfiguration(
            this._onChangedConfigEvent, this, subscriptions);

        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    private _onUpdateEvent(e) {
        this._indentSpy.updateCurrentIndent();
    }

    private _onChangedConfigEvent(e) {
        this._indentSpy.updateConfig();
    }
}