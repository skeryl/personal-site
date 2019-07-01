import {compileDirectory as compile} from "./compilation";

jest.setTimeout(30000);

describe('compile', function () {
    test('can compile something', async (done) => {
        const result = await compile(__dirname + '/content/');
        console.log(result);
        expect(result['Antfarm.ts']).toBeDefined();
        done();
    });
});