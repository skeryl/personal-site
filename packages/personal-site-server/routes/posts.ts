import { Router } from "express";
import { ContentDatabase } from "../content/ContentDatabase";

export const postRoutes = (
  prefix: string,
  router: Router,
  contentDatabase: ContentDatabase,
) => [
  router.get(`/${prefix}`, async (req, res) => {
    const isLatest = "latest" in req.query && req.query.latest !== "false";
    if (isLatest) {
      const latestPost = await contentDatabase.latest();
      res.send(latestPost);
    } else {
      const allSummaries = await contentDatabase.listSummaries();
      res.send(allSummaries);
    }
  }),

  router.get(`/${prefix}/:id`, async (req, res) => {
    const post = await contentDatabase.getSummary((req.params as any)["id"]);
    res.send(post);
  }),
];
