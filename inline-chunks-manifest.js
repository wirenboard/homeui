function InlineChunksManifestPlugin(options) {
  this.name = options.name;
  this.filename = options.filename;
  this.manifestVariable = options.manifestVariable;
}

InlineChunksManifestPlugin.prototype.apply = function(compiler) {
  var me = this;

  compiler.plugin('compilation', function (compilation) {

    compilation.plugin('html-webpack-plugin-before-html-generation', function (htmlPluginData, callback) {
      var assets = htmlPluginData.assets;

      chunksManifest = [];
      chunksManifest.push('<script>');
      chunksManifest.push('window.' + me.manifestVariable + ' = ' + compilation.assets[me.filename].source());
      chunksManifest.push('</script>');

      assets[me.name] =  chunksManifest.join('');
      callback(null, htmlPluginData);
    });
  });
};

module.exports = InlineChunksManifestPlugin;
