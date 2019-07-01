import {compileTypescript as compile} from "./compilation";

describe('compile', function () {
    test('can compile something', async (done) => {
        const result = await compile('./src/experiments/Antfarm.ts');
        console.log(result);
        done();
        const antFarm = eval(result);
        antFarm
    });
});