import * as path from "path";
import { runTests } from 'vscode-test';

async function go() {
    try {

        const extensionDevelopmentPath = path.resolve(__dirname, '../../')
        const extensionTestsPath = path.resolve(__dirname, './suite')
        const testWorkspace = path.resolve(__dirname, '../../test-fixtures')
        runTests({
            extensionDevelopmentPath,
            extensionTestsPath: extensionTestsPath,
            launchArgs: [testWorkspace]
        });
    } catch (err) {
       console.error('Failed to run tests');
       process.exit(1);
    }
}

go();