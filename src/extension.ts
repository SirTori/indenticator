'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment,
        StatusBarItem, TextDocument, TextEditor, TextEditorOptions,
        TextEditorDecorationType, TextLine, Selection, Range,
        Position, workspace, env, languages, WorkspaceConfiguration
} from 'vscode';
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

class LanguageConfig {
    constructor(public langConfig: any,
                public config: WorkspaceConfiguration) {}

    get<T>(name: string, defaultValue?:T ): T {
        return this.langConfig[`indenticator.${name}`]
               || this.config.get(name, defaultValue);
    }
}

export class IndentSpy {
    _locales: Object;
    _currentLocale: Object;
    _statusBarItem: StatusBarItem;
    _indicatorStyle: TextEditorDecorationType;

    _firstLine: number;
    _lastLine: number;
    _hoverProvider: Disposable;
    _rangeAtThisLineMaker: Range;
    _showHover: number;
    _hoverConf: {
        peekBack: number,
        peekForward: number,
        trimLinesShorterThan: number,
        peekBlockPlaceholder: string
    };

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
        let langConfig = {};
        let config = workspace.getConfiguration('indenticator');
        if(window.activeTextEditor) {
            let docLang = window.activeTextEditor.document.languageId
            let allLangConfig = config.get("languageSpecific", {});
            let langConfig = allLangConfig[`[${docLang}]`] || {};
        }
        let myConf = new LanguageConfig(langConfig, config);

        this._indicatorStyle = window.createTextEditorDecorationType({
            dark: {
                borderColor: myConf.get('color.dark', '#888'),
                borderStyle: myConf.get('style', 'solid'),
                borderWidth: myConf.get('width', 1) + "px"
            },
            light: {
                borderColor: myConf.get('color.light', '#999'),
                borderStyle: myConf.get('style', 'solid'),
                borderWidth: myConf.get('width', 1) + "px"
            }
        });
        if(myConf.get('showCurrentDepthInStatusBar', true)) {
            if(!this._statusBarItem) {
                this._statusBarItem = window.createStatusBarItem(
                    StatusBarAlignment.Right, 100);
            }
        } else if(this._statusBarItem) {
            this._statusBarItem.dispose();
            this._statusBarItem = undefined;
        }
        let showHover = myConf.get('showHover', false);
        if(typeof showHover === 'boolean') {
            this._showHover = showHover ? 1 : 0;
        } else {
            this._showHover = showHover;
        }
        if(this._showHover) {
            this._hoverConf = {
                peekBack: myConf.get('hover.peekBack', 1),
                peekForward: myConf.get('hover.peekForward', 0),
                trimLinesShorterThan: myConf.get(
                    'hover.trimLinesShorterThan', 2),
                peekBlockPlaceholder: myConf.get(
                    'hover.peekBlockPlaceholder', '...')
            };
        } else if (this._hoverProvider) {
            this._hoverProvider.dispose();
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
        if(this._showHover && activeIndentRanges.length >= this._showHover) {
            this._buildHover(editor, tabSize);
        } else if(this._hoverProvider) {
            this._hoverProvider.dispose();
        }

        editor.setDecorations(this._indicatorStyle, activeIndentRanges);

        if(this._statusBarItem){
            this._statusBarItem.text = this._currentLocale['statusText']
                .replace('{indent}', selectedIndent);
            this._statusBarItem.tooltip = this._currentLocale['statusTooltip']
                .replace('{indent}', selectedIndent);
            this._statusBarItem.show();
        }
    }

    _buildHover(editor: TextEditor, tabSize: number) {
        if (this._hoverProvider) {
            this._hoverProvider.dispose();
        }
        this._hoverProvider = languages.registerHoverProvider(
            editor.document.languageId,
            {
                provideHover: (doc, position) => {
                    return this._buildHoverprovider(position, editor, tabSize);
                }
            }
        );
    }

    _buildHoverprovider(position: Position, editor: TextEditor,
                        tabSize: number) {
        let char = this._rangeAtThisLineMaker.start.character
        if(position.character > char -2
           && position.character < char +2
           && position.line > this._firstLine
           && position.line < this._lastLine) {
            let str = this._buildHoverString(editor, tabSize);
            if(str) {
                return {
                    range: this._rangeAtThisLineMaker,
                    contents: [
                        {
                            language: editor.document.languageId,
                            value: str
                        }
                    ]
                };
            }
            return null;
        }
    }

    _buildHoverString(editor: TextEditor, tabSize: number): string {
        let hoverLines = [];
        let document = editor.document;
        let refDepth = this._getLinesIndentDepth(
            document.lineAt(this._firstLine), tabSize);

        let backHoverLines = this._peekBack(editor.document, tabSize, refDepth);
        let forwardHoverLines = this._peekForward(editor.document, tabSize, refDepth);

        hoverLines.push(...backHoverLines);
        if(forwardHoverLines.length > 0 || backHoverLines.length > 0) {
            hoverLines.push(this._buildHoverPlaceholder(editor, tabSize));
        }
        hoverLines.push(...forwardHoverLines);
        return hoverLines.join('\n');
    }

    _buildHoverPlaceholder(editor: TextEditor, tabSize: number): string {
        let tabChar = editor.options.insertSpaces?' ':'\t';
        let spacing = tabChar.repeat(tabSize);
        return `${spacing}${this._hoverConf.peekBlockPlaceholder}`;
    }

    _peekBack(document: TextDocument, tabSize: number,
              refDepth: number): Array<string> {
        let backHoverLines = [];
        if(this._hoverConf.peekBack > 0) {
            let firstPeekLine = Math.max(
                this._firstLine - (this._hoverConf.peekBack - 1), 1);
            let pushedOnce = false;
            for(let i = firstPeekLine; i <= this._firstLine; i++) {
                let line = document.lineAt(i)
                let lineStr = line.text.trim();
                if(!pushedOnce &&
                   lineStr.length < this._hoverConf.trimLinesShorterThan) {
                    continue;
                }
                let lineDepth = this._getLinesIndentDepth(line, tabSize);
                if(lineDepth != refDepth) {
                    backHoverLines.splice(0);
                    continue;
                }
                backHoverLines.push(lineStr);
                pushedOnce = true;
            }
        }
        return backHoverLines;
    }

    _peekForward(document: TextDocument, tabSize: number,
                 refDepth: number): Array<string> {
        let forwardHoverLines = [];
        if(this._hoverConf.peekForward > 0) {
            let lastPeekLine = Math.min(
                this._lastLine + (this._hoverConf.peekForward - 1),
                document.lineCount);
            let pushedOnce = false;
            for(let i = lastPeekLine; i >= this._lastLine; i--) {
                let line = document.lineAt(i)
                let lineStr = line.text.trim();
                if(!pushedOnce &&
                   lineStr.length < this._hoverConf.trimLinesShorterThan) {
                    continue;
                }
                let lineDepth = this._getLinesIndentDepth(line, tabSize);
                if(lineDepth != refDepth) {
                    forwardHoverLines.splice(0);
                    continue;
                }
                forwardHoverLines.push(lineStr);
                pushedOnce = true;
            }
        }
        return forwardHoverLines.reverse();
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
        let firstLine = selection.start.line;
        this._lastLine = selection.start.line;
        // add ranges for selected block
        for(let i = selection.start.line; i <= selection.end.line; i++) {
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
                this._lastLine = i;
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
            this._onChangedEditor, this, subscriptions);

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

    private _onChangedEditor(e) {
        this._indentSpy.updateConfig();
        this._indentSpy.updateCurrentIndent();
    }

    private _onChangedConfigEvent(e) {
        this._indentSpy.updateConfig();
    }
}