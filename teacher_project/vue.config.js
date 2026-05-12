// Vue.js configuration file for server-side rendering and API proxy
const path = require('path');

module.exports = {
  // 开发服务器配置
  devServer: {
    port: 3000,
    open: true,
    // 代理后端 API 请求到 Node.js 服务器
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: { '^/api': '/api' }
      }
    },
    hotOnly: false
  },

  // 生产环境配置
  productionSourceMap: false,

  // CSS loader 配置
  css: {
    extract: {
      ignoreOrder: true
    }
  },

  // 文件资源路径配置
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  }
};