import * as vscode from 'vscode';

export class TextLine {
    public firstNonWhitespaceCharacterIndex: number;
    public isEmptyOrWhitespace: boolean;
    public lineNumber: number;
    public range: vscode.Range;
    public rangeIncludingLineBreak: vscode.Range;
    public text: string;
}

export class TextDocument {
    public fileName: string;
    public isDirty: boolean;
    public isUntitled: boolean;
    public lineCount: number;
    public uri: vscode.Uri;
    public version: number;

    public argReturnStub = (arg?: any) => {return arg;};

    public getTextStub = this.argReturnStub;
    public getText(range?: vscode.Range) : string {
        return this.getTextStub(range);
    }

    public getWordRangeAtPositionStub = this.argReturnStub;
    public getWordRangeAtPosition(position: vscode.Position) : vscode.Range {
        return this.getWordRangeAtPositionStub(position);
    }

    public lineAtStub = this.argReturnStub;
    public lineAt(line: number) : vscode.TextLine;
    public lineAt(line: vscode.TextLine) : vscode.TextLine;
    public lineAt(line: any) : vscode.TextLine {
        return this.lineAtStub(line);
    }

    public offsetAtStub = this.argReturnStub;
    public offsetAt(position: vscode.Position) : number {
        return this.offsetAtStub(position);
    }

    public positionAtStub = this.argReturnStub;
    public positionAt(offset: number) : vscode.Position{
        return this.positionAtStub(offset);
    }

    public saveStub = this.argReturnStub;
    public save() : Thenable<boolean> {
        return this.saveStub();
    }

    public validatePositionStub = this.argReturnStub;
    public validatePosition(position: vscode.Position) {
        return this.validatePositionStub(position);
    }

    public validateRangeStub = this.argReturnStub;
    public validateRange(range: vscode.Range) : vscode.Range {
        return this.validateRangeStub(range);
    }
}
