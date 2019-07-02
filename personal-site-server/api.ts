import express, {Application} from "express";
import {postRoutes} from './routes/posts';
import {ContentDatabase} from "personal-site-content";

export const api: Application = express();

const router = express.Router();
const contentDatabase = new ContentDatabase();

if(new Set(process.argv).has('--watch')){
    console.info('watching content!');
    contentDatabase.watch();
} else {
    contentDatabase.load().then(() => {
        console.log('content database initialized!');
    });
}

api.use('/posts', ...postRoutes(router, contentDatabase));

