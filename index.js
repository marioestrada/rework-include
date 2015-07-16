var defaultOptions = {};

const PLACEHOLDER_CHAR = '%';

var include = function (options) {
  return function include(style) {
    return new Include(style, options || defaultOptions);
  };
};

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function replaceRegExp(val) {
  var expression = escapeRegExp(val) + '($|\\s|\\>|\\+|~|\\:|\\[)';
  var expressionPrefix = '(^|\\s|\\>|\\+|~)';
  if (isPlaceholder(val)) {
    // We just want to match an empty group here to preserve the arguments we
    // may be expecting in a RegExp match.
    expressionPrefix = '()';
  }
  return new RegExp(expressionPrefix + expression, 'g');
}

function isPlaceholder(val) {
  return val[0] === PLACEHOLDER_CHAR;
}

function Include (style, options) {
  this.includePropertyRegEx = options.propertyRegExp || /^include?$/i;

  this.rules = style.rules;
  this.matches = {};

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];

    if (rule.rules) {
      // Media queries
      // this.inheritMedia(rule);
      // if (!rule.rules.length) {
      //   rules.splice(i--, 1);
      // }

    } else if (rule.selectors) {
      // Regular rules
      this.parseIncludes(rule);

      if (rule.declarations.length <= 0) {
        rules.splice(i--, 1);
      }
    }
  }

  this.removePlaceholders();
}

Include.prototype.parseIncludes = function (rule) {
  var selectors = rule.selectors;
  var declarations = rule.declarations;

  declarations.forEach(function (declaration, i) {
    if (declaration.type !== 'declaration') { return; }
    if (!this.includePropertyRegEx.test(declaration.property)) { return; }

    var includes = declaration.value.split(',').map(function (name) { return name.trim(); });

    includes.forEach(function (mixinName) {
      this.includeMixin(rule, mixinName, selectors);
    }, this);

    declarations.splice(i--, 1);
  }, this);
};

Include.prototype.includeMixin = function (currentRule, name, selectors) {
  var matchedRules = this.matches[name] || this.matchRules(name);

  if (!matchedRules.rules.length) {
    throw new Error('Failed to extend from ' + name + '.');
  }

  console.log('extend', selectors, 'with', name);

  this.inlineMixin(currentRule, matchedRules);
};

Include.prototype.inlineMixin = function (currentRule, rules) {
  rules.forEach(function (rule) {
    currentRule.declarations.concat(rule.declarations);
  }, this);
};

Include.prototype.matchRules = function (name) {
  var matchedRules = this.matches[name] = {
    rules: [],
    media: {}
  };

  this.rules.forEach(function (rule) {
    if (!rule.selectors) { return; }

    var matchedSelectors = rule.selectors.filter(function (selector) {
      return selector.match(replaceRegExp(name));
    });

    if (matchedSelectors.length <= 0) { return; }

    matchedRules.rules.push({
      declarations: rule.declarations,
      rule: rule
    });
  }, this);

  return matchedRules;
};

Include.prototype.removePlaceholders = function () {
  var rules = this.rules;

  for (var i = 0; i < rules.length; i++) {
    var selectors = rules[i].selectors;

    if (!selectors) {
      continue;
    }

    for (var j = 0; j < selectors.length; j++) {
      var selector = selectors[j];
      if (selector.indexOf(PLACEHOLDER_CHAR) > -1) {
        selectors.splice(j--, 1);
      }
    }

    if (!selectors.length) {
      rules.splice(i--, 1);
    }
  }
};