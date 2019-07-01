import AntFarm from './content/Antfarm';
import Chrysanthemum from './content/Chrysanthemum';
import CubPeg from './content/CubePegTorusHole';
import Follow from './content/Follow';
import Mirrors from './content/Mirrors';
import Orbit from './content/Orbit';
import PrimeColoring from './content/PrimeColoring';
import Squiggles from './content/Squiggles';
import {PostSummary} from "../../personal-site-model";

const summaries: {[key: string]: PostSummary} = {
    'Antfarm.ts': AntFarm.summary,
    'Chrysanthemum.ts': Chrysanthemum.summary,
    'CubePegTorusHole.ts': CubPeg.summary,
    'Follow.ts': Follow.summary,
    'Mirrors.ts': Mirrors.summary,
    'Orbit.ts': Orbit.summary,
    'PrimeColoring.ts': PrimeColoring.summary,
    'Squiggles.ts': Squiggles.summary,
};

export default summaries;