import createError from 'http-errors';
import express, {Application, NextFunction, Request, Response} from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import * as path from "path";
import {api} from "./api";

export enum Env {
  dev = "dev",
  prod = "prod",
}

export interface AppParams {
  env: Env;
}

export type AppGenerator = (params: AppParams) => Application;

export const appGenerator: AppGenerator = (params) => {

  const uiDir = path.join(__dirname, '../personal-site-ui/');
  const publicDir = path.join(uiDir, 'public/');

  const app = express();

  app.set('view engine', 'ejs');

  app.use(logger(params.env));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use(express.static(publicDir));

  app.use('/api', api);

  app.get('*', (req, res, next) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    next(createError(404));
  });

  // error handler
  app.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = params.env === Env.dev ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  return app;
};
