import express, { Application } from "express";
import { postRoutes } from "./routes/posts";
import { ContentDatabase } from "./content/ContentDatabase";

export const api: Application = express();

const router = express.Router();

//todo fix this

api.use("/posts/art", ...postRoutes(router, new ContentDatabase("art")));

api.use(
  "/posts/explorations",
  ...postRoutes(router, new ContentDatabase("explorations")),
);
