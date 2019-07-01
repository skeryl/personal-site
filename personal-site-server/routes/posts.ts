import {Router} from "express";
import {ContentDatabase} from "personal-site-content";

export const postRoutes = (router: Router, contentDatabase: ContentDatabase) => ([

    router.get('/', ((req, res) => {
        const isLatest = ('latest' in req.query) && req.query.latest !== "false";
        if(isLatest){
            res.send(contentDatabase.latest());
        } else {
            res.send(contentDatabase.listSummaries());
        }
    })),

    router.get('/:id', (req, res) => {
        const post = contentDatabase.getPostJS(req.params.id);
        res.send(post);
    }),

]);
