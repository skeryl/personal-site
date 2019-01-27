import * as express from 'express';
import * as fs from "fs";
import * as path from "path";
import {RequestHandler} from "express";

export const router = express.Router();

export const uiDir = path.join(__dirname, '../../personal-site-ui/');
export const publicDir = path.join(uiDir, 'public/');

function staticHandler(dir: string): RequestHandler {
  return async function(req, res){
    const data = await fs.readFileSync(path.join(dir, req.params['0']));
    res.send(data);
  }
}

router.get(/\/ui\/scripts\/(.+)/, staticHandler(path.join(uiDir, 'dist/')));
router.get(/\/ui\/deps\/(.+)/, staticHandler(path.join(uiDir, 'node_modules/')));
router.get(/\/ui\/(.+)/, staticHandler(publicDir));

router.get('/', function(req, res, next) {
  res.sendFile(path.join(publicDir, 'index.html'));
});
