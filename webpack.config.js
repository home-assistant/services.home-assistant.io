const path = require("path");
const mode = process.env.NODE_ENV || "production";

module.exports = {
  output: {
    filename: `worker.js`,
    path: path.join(__dirname, "worker"),
  },
  mode,
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    plugins: [],
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
};
