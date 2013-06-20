(function() {
  var Bindings, F, LVar, conjunction, disjunction, find, root, _;

  root = this;

  _ = root._ || require('underscore-contrib');

  F = {};

  F.succeed = function(result) {
    return [result];
  };

  F.fail = _.always([]);

  disjunction = function(l, r) {
    return function(x) {
      return _.cat(l(x), r(x));
    };
  };

  conjunction = function(l, r) {
    return function(x) {
      return _.mapcat(l(x), r);
    };
  };

  F.disj = function() {
    if (_.isEmpty(arguments)) {
      return F.fail;
    }
    return disjunction(_.first(arguments), F.disj.apply(this, _.rest(arguments)));
  };

  F.conj = function() {
    var clauses;
    clauses = _.toArray(arguments);
    if (_.isEmpty(clauses)) {
      return F.succeed;
    }
    if (_.size(clauses) === 1) {
      return _.first(clauses);
    }
    return conjunction(_.first(clauses), function(s) {
      return F.conj.apply(null, _.rest(clauses))(s);
    });
  };

  LVar = (function() {
    function LVar(name) {
      this.name = name;
    }

    return LVar;

  })();

  F.lvar = function(name) {
    return new LVar(name);
  };

  F.isLVar = function(v) {
    return v instanceof LVar;
  };

  Bindings = (function() {
    function Bindings(seed) {
      if (seed == null) {
        seed = {};
      }
      this.binds = _.merge({}, seed);
    }

    return Bindings;

  })();

  ({
    extend: function(lvar, value) {
      var o;
      o = {};
      o[lvar.name] = value;
      return new Bindings(_.merge(this.binds, o));
    },
    has: function(lvar) {
      return this.binds.hasOwnProperty(lvar.name);
    },
    lookup: function(lvar) {
      if (!F.isLVar(lvar)) {
        return lvar;
      }
      if (this.has(lvar)) {
        return this.lookup(this.binds[lvar.name]);
      }
      return lvar;
    }
  });

  F.ignorance = new Bindings();

  F.$x = F.lvar("x");

  F.$y = F.lvar("y");

  find = function(v, bindings) {
    var lvar;
    lvar = bindings.lookup(v);
    if (F.isLVar(v)) {
      return lvar;
    }
    if (_.isArray(lvar)) {
      if (_.isEmpty(lvar)) {
        return lvar;
      } else {
        return _.cons(find(_.first(lvar), bindings), find(_.rest(lvar), bindings));
      }
    }
    return lvar;
  };

  F.unify = function(l, r, bindings) {
    var t1, t2;
    t1 = bindings.lookup(l);
    t2 = bindings.lookup(r);
    if (_.isEqual(t1, t2)) {
      return bindings;
    }
    if (F.isLVar(t1)) {
      return bindings.extend(t1, t2);
    }
    if (F.isLVar(t2)) {
      return bindings.extend(t2, t1);
    }
    if (_.isArray(t1) && _.isArray(t2)) {
      bindings = F.unify(_.first(t1), _.first(t2), bindings);
      bindings = bindings !== null ? F.unify(_.rest(t1), _.rest(t2), bindings) : bindings;
      return bindings;
    }
    return null;
  };

  F.goal = function(l, r) {
    return function(bindings) {
      var result;
      result = F.unify(l, r, bindings);
      if (result !== null) {
        return F.succeed(result);
      }
      return F.fail(bindings);
    };
  };

  F.run = function(goal) {
    return goal(F.ignorance);
  };

  F.choice = function($v, list) {
    if (_.isEmpty(list)) {
      return F.fail;
    }
    F.disj(F.goal($v, _.first(list)), F.choice($v, _.rest(list)));
    return F.membero = F.choice;
  };

  F.commono = function(l, r) {
    var $x;
    $x = F.lvar("x");
    return F.conj(F.choice($x, l), F.choice($x, r));
  };

  F.conso = function($a, $b, list) {
    return F.goal(_.cons($a, $b), list);
  };

  F.joino = function($a, $b, list) {
    return F.goal([$a, $b], list);
  };

  if (typeof module !== "undefined" && module !== null) {
    module.exports = F;
  } else {
    root.F = F;
  }

}).call(this);
