
Welcome to Shane Carroll's personal [website](http://www.shanes.computer/)!

## concept
This is an experiment for what a developer-centric CMS would be for visual experiments and project write-ups.

All of the posts' [source code is here](https://github.com/skeryl/personal-site/tree/master/personal-site-content/src/content) within the [content module](https://github.com/skeryl/personal-site/tree/master/personal-site-content). 

The function of loading, cataloging and serving those posts is totally separate and happens automatically based on the post's metadata (see the [ContentDatabase](https://github.com/skeryl/personal-site/blob/master/personal-site-content/src/ContentDatabase.ts) class and the [server module](https://github.com/skeryl/personal-site/tree/master/personal-site-server)).

Finally, [the UI](https://github.com/skeryl/personal-site/tree/master/personal-site-ui) is a basic React app which uses the server to fetch posts and render content.

## modules
The site itself is split into sub-modules, described below, to make things more organized.

### personal-site-model
This is the data model for the website, shared across the UI and backend.

### personal-site-content
This is the "fun zone" where the post content lives.

### personal-site-server
This is an express app that serves the static content as well as the post api.

### personal-site-ui
The React app that actually renders content.

### personal-site-shapes
This contains share-able depenencies that need to be used across multiple content entries within [personal-site-content](https://github.com/skeryl/personal-site/tree/master/personal-site-content)

## deployment
CI/CD is configured to build/deploy the app on each push to master via AWS CodeBuild and CodeDeploy.
