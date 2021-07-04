let path = require('path')
function resolve (dir) {
	return path.join(__dirname,'..','dir');
}
module.exports = {
	publicPath: './',
	runtimeCompiler: true,
	lintOnSave:false,
	devServer: {
		disableHostCheck: true,
	},
	pages: {
		index: {
			entry: 'examples/main.js',
			template: 'public/index.html',
			filename: 'index.html'
		}
	},
	chainWebpack: config => {
		config.module.rule('js').include.add(resolve('packages')).end()
		.use('babel').loader('babel-loader').tap(options => {
			return options
		})
	},
    productionSourceMap:false // 是否生成map文件
};