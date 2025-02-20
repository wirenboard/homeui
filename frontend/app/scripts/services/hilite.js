function hiliteService($sce, $injector, $log) {
  'ngInject';
  // Based on AngularUI Bootstrap Typeahead
  // https://github.com/angular-ui/bootstrap/blob/master/src/typeahead/typeahead.js#L649
  // Unlike 'highlight' filter from ui-select, doesn't mangle text that looks like html

  function escapeHtml(s) {
    return $('<div>').text(s).html();
  }

  return (matchItem, query) => {
    // Replaces the capture string with a the same string inside of a "strong" tag
    if (matchItem === undefined) return '';
    if (query == '') return escapeHtml(matchItem);

    var lcItem = matchItem.toLowerCase(),
      lcQuery = query.toLowerCase(),
      start = 0,
      out = [];
    while (start < lcItem.length) {
      var p = lcItem.indexOf(lcQuery, start);
      if (p < 0) {
        out.push(escapeHtml(matchItem.substring(start)));
        break;
      }
      if (p > start) out.push(escapeHtml(matchItem.substring(start, p)));
      out.push('<strong>' + escapeHtml(matchItem.substr(p, lcQuery.length)) + '</strong>');
      start = p + lcQuery.length;
    }
    return out.join('');
  };
}

export default hiliteService;
