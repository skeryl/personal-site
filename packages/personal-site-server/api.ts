import express, { Application } from "express";
import { postRoutes } from "./routes/posts";
import { ContentDatabase } from "./content/ContentDatabase";

export const api: Application = express();

const router = express.Router();
const contentDatabase = new ContentDatabase();

api.use("/posts", ...postRoutes(router, contentDatabase));
