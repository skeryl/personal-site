const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const nodeModules = path.resolve(__dirname, "../../node_modules");
module.exports = {
  mode: "development",
  entry: "./src/index.tsx",
  output: {
    filename: "[name].[contenthash].js",
    path: path.join(__dirname, "./public/scripts"),
    publicPath: "/scripts/",
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: "all",
    },
  },
  devtool: "source-map",
  resolve: {
    modules: [nodeModules],
    extensions: [".ts", ".tsx", ".js", ".json"],
    alias: {
      react: path.join(nodeModules, "./react"),
      "react-dom": path.join(nodeModules, "./react-dom"),
    },
  },
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      {
        test: /\.tsx?$/,
        use: "ts-loader",
      },

      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: path.join(__dirname, "./public/index.html"),
      inject: false,
      hash: true,
      templateContent: ({ htmlWebpackPlugin }) => `
        <html>
          <head>
              <meta content="no-cache, no-store, must-revalidate" http-equiv="Cache-Control"/>
              <meta content="no-cache" http-equiv="Pragma"/>
              <meta content="0" http-equiv="Expires"/>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>shane's computer</title>
              <link rel="stylesheet" type="text/css" href="/style/fonts.css" />
              <link rel="stylesheet" type="text/css" href="/style/index.css" />
                  ${htmlWebpackPlugin.tags.headTags}
          </head>
          <body>
            <div id="main"></div>
            ${htmlWebpackPlugin.tags.bodyTags}
          </body>
        </html>`,
    }),
  ],
  devServer: {
    publicPath: "/",
    contentBase: "./public",
    hot: true,
    port: 80,
  },
};
