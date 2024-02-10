import express, { Application } from "express";
import { postRoutes } from "./routes/posts";
import { ContentDatabase } from "./content/ContentDatabase";

export const api: Application = express();

const router = express.Router();

api.use("/posts", [
  ...postRoutes("art", router, new ContentDatabase("art")),
  ...postRoutes("explorations", router, new ContentDatabase("explorations")),
]);
