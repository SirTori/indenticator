'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, Disposable, ExtensionContext, StatusBarAlignment,
        StatusBarItem, TextDocument, TextEditor, TextEditorOptions,
        TextEditorDecorationType, TextLine, Selection, Range,
        Position, workspace, env, languages, WorkspaceConfiguration, Hover
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
        let v = this.langConfig[`indenticator.${name}`];
        if(v !== undefined) {
            return v;
        }
        return this.config.get(name, defaultValue);
    }
}

class IndentConfiguration {
    show: boolean;
    style: TextEditorDecorationType;
    hover: number;
    hoverConf: {
        peekBack: number,
        peekForward: number,
        trimLinesShorterThan: number,
        peekBlockPlaceholder: string
    };
    hoverProvider: Disposable
    firstLine: number;
    lastLine: number;
    indentPos: number;
}

export class IndentSpy {
    _locales: Object;
    _currentLocale: Object;
    _statusBarItem: StatusBarItem;
    _outerConf: IndentConfiguration = new IndentConfiguration();
    _innerConf: IndentConfiguration = new IndentConfiguration();

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
            let docLangKey = Object.keys(allLangConfig).find(k => {
                return k.match(`^\\[(.*,\\s*)?${docLang}(,.*)?\\]$`) !== null;
            });
            if(docLangKey) {
                langConfig = allLangConfig[docLangKey] || {};
            }
        }
        let myConf = new LanguageConfig(langConfig, config);

        if(myConf.get('showCurrentDepthInStatusBar')) {
            if(!this._statusBarItem) {
                this._statusBarItem = window.createStatusBarItem(
                    StatusBarAlignment.Right, 100);
            }
        } else if(this._statusBarItem) {
            this._statusBarItem.dispose();
            this._statusBarItem = undefined;
        }

        this._outerConf.show = myConf.get('showHighlight');
        this._innerConf.show = myConf.get('inner.showHighlight');

        this._outerConf.style = window.createTextEditorDecorationType({
            dark: {
                borderColor: myConf.get('color.dark', '#888'),
                borderStyle: myConf.get('style', 'inset'),
                borderWidth: myConf.get('width', 1) + "px"
            },
            light: {
                borderColor: myConf.get('color.light', '#999'),
                borderStyle: myConf.get('style', 'inset'),
                borderWidth: myConf.get('width', 1) + "px"
            }
        });

        this._innerConf.style = window.createTextEditorDecorationType({
            dark: {
                borderColor: myConf.get('inner.color.dark', '#888'),
                borderStyle: myConf.get('inner.style', 'inset'),
                borderWidth: myConf.get('inner.width', 1) + "px"
            },
            light: {
                borderColor: myConf.get('inner.color.light', '#999'),
                borderStyle: myConf.get('inner.style', 'inset'),
                borderWidth: myConf.get('inner.width', 1) + "px"
            }
        });

        let showHover:boolean|number = myConf.get('showHover', false);
        if(typeof showHover === 'boolean') {
            this._outerConf.hover = showHover ? 1 : 0;
        } else {
            this._outerConf.hover = showHover;
        }
        if(this._outerConf.hover) {
            this._outerConf.hoverConf = {
                peekBack: myConf.get('hover.peekBack', 1),
                peekForward: myConf.get('hover.peekForward', 0),
                trimLinesShorterThan: myConf.get(
                    'hover.trimLinesShorterThan', 2),
                peekBlockPlaceholder: myConf.get(
                    'hover.peekBlockPlaceholder', '...')
            };
        } else if (this._outerConf.hoverProvider) {
            this._outerConf.hoverProvider.dispose();
        }

        showHover = myConf.get('inner.showHover', false);
        if(typeof showHover === 'boolean') {
            this._innerConf.hover = showHover ? 1 : 0;
        } else {
            this._innerConf.hover = showHover;
        }
        if(this._innerConf.hover) {
            this._innerConf.hoverConf = {
                peekBack: myConf.get('inner.hover.peekBack', 1),
                peekForward: myConf.get('inner.hover.peekForward', 0),
                trimLinesShorterThan: myConf.get(
                    'inner.hover.trimLinesShorterThan', 2),
                peekBlockPlaceholder: myConf.get(
                    'inner.hover.peekBlockPlaceholder', '...')
            };
        } else if (this._innerConf.hoverProvider) {
            this._innerConf.hoverProvider.dispose();
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
        let selectedIndent = this._getSelectedIndentDepth(document, selection, tabSize);
        if(this._outerConf.show || this._outerConf.hover || this._innerConf.show || this._innerConf.hover) {
            let activeRanges = this._getActiveIndentRanges(document, selection, selectedIndent, tabSize);
            if(this._outerConf.show) {
                editor.setDecorations(this._outerConf.style, activeRanges.outer);
            }
            if(this._outerConf.hover && activeRanges.outer.length >= this._outerConf.hover) {
                this._buildHover(editor, tabSize, this._outerConf);
            } else if(this._outerConf.hoverProvider) {
                this._outerConf.hoverProvider.dispose();
            }
            if(this._innerConf.show) {
                editor.setDecorations(this._innerConf.style, activeRanges.inner);
            }
            if(this._innerConf.hover && activeRanges.inner.length >= this._innerConf.hover) {
                this._buildHover(editor, tabSize, this._innerConf);
            } else if(this._innerConf.hoverProvider) {
                this._innerConf.hoverProvider.dispose();
            }
        }

        if(this._statusBarItem){
            this._statusBarItem.text = this._currentLocale['statusText']
                .replace('{indent}', selectedIndent);
            this._statusBarItem.tooltip = this._currentLocale['statusTooltip']
                .replace('{indent}', selectedIndent);
            this._statusBarItem.show();
        }
    }

    _buildHover(editor: TextEditor, tabSize: number, conf: IndentConfiguration) {
        if (conf.hoverProvider) {
            conf.hoverProvider.dispose();
        }
        conf.hoverProvider = languages.registerHoverProvider(
            editor.document.languageId,
            {
                provideHover: (doc, position) => {
                    return this._buildHoverprovider(position, editor, tabSize, conf);
                }
            }
        );
    }

    _buildHoverprovider(position: Position, editor: TextEditor,
                        tabSize: number, conf: IndentConfiguration): Hover {
        let char = conf.indentPos
        if(position.character > char - 1
           && position.character < char + 1
           && position.line >= conf.firstLine
           && position.line <= conf.lastLine) {
            let str = this._buildHoverString(editor, tabSize, conf);
            if(str) {
                return {
                    range: new Range(conf.firstLine, conf.indentPos,
                                     conf.lastLine, conf.indentPos),
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

    _buildHoverString(editor: TextEditor, tabSize: number,
                      conf: IndentConfiguration): string {
        let hoverLines = [];
        let document = editor.document;
        let refDepth = this._getLinesIndentDepth(
            document.lineAt(conf.firstLine), tabSize);

        let backHoverLines = this._peekBack(editor.document, tabSize, refDepth, conf);
        let forwardHoverLines = this._peekForward(editor.document, tabSize, refDepth, conf);

        hoverLines.push(...backHoverLines);
        if(forwardHoverLines.length > 0 || backHoverLines.length > 0) {
            hoverLines.push(this._buildHoverPlaceholder(editor, tabSize, conf));
        }
        hoverLines.push(...forwardHoverLines);
        return hoverLines.join('\n');
    }

    _buildHoverPlaceholder(editor: TextEditor, tabSize: number,
                           conf: IndentConfiguration): string {
        let tabChar = editor.options.insertSpaces?' ':'\t';
        let spacing = tabChar.repeat(tabSize);
        return `${spacing}${conf.hoverConf.peekBlockPlaceholder}`;
    }

    _peekBack(document: TextDocument, tabSize: number,
              refDepth: number, conf: IndentConfiguration): Array<string> {
        let backHoverLines = [];
        if(conf.hoverConf.peekBack > 0) {
            let firstPeekLine = Math.max(
                conf.firstLine - (conf.hoverConf.peekBack - 1), 0);
            let pushedOnce = false;
            for(let i = firstPeekLine; i <= conf.firstLine; i++) {
                let line = document.lineAt(i)
                let lineStr = line.text.trim();
                if(!pushedOnce &&
                   lineStr.length < conf.hoverConf.trimLinesShorterThan) {
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
                 refDepth: number, conf: IndentConfiguration): Array<string> {
        let forwardHoverLines = [];
        if(conf.hoverConf.peekForward > 0) {
            let lastPeekLine = Math.min(
                conf.lastLine + (conf.hoverConf.peekForward - 1),
                document.lineCount - 1);
            let pushedOnce = false;
            for(let i = lastPeekLine; i >= conf.lastLine; i--) {
                let line = document.lineAt(i)
                let lineStr = line.text.trim();
                if(!pushedOnce &&
                   lineStr.length < conf.hoverConf.trimLinesShorterThan) {
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
        if(this._outerConf.style) {
            for(let i = 0; i < window.visibleTextEditors.length; i++) {
                window.visibleTextEditors[i].setDecorations(
                    this._outerConf.style, []);
            }

        }
        if(this._innerConf.style) {
        for(let i = 0; i < window.visibleTextEditors.length; i++) {
                window.visibleTextEditors[i].setDecorations(
                    this._innerConf.style, []);
            }

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
            let maxlineNum = document.lineCount - 1;
            let line = document.lineAt(Math.min(selection.start.line, maxlineNum));
            return this._getIndentDepth(
                Math.min(selection.start.character,
                         line.firstNonWhitespaceCharacterIndex),
                tabSize);
        }
        let selectedIndent = Number.MAX_VALUE;
        let maxlineNum = Math.min(selection.end.line,document.lineCount - 1);
        for(let i = selection.start.line; i <= maxlineNum; i++) {
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
                           selectedIndent: number, tabSize: number){
        let activeRanges = [];
        let activeInnerRanges = [];
        let line: TextLine;
        let innerDeactivated: boolean;

        this._outerConf.firstLine = selection.start.line;
        this._outerConf.lastLine = selection.end.line;
        this._outerConf.indentPos = (selectedIndent - 1) * tabSize;

        this._innerConf.firstLine = selection.start.line;
        this._innerConf.lastLine = selection.end.line;
        this._innerConf.indentPos = selectedIndent * tabSize;

        let addRanges = (i: number, line: TextLine) => {
            let lineAdded = false;
            let innerAdded = false;
            let lineIndent = this._getLinesIndentDepth(line, tabSize);
            if(!innerDeactivated && (
                    lineIndent > selectedIndent || (
                        line.isEmptyOrWhitespace && selectedIndent === lineIndent &&
                        (i !== selection.end.line || selection.end.character !== this._innerConf.indentPos)))) {
                activeInnerRanges.push(
                    this._createIndicatorRange(i, this._innerConf.indentPos));
                lineAdded = true;
                innerAdded = true;
        }
            if(this._outerConf.indentPos >= 0 && (
                    lineIndent >= selectedIndent || (
                        line.isEmptyOrWhitespace && selectedIndent === 1))) {
                activeRanges.push(this._createIndicatorRange(i, this._outerConf.indentPos));
                lineAdded = true;
        }
            return {
                'lineAdded': lineAdded,
                'innerAdded': innerAdded
            };
        };

        // add ranges for preceeding lines on same indent
        innerDeactivated = false;
        for(let i = selection.start.line; i >= 0; i--) {
            line = document.lineAt(i);
            let result = addRanges(i, line)
            if(!result.innerAdded && !line.isEmptyOrWhitespace && !innerDeactivated) {
                innerDeactivated = true;
                this._innerConf.firstLine = i;
            }
            if(!result.lineAdded && !line.isEmptyOrWhitespace) {
                this._outerConf.firstLine = i;
                break;
            }
        }
        // add ranges for following lines on same indent
        innerDeactivated = false;
        for(let i = selection.start.line + 1; i < document.lineCount; i++) {
            line = document.lineAt(i);
            let result = addRanges(i, line)
            if(!result.innerAdded && !line.isEmptyOrWhitespace && !innerDeactivated) {
                innerDeactivated = true;
                this._innerConf.lastLine = i;
            }
            if(!result.lineAdded && !line.isEmptyOrWhitespace) {
                this._outerConf.lastLine = i;
                break;
            }
        }
        return {
            outer: activeRanges,
            inner: activeInnerRanges
        };
    }

    dispose() {
        if(this._statusBarItem){
            this._statusBarItem.dispose();
        }
        if(this._outerConf.hoverProvider) {
            this._outerConf.hoverProvider.dispose();
        }
        if (this._innerConf.hoverProvider) {
            this._innerConf.hoverProvider.dispose();
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