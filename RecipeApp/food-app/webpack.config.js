const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['react-native-web-webview']
    }
  }, argv);

  // Add the aliases
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native': 'react-native-web',
  };

  // Configure module rules
  config.module.rules.push({
    test: /\.(js|jsx|ts|tsx)$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env', '@babel/preset-react'],
        plugins: [
          ['module-resolver', {
            alias: {
              '^react-native$': 'react-native-web'
            }
          }]
        ]
      }
    }
  });

  // Handle HTML files except postMock.html
  config.module.rules.push({
    test: /\.html$/,
    exclude: /postMock\.html$/,
    use: {
      loader: 'html-loader',
      options: {
        sources: false
      }
    }
  });

  // Specifically handle postMock.html
  config.module.rules.push({
    test: /postMock\.html$/,
    use: 'null-loader'
  });

  return config;
}