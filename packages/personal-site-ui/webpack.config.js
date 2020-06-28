const path = require('path');

module.exports = {
    mode: 'development',
    entry: "./src/index.tsx",
    output: {
        filename: '[name].js',
        path: __dirname + '/public/scripts'
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    },
    devtool: "source-map",
    resolve: {
        modules: [path.resolve(__dirname, '../../node_modules')],
        extensions: [".ts", ".tsx", ".js", ".json"]
    },
    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
        ]
    },
};